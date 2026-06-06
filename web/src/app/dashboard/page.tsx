import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { getRepos, generatePortfolio } from "./actions"
import { RepoSelector } from "@/components/dashboard/repo-selector"
import { UserMenu } from "@/components/dashboard/user-menu"
import { getMyPortfolio } from "@/lib/rust-api"
import type { TemplateId } from "@/types/portfolio"
import Link from "next/link"
import { AstraLogo } from "@/components/ui/astra-logo"

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")

  const [repos, portfolio] = await Promise.all([
    getRepos(),
    getMyPortfolio(),
  ])

  async function handleGenerate(repoIds: number[], template: TemplateId) {
    "use server"
    const { jobId } = await generatePortfolio(repoIds, template)
    redirect(`/dashboard/generate/${jobId}`)
  }

  const username = session.user.name ?? session.user.id

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
                href={`/${username}`}
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
                href={`/${username}`}
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
          <h1 className="text-xl font-semibold text-foreground">
            {portfolio ? "Regenerate portfolio" : "Build your portfolio"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick the repositories that best represent your work. Astra will
            analyse the code and write your portfolio.
          </p>
        </div>

        {repos.length === 0 ? (
          <div className="rounded-2xl border border-border p-12 text-center">
            <p className="text-sm text-muted-foreground">
              No public repositories found. Push some code to GitHub first.
            </p>
          </div>
        ) : (
          <RepoSelector repos={repos} onGenerate={handleGenerate} />
        )}
      </main>
    </div>
  )
}
