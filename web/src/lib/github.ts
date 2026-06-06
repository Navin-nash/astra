import { eq, and } from "drizzle-orm"
import { db } from "./db"
import { baAccount } from "./schema"
import type { GithubRepo } from "@/types/portfolio"

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
