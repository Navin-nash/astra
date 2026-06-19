import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { getPublicPortfolio } from "@/lib/rust-api"
import { PortfolioTemplate } from "@/components/portfolio/template-selector"
import { siteConfig } from "@/lib/site"
import type { PortfolioData } from "@/types/portfolio"

interface Props {
  params: Promise<{ username: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  const portfolio = await getPublicPortfolio(username)

  if (!portfolio) {
    return {
      title: "Portfolio not found",
      robots: { index: false, follow: false },
    }
  }

  const repoCount = portfolio.repositories?.length ?? 0
  const title = `${username} — Developer Portfolio`
  const description = `${username}'s technical portfolio — ${repoCount} featured project${repoCount !== 1 ? "s" : ""}, built with Astra. See architecture decisions, tech stack, and engineering depth.`
  const canonicalUrl = `${siteConfig.url}/${username}`
  const ogImage = portfolio.avatar_url ?? siteConfig.ogImage

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      type: "profile",
      url: canonicalUrl,
      siteName: siteConfig.name,
      title,
      description,
      images: [
        {
          url: ogImage,
          width: 400,
          height: 400,
          alt: `${username}'s avatar`,
        },
      ],
    },
    twitter: {
      card: "summary",
      title,
      description,
      images: [ogImage],
    },
    robots: { index: true, follow: true },
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
      display_name: raw.theme_config?.display_name as string | undefined,
      contact_url: raw.theme_config?.contact_url as string | undefined,
    },
    last_synced_at: raw.last_synced_at ?? null,
    repositories: (raw.repositories ?? []) as PortfolioData["repositories"],
    github_profile: raw.github_profile ?? undefined,
  }

  return <PortfolioTemplate data={data} />
}

export const revalidate = 3600 // ISR: revalidate every hour
