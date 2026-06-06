import { eq, and } from "drizzle-orm"
import { db } from "./db"
import { baAccount, baUser } from "./schema"
import type { GithubRepo, GithubContribution, OrgRepo } from "@/types/portfolio"

const GITHUB_API = "https://api.github.com"

function ghHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "astra-web/0.1",
  }
}

async function getGithubToken(userId: string): Promise<string> {
  const account = await db.query.baAccount.findFirst({
    where: and(eq(baAccount.userId, userId), eq(baAccount.providerId, "github")),
    columns: { accessToken: true },
  })
  const token = account?.accessToken
  if (!token) throw new Error("GitHub account not linked or token missing")
  return token
}

interface GithubProfile {
  login: string
  avatar_url: string
}

/**
 * For GitHub OAuth users: fetches /user to get the GitHub login, then
 * persists it to user.github_username if not yet set. Returns the login.
 */
export async function resolveAndPersistGithubUsername(
  userId: string
): Promise<string | null> {
  const account = await db.query.baAccount.findFirst({
    where: and(eq(baAccount.userId, userId), eq(baAccount.providerId, "github")),
    columns: { accessToken: true },
  })
  if (!account?.accessToken) return null

  const profile = await ghFetch<GithubProfile>("/user", account.accessToken)
  if (!profile.login) return null

  const user = await db.query.baUser.findFirst({
    where: eq(baUser.id, userId),
    columns: { githubUsername: true } as never,
  })

  if (!(user as unknown as { githubUsername: string | null })?.githubUsername) {
    await db
      .update(baUser)
      .set({ githubUsername: profile.login } as never)
      .where(eq(baUser.id, userId))
  }

  return profile.login
}

async function ghFetch<T>(path: string, token: string, retries = 3): Promise<T> {
  let lastError: Error | undefined

  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(`${GITHUB_API}${path}`, {
      headers: ghHeaders(token),
      cache: "no-store",
    })

    if (res.status === 429 || (res.status >= 500 && res.status < 600)) {
      if (attempt < retries) {
        const retryAfterHeader = res.headers.get("retry-after")
        const delay = retryAfterHeader
          ? parseInt(retryAfterHeader) * 1000
          : Math.pow(2, attempt) * 1000
        await new Promise((r) => setTimeout(r, delay))
        continue
      }
    }

    if (!res.ok) throw new Error(`GitHub API ${path} → ${res.status}`)
    return res.json() as Promise<T>
  }

  throw lastError ?? new Error(`GitHub API ${path} failed after ${retries} retries`)
}

async function ghFetchRaw(url: string, token: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { ...ghHeaders(token), Accept: "application/vnd.github.raw+json" },
      cache: "no-store",
    })
    return res.ok ? res.text() : null
  } catch {
    return null
  }
}

export async function listUserRepos(userId: string): Promise<GithubRepo[]> {
  const token = await getGithubToken(userId)
  const all: GithubRepo[] = []
  let page = 1

  while (true) {
    const batch = await ghFetch<GithubRepo[]>(
      `/user/repos?per_page=100&sort=updated&type=all&page=${page}`,
      token
    )
    all.push(...batch)
    if (batch.length < 100) break
    page++
  }

  return all.filter((r) => !r.archived)
}

const DEP_FILES: Record<string, string> = {
  rust: "Cargo.toml",
  python: "requirements.txt",
  go: "go.mod",
}

const LANG_EXTENSIONS: Record<string, string[]> = {
  typescript: [".ts", ".tsx"],
  javascript: [".js", ".jsx", ".mjs", ".cjs"],
  python: [".py"],
  rust: [".rs"],
  go: [".go"],
  ruby: [".rb"],
  java: [".java"],
  kotlin: [".kt"],
  swift: [".swift"],
  "c++": [".cpp", ".cc", ".cxx", ".h"],
  "c#": [".cs"],
}

// Higher-priority entry point names get fetched first
const ENTRY_NAMES = ["index", "main", "app", "server", "mod", "lib", "__init__", "cli", "cmd", "run"]

interface ContentItem {
  name: string
  type: "file" | "dir"
  path: string
  size: number
}

/**
 * Fetches up to `maxFiles` source files from a repository using the GitHub Contents API.
 * Lists root + src/ directories, scores by entry-point name priority and file size,
 * then fetches content for the top candidates.
 */
async function fetchSourceFiles(
  fullName: string,
  lang: string,
  token: string,
  maxFiles = 3
): Promise<Array<{ path: string; content: string }>> {
  const exts = LANG_EXTENSIONS[lang.toLowerCase()] ?? []
  if (exts.length === 0) return []

  const [rootItems, srcItems] = await Promise.all([
    ghFetch<ContentItem[]>(`/repos/${fullName}/contents`, token).catch(() => [] as ContentItem[]),
    ghFetch<ContentItem[]>(`/repos/${fullName}/contents/src`, token).catch(
      () => [] as ContentItem[]
    ),
  ])

  const allItems: ContentItem[] = [
    ...rootItems,
    ...srcItems.map((i) => ({ ...i, path: `src/${i.name}` })),
  ]

  const scored = allItems
    .filter(
      (i) =>
        i.type === "file" &&
        exts.some((e) => i.name.toLowerCase().endsWith(e)) &&
        i.size < 60_000
    )
    .map((f) => {
      const baseName = f.name.replace(/\.[^.]+$/, "").toLowerCase()
      const entryRank = ENTRY_NAMES.indexOf(baseName)
      return {
        ...f,
        score:
          (entryRank !== -1 ? 1000 - entryRank * 50 : 0) +
          (f.path.startsWith("src/") ? 100 : 0) +
          Math.max(0, 100 - Math.floor(f.size / 500)),
      }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, maxFiles)

  const results = await Promise.all(
    scored.map(async (f) => {
      const content = await ghFetchRaw(
        `${GITHUB_API}/repos/${fullName}/contents/${f.path}`,
        token
      )
      return content ? { path: f.path, content } : null
    })
  )

  return results.filter((r): r is { path: string; content: string } => r !== null)
}

export async function fetchRepoContent(userId: string, repo: GithubRepo) {
  const token = await getGithubToken(userId)
  const lang = repo.language?.toLowerCase() ?? ""
  const isJsTs = lang === "typescript" || lang === "javascript"
  const depFilePath = isJsTs ? "package.json" : DEP_FILES[lang]

  const [readme, depFileContent, sourceFiles] = await Promise.all([
    ghFetchRaw(`${GITHUB_API}/repos/${repo.full_name}/readme`, token),
    depFilePath
      ? ghFetchRaw(`${GITHUB_API}/repos/${repo.full_name}/contents/${depFilePath}`, token)
      : Promise.resolve(null),
    fetchSourceFiles(repo.full_name, lang, token),
  ])

  return {
    readme,
    packageJson: isJsTs ? depFileContent : null,
    dependencyFile: !isJsTs ? depFileContent : null,
    sourceFiles,
  }
}

// ─── Public-mode fetch (no user OAuth token) ────────────────────────────────
// Uses a server-side PAT from GITHUB_PUBLIC_TOKEN env var for 5000 req/hr
// instead of 60/hr for fully unauthenticated requests.

function publicGhHeaders(): Record<string, string> {
  const hdrs: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "astra-web/0.1",
  }
  if (process.env.GITHUB_PUBLIC_TOKEN) {
    hdrs["Authorization"] = `Bearer ${process.env.GITHUB_PUBLIC_TOKEN}`
  }
  return hdrs
}

async function publicGhFetch<T>(path: string, retries = 3): Promise<T> {
  let lastError: Error | undefined
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(`${GITHUB_API}${path}`, {
      headers: publicGhHeaders(),
      cache: "no-store",
    })
    if (res.status === 429 || (res.status >= 500 && res.status < 600)) {
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000))
        continue
      }
    }
    if (!res.ok) throw new Error(`GitHub public API ${path} → ${res.status}`)
    return res.json() as Promise<T>
  }
  throw lastError ?? new Error(`GitHub public API ${path} failed`)
}

/** Fetches all non-archived, non-fork public repos for a GitHub username. */
export async function listPublicUserRepos(githubUsername: string): Promise<GithubRepo[]> {
  const all: GithubRepo[] = []
  let page = 1
  while (true) {
    const batch = await publicGhFetch<GithubRepo[]>(
      `/users/${githubUsername}/repos?per_page=100&sort=updated&type=public&page=${page}`
    )
    all.push(...batch)
    if (batch.length < 100) break
    page++
  }
  return all.filter((r) => !r.archived && !r.fork)
}

interface GithubOrg {
  login: string
}

async function listUserOrgsAuthenticated(token: string): Promise<GithubOrg[]> {
  return ghFetch<GithubOrg[]>("/user/orgs?per_page=100", token)
}

async function listUserOrgsPublic(githubUsername: string): Promise<GithubOrg[]> {
  return publicGhFetch<GithubOrg[]>(`/users/${githubUsername}/orgs?per_page=100`)
}

async function fetchOrgPublicRepos(orgLogin: string): Promise<GithubRepo[]> {
  const all: GithubRepo[] = []
  let page = 1
  while (true) {
    const batch = await publicGhFetch<GithubRepo[]>(
      `/orgs/${orgLogin}/repos?per_page=100&sort=updated&type=public&page=${page}`
    )
    all.push(...batch)
    if (batch.length < 100) break
    page++
  }
  return all.filter((r) => !r.archived)
}

/**
 * Returns public repos from all orgs the user belongs to.
 * Uses OAuth token if available for higher rate limits, otherwise public username.
 */
export async function listOrgRepos(
  userId: string,
  githubUsername: string
): Promise<OrgRepo[]> {
  let orgs: GithubOrg[]
  try {
    const token = await getGithubToken(userId).catch(() => null)
    orgs = token
      ? await listUserOrgsAuthenticated(token)
      : await listUserOrgsPublic(githubUsername)
  } catch {
    return []
  }
  if (orgs.length === 0) return []

  const orgRepoSets = await Promise.all(
    orgs.map(async (org) => {
      const repos = await fetchOrgPublicRepos(org.login).catch(
        () => [] as GithubRepo[]
      )
      return repos.map((r) => ({ ...r, org_name: org.login }))
    })
  )
  return orgRepoSets.flat()
}

interface SearchIssue {
  id: number
  title: string
  html_url: string
  pull_request?: { merged_at: string | null }
  repository_url: string
  labels: Array<{ name: string }>
}

interface SearchResult {
  items: SearchIssue[]
}

/**
 * Returns merged PRs authored by the user in repos they don't own.
 * Fetches up to 3 pages (90 results) from the GitHub search API.
 */
export async function listContributions(
  githubUsername: string,
  ownedRepoFullNames: Set<string>
): Promise<GithubContribution[]> {
  const query = `type:pr+author:${githubUsername}+is:merged`
  const results: GithubContribution[] = []

  for (let page = 1; page <= 3; page++) {
    const data = await publicGhFetch<SearchResult>(
      `/search/issues?q=${query}&sort=updated&per_page=30&page=${page}`
    ).catch(() => ({ items: [] as SearchIssue[] }))

    if (!data.items?.length) break

    for (const item of data.items) {
      if (!item.pull_request?.merged_at) continue
      const parts = item.repository_url.split("/repos/")
      const repoFullName = parts[1] ?? ""
      if (!repoFullName || ownedRepoFullNames.has(repoFullName)) continue

      results.push({
        id: item.id,
        title: item.title,
        html_url: item.html_url,
        repo_full_name: repoFullName,
        repo_html_url: `https://github.com/${repoFullName}`,
        merged_at: item.pull_request.merged_at,
        state: "merged",
        labels: item.labels.map((l) => l.name),
      })
    }
    if (data.items.length < 30) break
  }

  return results
}
