import { SignJWT } from "jose"
import { headers } from "next/headers"
import { auth } from "./auth"

const RUST_API_URL = process.env.RUST_API_URL ?? "http://localhost:8080"
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!)

export interface SourceFile {
  path: string
  content: string
}

export interface RepoInput {
  id: string
  name: string
  full_name: string
  description?: string
  html_url: string
  homepage?: string
  primary_language?: string
  topics: string[]
  stars_count: number
  forks_count: number
  readme?: string
  package_json?: string
  dependency_file?: string
  source_files: SourceFile[]
}

export interface GenerationJob {
  id: string
  status:
    | "pending"
    | "parsing_ast"
    | "generating_content"
    | "assembling_portfolio"
    | "completed"
    | "failed"
  progress: number
  error?: string
}

export interface PublicPortfolio {
  username: string
  avatar_url?: string
  mdx_content: string
  theme_config: Record<string, unknown>
  last_synced_at?: string
  repositories: unknown[]
}

async function rustJwt(userId: string, username: string): Promise<string> {
  return new SignJWT({ sub: userId, username })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("10m")
    .setIssuedAt()
    .sign(JWT_SECRET)
}

async function getSessionOrThrow() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error("Not authenticated")
  return session
}

export interface ContributionInput {
  title: string
  html_url: string
  repo_full_name: string
  repo_html_url: string
  merged_at: string
  labels: string[]
}

interface GenerateOptions {
  template?: string
  user_id: string
  username: string
  avatar_url?: string
  contributions?: ContributionInput[]
}

export async function startGeneration(
  repos: RepoInput[],
  opts?: GenerateOptions
): Promise<GenerationJob> {
  const session = await getSessionOrThrow()
  const { user } = session

  const userId = opts?.user_id ?? user.id
  const username = opts?.username ?? user.name ?? user.email ?? user.id
  const token = await rustJwt(userId, username)

  const res = await fetch(`${RUST_API_URL}/api/generate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user_id: userId,
      username,
      avatar_url: opts?.avatar_url ?? user.image,
      theme_config: opts?.template ? { template: opts.template } : { template: "void" },
      repos,
      contributions: opts?.contributions ?? [],
    }),
    cache: "no-store",
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "unknown" }))
    throw new Error(`Generation failed: ${err.error}`)
  }

  return res.json()
}

export async function getJobStatus(jobId: string): Promise<GenerationJob> {
  const session = await getSessionOrThrow()
  const { user } = session

  const token = await rustJwt(user.id, user.name ?? "")

  const res = await fetch(`${RUST_API_URL}/api/generate/${jobId}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  })

  if (!res.ok) throw new Error("Job not found")
  return res.json()
}

export async function getMyPortfolio() {
  const session = await getSessionOrThrow()
  const { user } = session

  const token = await rustJwt(user.id, user.name ?? "")

  const res = await fetch(`${RUST_API_URL}/api/portfolio`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  })

  if (!res.ok) {
    if (res.status === 404) return null
    throw new Error("Failed to fetch portfolio")
  }
  return res.json()
}

export async function publishPortfolio(): Promise<void> {
  const session = await getSessionOrThrow()
  const { user } = session

  const token = await rustJwt(user.id, user.name ?? "")

  const res = await fetch(`${RUST_API_URL}/api/portfolio/publish`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  })

  if (!res.ok) throw new Error("Failed to publish portfolio")
}

export async function getPublicPortfolio(
  username: string
): Promise<PublicPortfolio | null> {
  const res = await fetch(`${RUST_API_URL}/api/portfolio/${username}`, {
    next: { revalidate: 3600 },
  })

  if (res.status === 404) return null
  if (!res.ok) throw new Error("Failed to fetch portfolio")
  return res.json()
}
