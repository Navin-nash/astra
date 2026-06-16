import { eq, and } from "drizzle-orm"
import { db } from "./db"
import { baAccount, baUser } from "./schema"
import { selectFiles } from "./rust-api"
import type { GithubRepo, GithubContribution, OrgRepo, GithubProfile } from "@/types/portfolio"

const GITHUB_API = "https://api.github.com"
const GITHUB_GRAPHQL = "https://api.github.com/graphql"

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

interface GithubUserProfile {
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

  const profile = await ghFetch<GithubUserProfile>("/user", account.accessToken)
  if (!profile.login) return null

  const existing = await db.query.baUser.findFirst({
    where: eq(baUser.id, userId),
    columns: { githubUsername: true },
  })

  if (!existing?.githubUsername) {
    await db.update(baUser).set({ githubUsername: profile.login }).where(eq(baUser.id, userId))
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

interface GitTreeEntry {
  path: string
  type: string
  size?: number
}

interface GitTreeResponse {
  tree: GitTreeEntry[]
  truncated: boolean
}

/**
 * Fetches the complete recursive file tree for a repo via the GitHub Trees API.
 * Returns only blob entries (files, not directories).
 */
async function fetchFileTree(
  fullName: string,
  token: string
): Promise<Array<{ path: string; size: number }>> {
  const data = await ghFetch<GitTreeResponse>(
    `/repos/${fullName}/git/trees/HEAD?recursive=1`,
    token
  ).catch(() => ({ tree: [], truncated: false }))

  if (data.truncated) {
    // Very large repos: tree was cut off at ~100k entries. Still useful.
    // A future improvement could walk sub-trees manually.
  }

  return data.tree
    .filter((e) => e.type === "blob" && typeof e.size === "number")
    .map((e) => ({ path: e.path, size: e.size ?? 0 }))
}

// Local fallback scorer used when the Rust API is unavailable.
const LOCAL_ENTRY_NAMES = ["main", "lib", "index", "app", "server", "mod", "__init__", "cli", "cmd", "run"]

function localScoreFile(path: string, size: number, exts: string[]): number {
  const lower = path.toLowerCase()
  const fileName = lower.split("/").pop() ?? ""
  const depth = (path.match(/\//g) ?? []).length

  const skipDirs = ["node_modules", "dist", "build", "target", "vendor", "__pycache__", ".cache", "coverage"]
  if (skipDirs.some((d) => lower.includes(`/${d}/`) || lower.startsWith(`${d}/`))) return -1
  if (lower.includes(".test.") || lower.includes(".spec.") || lower.includes("_test.")) return -1
  if (!exts.some((e) => fileName.endsWith(e))) return -1
  if (size < 100 || size > 100_000) return -1

  const stem = fileName.replace(/\.[^.]+$/, "")
  const entryRank = LOCAL_ENTRY_NAMES.indexOf(stem)
  const entryBonus = entryRank !== -1 ? 1000 - entryRank * 80 : 0
  const srcBonus = lower.includes("src/") || lower.includes("lib/") ? 100 : 0
  const depthBonus = depth <= 2 ? 80 : depth <= 4 ? 40 : 0

  return 400 + entryBonus + srcBonus + depthBonus
}

/**
 * Selects the most relevant source files from a full repo file tree.
 * Sends the tree to the Rust /api/select-files scorer; falls back to a local
 * heuristic if the Rust call fails (e.g. API unavailable during cold start).
 */
async function fetchSourceFiles(
  fullName: string,
  lang: string,
  token: string,
  userId: string,
  username: string,
  maxFiles = 6
): Promise<Array<{ path: string; content: string }>> {
  const exts = LANG_EXTENSIONS[lang.toLowerCase()] ?? []

  // Fetch the full repo tree (paths + sizes only, no content)
  const tree = await fetchFileTree(fullName, token)
  if (tree.length === 0) return []

  // Pre-filter to reduce payload: skip obviously irrelevant large trees
  const preFiltered = tree
    .filter((e) => e.size > 100 && e.size < 150_000)
    .filter((e) => !e.path.startsWith(".") && !e.path.includes("node_modules"))
    .slice(0, 2_000)

  // Score via Rust heuristic; fall back to local scoring if unavailable
  const scored = await selectFiles(userId, username, lang || undefined, preFiltered, maxFiles)

  let selectedPaths: string[]
  if (scored.length > 0) {
    selectedPaths = scored.map((s) => s.path)
  } else {
    // Local fallback
    selectedPaths = preFiltered
      .map((e) => ({ ...e, score: localScoreFile(e.path, e.size, exts) }))
      .filter((e) => e.score >= 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxFiles)
      .map((e) => e.path)
  }

  // Fetch content for the selected files in parallel
  const results = await Promise.all(
    selectedPaths.map(async (path) => {
      const content = await ghFetchRaw(`${GITHUB_API}/repos/${fullName}/contents/${path}`, token)
      return content ? { path, content } : null
    })
  )

  return results.filter((r): r is { path: string; content: string } => r !== null)
}

export async function fetchRepoContent(userId: string, username: string, repo: GithubRepo) {
  const token = await getGithubToken(userId)
  const lang = repo.language?.toLowerCase() ?? ""
  const isJsTs = lang === "typescript" || lang === "javascript"
  const depFilePath = isJsTs ? "package.json" : DEP_FILES[lang]

  const [readme, depFileContent, sourceFiles] = await Promise.all([
    ghFetchRaw(`${GITHUB_API}/repos/${repo.full_name}/readme`, token),
    depFilePath
      ? ghFetchRaw(`${GITHUB_API}/repos/${repo.full_name}/contents/${depFilePath}`, token)
      : Promise.resolve(null),
    fetchSourceFiles(repo.full_name, lang, token, userId, username),
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

// ─── GitHub Profile + Contribution Calendar ────────────────────────────────
// Uses the GitHub GraphQL API (REST has no contribution calendar endpoint).

const CONTRIBUTION_QUERY = `
  query FetchProfile($login: String!) {
    user(login: $login) {
      followers { totalCount }
      following { totalCount }
      contributionsCollection {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              date
              contributionCount
              contributionLevel
            }
          }
        }
      }
    }
  }
`

const CONTRIBUTION_LEVEL: Record<string, 0 | 1 | 2 | 3 | 4> = {
  NONE: 0,
  FIRST_QUARTILE: 1,
  SECOND_QUARTILE: 2,
  THIRD_QUARTILE: 3,
  FOURTH_QUARTILE: 4,
}

interface GraphQLDay {
  date: string
  contributionCount: number
  contributionLevel: string
}

interface GraphQLWeek {
  contributionDays: GraphQLDay[]
}

interface GraphQLCalendar {
  totalContributions: number
  weeks: GraphQLWeek[]
}

interface GraphQLUser {
  followers: { totalCount: number }
  following: { totalCount: number }
  contributionsCollection: { contributionCalendar: GraphQLCalendar }
}

/**
 * Fetches byte counts per language for a list of repos and aggregates them.
 * Uses a token when available for higher rate limits.
 */
export async function fetchLanguageBytes(
  repoFullNames: string[],
  token?: string
): Promise<Record<string, number>> {
  const tok = token ?? process.env.GITHUB_PUBLIC_TOKEN
  if (!tok || repoFullNames.length === 0) return {}

  const aggregated: Record<string, number> = {}

  await Promise.all(
    repoFullNames.map(async (fullName) => {
      try {
        const data = await ghFetch<Record<string, number>>(
          `/repos/${fullName}/languages`,
          tok
        )
        for (const [lang, bytes] of Object.entries(data)) {
          aggregated[lang] = (aggregated[lang] ?? 0) + bytes
        }
      } catch {
        // Non-fatal: missing language data for one repo is acceptable
      }
    })
  )

  return aggregated
}

/**
 * Fetches a GitHub user's contribution calendar and profile stats via GraphQL.
 * Uses the user's OAuth token if provided, otherwise falls back to the server PAT.
 * Returns null if neither token is available or the request fails.
 */
export async function fetchGithubProfile(
  login: string,
  oauthToken?: string
): Promise<GithubProfile | null> {
  const token = oauthToken ?? process.env.GITHUB_PUBLIC_TOKEN
  if (!token) return null

  try {
    const res = await fetch(GITHUB_GRAPHQL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "astra-web/0.1",
      },
      body: JSON.stringify({ query: CONTRIBUTION_QUERY, variables: { login } }),
      cache: "no-store",
    })

    if (!res.ok) return null

    const body = await res.json() as { data?: { user?: GraphQLUser } }
    const user = body.data?.user
    if (!user) return null

    const calendar = user.contributionsCollection.contributionCalendar

    return {
      followers: user.followers.totalCount,
      following: user.following.totalCount,
      total_contributions: calendar.totalContributions,
      contribution_weeks: calendar.weeks.map((w) => ({
        days: w.contributionDays.map((d) => ({
          date: d.date,
          count: d.contributionCount,
          level: CONTRIBUTION_LEVEL[d.contributionLevel] ?? 0,
        })),
      })),
    }
  } catch {
    return null
  }
}
