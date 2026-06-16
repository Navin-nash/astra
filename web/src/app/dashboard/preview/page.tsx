import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { getMyPortfolioPreview } from "@/lib/rust-api"
import { PreviewClient } from "./preview-client"
import type { PortfolioData } from "@/types/portfolio"

export const dynamic = "force-dynamic"

export default async function PreviewPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")

  const raw = await getMyPortfolioPreview()
  if (!raw) redirect("/dashboard")

  const data: PortfolioData = {
    username: raw.username ?? session.user.name ?? "",
    avatar_url: raw.avatar_url ?? null,
    mdx_content: raw.mdx_content ?? "",
    theme_config: {
      template:
        (raw.theme_config?.template as PortfolioData["theme_config"]["template"]) ?? "void",
      accent: raw.theme_config?.accent as string | undefined,
    },
    last_synced_at: raw.last_synced_at ?? null,
    repositories: (raw.repositories ?? []) as PortfolioData["repositories"],
    github_profile: raw.github_profile,
  }

  return <PreviewClient initialData={data} isPublished={raw.is_published ?? false} />
}
