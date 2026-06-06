"use server"

import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { baAccount, baUser } from "@/lib/schema"
import { and, eq } from "drizzle-orm"
import {
  fetchRepoContent,
  listUserRepos,
  listPublicUserRepos,
  listOrgRepos,
  listContributions,
  resolveAndPersistGithubUsername,
} from "@/lib/github"
import { startGeneration } from "@/lib/rust-api"
import type { GithubRepo, GithubContribution, OrgRepo, TemplateId } from "@/types/portfolio"
import type { RepoInput } from "@/lib/rust-api"

// ─── Access mode resolution ────────────────────────────────────────────────

interface AuthenticatedMode {
  type: "authenticated"
  githubUsername: string
}
interface PublicMode {
  type: "public"
  githubUsername: string
}
type AccessMode = AuthenticatedMode | PublicMode

/**
 * Determines how to access GitHub data for the current user.
 * Returns null when the user needs to complete onboarding (no github_username set yet).
 */
async function resolveAccessMode(userId: string): Promise<AccessMode | null> {
  const githubAccount = await db.query.baAccount.findFirst({
    where: and(eq(baAccount.userId, userId), eq(baAccount.providerId, "github")),
    columns: { accessToken: true },
  })

  if (githubAccount?.accessToken) {
    const username = await resolveAndPersistGithubUsername(userId)
    if (!username) return null
    return { type: "authenticated", githubUsername: username }
  }

  // Google user — needs github_username from onboarding
  const user = await db.query.baUser.findFirst({
    where: eq(baUser.id, userId),
    columns: { githubUsername: true } as never,
  })
  const githubUsername = (user as unknown as { githubUsername: string | null })?.githubUsername
  if (!githubUsername) return null

  return { type: "public", githubUsername }
}

// ─── Public data fetching ──────────────────────────────────────────────────

export interface RepoData {
  ownRepos: GithubRepo[]
  orgRepos: OrgRepo[]
  contributions: GithubContribution[]
  accessType: "authenticated" | "public"
  githubUsername: string
}

export async function getRepoData(): Promise<RepoData> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")

  const mode = await resolveAccessMode(session.user.id)
  if (!mode) redirect("/onboarding")

  const ownRepos =
    mode.type === "authenticated"
      ? await listUserRepos(session.user.id)
      : await listPublicUserRepos(mode.githubUsername)

  const ownedFullNames = new Set(ownRepos.map((r) => r.full_name))

  const [orgRepos, contributions] = await Promise.all([
    listOrgRepos(session.user.id, mode.githubUsername),
    listContributions(mode.githubUsername, ownedFullNames),
  ])

  return {
    ownRepos,
    orgRepos,
    contributions,
    accessType: mode.type,
    githubUsername: mode.githubUsername,
  }
}

// ─── Portfolio generation ──────────────────────────────────────────────────

export async function generatePortfolio(
  repoIds: number[],
  template: TemplateId
): Promise<{ jobId: string }> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")

  const { user } = session
  const mode = await resolveAccessMode(user.id)
  if (!mode) redirect("/onboarding")

  const ownRepos =
    mode.type === "authenticated"
      ? await listUserRepos(user.id)
      : await listPublicUserRepos(mode.githubUsername)

  const selected = ownRepos.filter((r) => repoIds.includes(r.id))
  if (selected.length === 0) throw new Error("No matching repositories found")

  const reposWithContent = await Promise.all(
    selected.map(async (repo): Promise<RepoInput> => {
      const content = await fetchRepoContent(user.id, repo).catch(() => ({
        readme: null,
        packageJson: null,
        dependencyFile: null,
        sourceFiles: [],
      }))
      return {
        id: String(repo.id),
        name: repo.name,
        full_name: repo.full_name,
        description: repo.description ?? undefined,
        html_url: repo.html_url,
        homepage: repo.homepage ?? undefined,
        primary_language: repo.language ?? undefined,
        topics: repo.topics,
        stars_count: repo.stargazers_count,
        forks_count: repo.forks_count,
        readme: content.readme ?? undefined,
        package_json: content.packageJson ?? undefined,
        dependency_file: content.dependencyFile ?? undefined,
        source_files: content.sourceFiles,
      }
    })
  )

  const ownedFullNames = new Set(selected.map((r) => r.full_name))
  const contributions = await listContributions(mode.githubUsername, ownedFullNames)
  const contributionInputs = contributions.map((c) => ({
    title: c.title,
    html_url: c.html_url,
    repo_full_name: c.repo_full_name,
    repo_html_url: c.repo_html_url,
    merged_at: c.merged_at,
    labels: c.labels,
  }))

  const job = await startGeneration(reposWithContent, {
    template,
    user_id: user.id,
    username: mode.githubUsername,
    avatar_url: user.image ?? undefined,
    contributions: contributionInputs,
  })

  return { jobId: job.id }
}
