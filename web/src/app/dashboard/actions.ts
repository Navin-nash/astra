"use server"

import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { fetchRepoContent, listUserRepos } from "@/lib/github"
import { startGeneration } from "@/lib/rust-api"
import type { GithubRepo, TemplateId } from "@/types/portfolio"
import type { RepoInput } from "@/lib/rust-api"

export async function getRepos(): Promise<GithubRepo[]> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")
  return listUserRepos(session.user.id)
}

export async function generatePortfolio(
  repoIds: number[],
  template: TemplateId
): Promise<{ jobId: string }> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")

  const { user } = session

  // Fetch all repos, filter to selected
  const allRepos = await listUserRepos(user.id)
  const selected = allRepos.filter((r) => repoIds.includes(r.id))

  if (selected.length === 0) {
    throw new Error("No matching repositories found")
  }

  // Fetch README + source content for each selected repo in parallel
  const reposWithContent = await Promise.all(
    selected.map(async (repo): Promise<RepoInput> => {
      const content = await fetchRepoContent(user.id, repo)
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

  // Merge template into theme_config by injecting it into the generate request
  // The Rust API stores whatever we put in theme_config
  const job = await startGeneration(reposWithContent, {
    template,
    user_id: user.id,
    username: user.name ?? user.email ?? user.id,
    avatar_url: user.image ?? undefined,
  })

  return { jobId: job.id }
}
