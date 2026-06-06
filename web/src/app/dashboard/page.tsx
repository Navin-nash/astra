import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { getRepoData, generatePortfolio } from "./actions"
import { RepoSelector } from "@/components/dashboard/repo-selector"
import { UserMenu } from "@/components/dashboard/user-menu"
import { getMyPortfolio } from "@/lib/rust-api"
import type { TemplateId } from "@/types/portfolio"
import Link from "next/link"
import { AstraLogo } from "@/components/ui/astra-logo"

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")

  const [repoData, portfolio] = await Promise.all([
    getRepoData(),
    getMyPortfolio(),
  ])

  async function handleGenerate(repoIds: number[], template: TemplateId) {
    "use server"
    const { jobId } = await generatePortfolio(repoIds, template)
    redirect(`/dashboard/generate/${jobId}`)
  }

  const { ownRepos, orgRepos, contributions, accessType, githubUsername } = repoData
  const totalRepos = ownRepos.length + orgRepos.length

  return (
    <div className="min-h-dvh bg-background">
      {/* Top nav */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/">
            <AstraLogo variant="full" height={72} />
          </Link>
          <div className="flex items-center gap-4">
            {portfolio && (
              <Link
                href={`/${githubUsername}`}
                target="_blank"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                View portfolio ↗
              </Link>
            )}
            <UserMenu
              name={session.user.name ?? session.user.email}
              email={session.user.email}
              image={session.user.image}
            />
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10">
        {/* Portfolio status */}
        {portfolio && (
          <div className="mb-8 rounded-2xl border border-border bg-card p-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">
                Portfolio {portfolio.is_published ? "live" : "draft"}
              </p>
              <p className="text-xs mt-0.5 text-muted-foreground">
                Last synced{" "}
                {portfolio.last_synced_at
                  ? new Date(portfolio.last_synced_at).toLocaleDateString()
                  : "never"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div
                className={`w-2 h-2 rounded-full ${
                  portfolio.is_published ? "bg-green-500" : "bg-muted-foreground"
                }`}
              />
              <Link
                href={`/${githubUsername}`}
                target="_blank"
                className="rounded-full border border-border px-4 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
              >
                Preview
              </Link>
            </div>
          </div>
        )}

        {/* Heading */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-semibold text-foreground">
              {portfolio ? "Regenerate portfolio" : "Build your portfolio"}
            </h1>
            {accessType === "public" && (
              <span className="rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs px-2 py-0.5 font-medium border border-amber-500/20">
                Public only
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {accessType === "authenticated"
              ? "Pick repositories from your profile and organisations. Astra will analyse the code and write your portfolio."
              : "Showing public repositories. Sign in with GitHub to include private repos."}
          </p>
        </div>

        {totalRepos === 0 && contributions.length === 0 ? (
          <div className="rounded-2xl border border-border p-12 text-center">
            <p className="text-sm text-muted-foreground">
              No repositories found for @{githubUsername}. Push some code to GitHub first.
            </p>
          </div>
        ) : (
          <RepoSelector
            ownRepos={ownRepos}
            orgRepos={orgRepos}
            contributions={contributions}
            onGenerate={handleGenerate}
          />
        )}
      </main>
    </div>
  )
}
