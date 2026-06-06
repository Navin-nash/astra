import Image from "next/image"
import Link from "next/link"
import { MdxRenderer } from "../mdx-renderer"
import type { PortfolioData, PortfolioRepo } from "@/types/portfolio"

export function VoidTemplate({ data }: { data: PortfolioData }) {
  const [featured, ...rest] = data.repositories

  const totalStars = data.repositories.reduce((s, r) => s + r.stars_count, 0)
  const totalForks = data.repositories.reduce((s, r) => s + r.forks_count, 0)
  const languages = [...new Set(data.repositories.map((r) => r.primary_language).filter(Boolean))]

  return (
    <div className="min-h-[100dvh] bg-[var(--void)] text-foreground font-sans">
      {/* Nav */}
      <nav className="fixed top-4 left-1/2 z-50 -translate-x-1/2">
        <div className="flex items-center gap-6 rounded-full border border-[var(--void-border)] bg-[var(--void-elevated)]/80 backdrop-blur-md px-6 py-3 text-sm shadow-sm">
          <span className="font-semibold text-brand">{data.username}</span>
          <span className="text-muted-foreground/40">·</span>
          <a href="#projects" className="text-muted-foreground hover:text-foreground transition-colors">Projects</a>
          <a href="#about" className="text-muted-foreground hover:text-foreground transition-colors">About</a>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex min-h-[100dvh] flex-col items-start justify-center px-6 pt-24 pb-16 mx-auto max-w-7xl lg:px-8">
        <div className="grid lg:grid-cols-[1fr_auto] gap-16 items-center w-full">
          <div className="space-y-6 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/5 px-3 py-1 text-xs font-medium uppercase tracking-widest text-brand">
              Portfolio
            </div>

            {data.avatar_url && (
              <div className="flex items-center gap-4 lg:hidden">
                <Image src={data.avatar_url} alt={data.username} width={56} height={56} className="rounded-full border-2 border-brand/30" />
              </div>
            )}

            <h1 className="text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl" style={{ lineHeight: 1.0, letterSpacing: "-0.04em" }}>
              {data.username}
            </h1>

            <div className="text-base leading-relaxed max-w-lg text-muted-foreground">
              <MdxRenderer content={extractBio(data.mdx_content)} />
            </div>

            {/* Quick stats */}
            <div className="flex flex-wrap gap-4 pt-1">
              {[
                { label: "repositories", value: data.repositories.length },
                { label: "stars", value: totalStars.toLocaleString() },
                { label: "forks", value: totalForks.toLocaleString() },
              ].map(({ label, value }) => (
                <div key={label} className="text-center">
                  <div className="text-lg font-bold text-foreground">{value}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
                </div>
              ))}
            </div>

            {/* Language tags */}
            {languages.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {languages.map((lang) => (
                  <span key={lang} className="rounded-full border border-[var(--void-border)] bg-[var(--void-elevated)] px-3 py-1 text-xs text-muted-foreground">
                    {lang}
                  </span>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-3 pt-2">
              <Link href="#projects" className="rounded-full bg-brand text-primary-foreground px-6 py-2.5 text-sm font-semibold transition-transform hover:scale-[1.02] active:scale-[0.98]">
                View Projects
              </Link>
              <a href={`https://github.com/${data.username}`} target="_blank" rel="noopener noreferrer" className="rounded-full border border-[var(--void-border)] text-muted-foreground px-6 py-2.5 text-sm transition-colors hover:border-brand/50 hover:text-foreground">
                GitHub
              </a>
            </div>
          </div>

          {data.avatar_url && (
            <div className="hidden lg:block">
              <Image src={data.avatar_url} alt={data.username} width={200} height={200} className="rounded-3xl border border-[var(--void-border)] shadow-[0_24px_80px_rgba(0,0,0,0.25)]" />
            </div>
          )}
        </div>
      </section>

      {/* Projects */}
      <section id="projects" className="py-24 px-6 mx-auto max-w-7xl lg:px-8">
        <div className="mb-12">
          <p className="text-xs font-medium uppercase tracking-widest mb-3 text-brand">Selected work</p>
          <h2 className="text-3xl font-bold tracking-tight" style={{ letterSpacing: "-0.03em" }}>Featured Projects</h2>
        </div>

        {/* Featured card */}
        {featured && <VoidFeaturedCard repo={featured} />}

        {/* Grid */}
        {rest.length > 0 && (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
            {rest.map((repo) => (
              <VoidRepoCard key={repo.id} repo={repo} />
            ))}
          </div>
        )}
      </section>

      {/* About */}
      <section id="about" className="py-24 px-6 mx-auto max-w-7xl lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-widest mb-3 text-brand">About</p>
          <div className="prose prose-neutral dark:prose-invert max-w-none">
            <MdxRenderer content={extractAbout(data.mdx_content)} />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--void-border)] py-8 px-6 mx-auto max-w-7xl lg:px-8 flex items-center justify-between text-sm text-muted-foreground">
        <span>Built with <span className="text-brand">Astra</span></span>
        <span>
          Last updated{" "}
          {data.last_synced_at
            ? new Date(data.last_synced_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })
            : "recently"}
        </span>
      </footer>
    </div>
  )
}

function VoidFeaturedCard({ repo }: { repo: PortfolioRepo }) {
  const complexity = repo.ast_metadata?.complexity_score ?? 0
  const age = Math.round((Date.now() - new Date(repo.created_at).getTime()) / (1000 * 60 * 60 * 24 * 365 * 10) * 10) / 10

  return (
    <div className="rounded-2xl border border-[var(--void-border)] bg-[var(--void-elevated)] overflow-hidden">
      <div className="grid lg:grid-cols-[1fr_280px]">
        {/* Main content */}
        <div className="p-8 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="text-xs font-medium uppercase tracking-widest text-brand">Featured</span>
                {repo.primary_language && (
                  <span className="rounded-full border border-brand/20 bg-brand/5 text-brand px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide">
                    {repo.primary_language}
                  </span>
                )}
              </div>
              <h3 className="text-2xl font-bold tracking-tight text-foreground">{repo.name}</h3>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {repo.homepage && (
                <a href={repo.homepage} target="_blank" rel="noopener noreferrer"
                  className="rounded-full border border-brand/30 bg-brand/5 text-brand px-4 py-1.5 text-xs font-medium transition-colors hover:bg-brand/10">
                  Live demo ↗
                </a>
              )}
              <a href={repo.html_url ?? "#"} target="_blank" rel="noopener noreferrer"
                className="rounded-full border border-[var(--void-border)] text-muted-foreground px-4 py-1.5 text-xs transition-colors hover:text-foreground">
                GitHub ↗
              </a>
            </div>
          </div>

          {repo.description && (
            <p className="text-muted-foreground leading-relaxed">{repo.description}</p>
          )}

          {repo.ai_summary && (
            <p className="text-sm text-muted-foreground/80 leading-relaxed">
              {repo.ai_summary}
            </p>
          )}

          {/* Topics */}
          {repo.topics.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {repo.topics.map((t) => (
                <span key={t} className="rounded-full border border-[var(--void-border)] px-2.5 py-0.5 text-xs text-muted-foreground">
                  {t}
                </span>
              ))}
            </div>
          )}

          {/* Deps */}
          {(repo.ast_metadata?.imports ?? []).length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground/50 mb-2">Key dependencies</p>
              <div className="flex flex-wrap gap-2">
                {repo.ast_metadata!.imports.slice(0, 6).map((dep) => (
                  <span key={dep} className="rounded border border-[var(--void-border)] bg-[var(--void-surface)] px-2 py-1 text-xs font-mono text-muted-foreground">
                    {dep}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar stats */}
        <div className="border-l border-[var(--void-border)] bg-[var(--void-surface)] p-6 space-y-6">
          {/* Metrics */}
          <div className="space-y-4">
            <p className="text-xs uppercase tracking-widest text-muted-foreground/50">Metrics</p>
            {[
              { label: "Stars", value: repo.stars_count.toLocaleString() },
              { label: "Forks", value: repo.forks_count.toLocaleString() },
              ...(repo.ast_metadata ? [
                { label: "Functions", value: repo.ast_metadata.function_count },
                { label: "Classes", value: repo.ast_metadata.class_count },
              ] : []),
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium tabular-nums text-foreground">{value}</span>
              </div>
            ))}
          </div>

          {/* Complexity */}
          {complexity > 0 && (
            <div>
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="uppercase tracking-widest text-muted-foreground/50">Complexity</span>
                <span className="text-brand font-medium">{complexity}/100</span>
              </div>
              <div className="h-1.5 rounded-full bg-[var(--void-border)] overflow-hidden">
                <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${complexity}%` }} />
              </div>
            </div>
          )}

          {/* Exports */}
          {(repo.ast_metadata?.exported_symbols ?? []).length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground/50 mb-2">Public API</p>
              <div className="space-y-1">
                {repo.ast_metadata!.exported_symbols.slice(0, 5).map((sym) => (
                  <div key={sym} className="text-xs font-mono text-muted-foreground bg-[var(--void-elevated)] rounded px-2 py-1">
                    {sym}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Frameworks */}
          {(repo.ast_metadata?.frameworks ?? []).length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground/50 mb-2">Frameworks</p>
              <div className="flex flex-wrap gap-1.5">
                {repo.ast_metadata!.frameworks.map((f) => (
                  <span key={f} className="rounded-full border border-brand/20 bg-brand/5 text-brand px-2.5 py-0.5 text-xs">
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="space-y-2 pt-2 border-t border-[var(--void-border)]">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Created</span>
              <span>{new Date(repo.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Updated</span>
              <span>{new Date(repo.updated_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function VoidRepoCard({ repo }: { repo: PortfolioRepo }) {
  const complexity = repo.ast_metadata?.complexity_score ?? 0

  return (
    <div className="group rounded-2xl border border-[var(--void-border)] bg-[var(--void-elevated)] overflow-hidden flex flex-col">
      <div className="p-6 flex-1 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-foreground">{repo.name}</h3>
            {repo.description && (
              <p className="text-sm text-muted-foreground mt-1 leading-snug line-clamp-2">{repo.description}</p>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            {repo.homepage && (
              <a href={repo.homepage} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline text-xs">demo ↗</a>
            )}
          </div>
        </div>

        {/* AI summary */}
        {repo.ai_summary && (
          <p className="text-xs text-muted-foreground/70 leading-relaxed line-clamp-3">
            {repo.ai_summary}
          </p>
        )}

        {/* Topics */}
        {repo.topics.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {repo.topics.slice(0, 4).map((t) => (
              <span key={t} className="rounded-full border border-[var(--void-border)] px-2 py-0.5 text-[10px] text-muted-foreground">
                {t}
              </span>
            ))}
            {repo.topics.length > 4 && (
              <span className="text-[10px] text-muted-foreground/50">+{repo.topics.length - 4}</span>
            )}
          </div>
        )}

        {/* Deps */}
        {(repo.ast_metadata?.imports ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {repo.ast_metadata!.imports.slice(0, 4).map((dep) => (
              <span key={dep} className="rounded border border-[var(--void-border)] bg-[var(--void-surface)] px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                {dep}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer stats */}
      <div className="border-t border-[var(--void-border)] px-6 py-3 flex items-center justify-between gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          {repo.primary_language && (
            <span className="text-brand font-medium">{repo.primary_language}</span>
          )}
          {repo.stars_count > 0 && <span>★ {repo.stars_count.toLocaleString()}</span>}
          {repo.forks_count > 0 && <span>⑂ {repo.forks_count}</span>}
        </div>
        <div className="flex items-center gap-2">
          {complexity > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="w-16 h-1 rounded-full bg-[var(--void-border)] overflow-hidden">
                <div className="h-full rounded-full bg-brand/60" style={{ width: `${complexity}%` }} />
              </div>
              <span className="text-[10px]">{complexity}</span>
            </div>
          )}
          <a href={repo.html_url ?? "#"} target="_blank" rel="noopener noreferrer"
            className="opacity-0 group-hover:opacity-100 transition-opacity text-brand">
            ↗
          </a>
        </div>
      </div>
    </div>
  )
}

function extractBio(mdx: string): string {
  const lines = mdx.split("\n")
  const paras: string[] = []
  for (const line of lines) {
    if (line.startsWith("#")) continue
    if (line.trim()) paras.push(line)
    if (paras.length >= 3) break
  }
  return paras.join("\n")
}

function extractAbout(mdx: string): string {
  const idx = mdx.search(/^#{1,2}\s*(about|bio)/im)
  if (idx === -1) return mdx.split("## Featured")[0] ?? mdx
  const rest = mdx.slice(idx)
  const next = rest.slice(1).search(/^#{1,2}\s/m)
  return next === -1 ? rest : rest.slice(0, next + 1)
}
