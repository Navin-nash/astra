import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { getPublicPortfolio } from "@/lib/rust-api"
import { PortfolioTemplate } from "@/components/portfolio/template-selector"
import type { PortfolioData } from "@/types/portfolio"

interface Props {
  params: Promise<{ username: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  const portfolio = await getPublicPortfolio(username)

  if (!portfolio) {
    return { title: "Portfolio not found" }
  }

  return {
    title: `${username} — Portfolio`,
    description: `${username}'s technical portfolio built with Astra`,
    openGraph: {
      title: `${username} — Portfolio`,
      description: `${username}'s technical portfolio — ${portfolio.repositories?.length ?? 0} featured projects`,
      images: portfolio.avatar_url ? [portfolio.avatar_url] : [],
      type: "profile",
    },
    twitter: {
      card: "summary",
      title: `${username} — Portfolio`,
      images: portfolio.avatar_url ? [portfolio.avatar_url] : [],
    },
  }
}

export default async function PortfolioPage({ params }: Props) {
  const { username } = await params
  const raw = await getPublicPortfolio(username)

  if (!raw) notFound()

  const data: PortfolioData = {
    username: raw.username ?? username,
    avatar_url: raw.avatar_url ?? null,
    mdx_content: raw.mdx_content ?? "",
    theme_config: {
      template: (raw.theme_config?.template as PortfolioData["theme_config"]["template"]) ?? "void",
      accent: raw.theme_config?.accent as string | undefined,
    },
    last_synced_at: raw.last_synced_at ?? null,
    repositories: (raw.repositories ?? []) as PortfolioData["repositories"],
  }

  return <PortfolioTemplate data={data} />
}

export const revalidate = 3600 // ISR: revalidate every hour
