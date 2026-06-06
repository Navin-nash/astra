import Image from "next/image"
import { MdxRenderer } from "../mdx-renderer"
import type { PortfolioData, PortfolioRepo } from "@/types/portfolio"

export function TerminalTemplate({ data }: { data: PortfolioData }) {
  const joined = data.repositories[0]
    ? new Date(data.repositories[0].created_at).getFullYear()
    : new Date().getFullYear()

  const totalStars = data.repositories.reduce((s, r) => s + r.stars_count, 0)
  const totalForks = data.repositories.reduce((s, r) => s + r.forks_count, 0)

  return (
    <div className="min-h-[100dvh] bg-background text-foreground font-mono text-sm">
      {/* Title bar */}
      <div className="sticky top-0 z-50 flex items-center justify-between px-4 py-2.5 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-destructive opacity-70" />
          <div className="w-3 h-3 rounded-full bg-yellow-400 opacity-70" />
          <div className="w-3 h-3 rounded-full bg-green-500 opacity-70" />
        </div>
        <span className="text-xs text-muted-foreground">{data.username}@astra ~ portfolio</span>
        <span className="text-xs opacity-0">x</span>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">

        {/* whoami */}
        <div className="mb-10">
          <TerminalLine cmd="whoami" />
          <div className="rounded-lg border border-border bg-card p-6 mt-3">
            <div className="flex items-center gap-4 mb-5">
              {data.avatar_url && (
                <Image src={data.avatar_url} alt={data.username} width={56} height={56} className="rounded border border-border shrink-0" />
              )}
              <div>
                <div className="font-bold text-base text-green-500">{data.username}</div>
                <div className="text-xs text-muted-foreground mt-0.5">member since {joined}</div>
              </div>
            </div>
            <div className="text-foreground leading-relaxed">
              <MdxRenderer content={extractIntro(data.mdx_content)} />
            </div>
          </div>
        </div>

        {/* git log --stat */}
        <div className="mb-10">
          <TerminalLine cmd={`git log --stat  # ${data.repositories.length} repos · ${totalStars.toLocaleString()} stars · ${totalForks} forks`} />
        </div>

        {/* Projects */}
        <div className="mb-12">
          <TerminalLine cmd="ls -la ./projects/" />
          <div className="mt-3 space-y-3">
            {data.repositories.map((repo) => (
              <TerminalRepoBlock key={repo.id} repo={repo} />
            ))}
          </div>
        </div>

        {/* README */}
        {data.mdx_content && extractRest(data.mdx_content) && (
          <div className="mb-12">
            <TerminalLine cmd="cat README.md" />
            <div className="mt-3 rounded-lg border border-border bg-card p-6 text-foreground">
              <MdxRenderer content={extractRest(data.mdx_content)} />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center gap-2 text-green-500">
          <span>❯</span>
          <span className="animate-pulse">_</span>
        </div>
      </div>
    </div>
  )
}

function TerminalLine({ cmd }: { cmd: string }) {
  return (
    <div className="flex items-center gap-2 text-green-500">
      <span>❯</span>
      <span className="text-muted-foreground">{cmd}</span>
    </div>
  )
}

function TerminalRepoBlock({ repo }: { repo: PortfolioRepo }) {
  const complexity = repo.ast_metadata?.complexity_score ?? 0
  const lastUpdated = new Date(repo.updated_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })
  const yearCreated = new Date(repo.created_at).getFullYear()

  return (
    <div className="rounded border border-border bg-card overflow-hidden">
      {/* Header row */}
      <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-border">
        <div className="flex items-center gap-3 min-w-0">
          <a href={repo.html_url ?? "#"} target="_blank" rel="noopener noreferrer"
            className="font-bold text-green-500 hover:underline underline-offset-2 shrink-0">
            {repo.name}
          </a>
          {repo.primary_language && (
            <span className="text-xs text-green-500/70 shrink-0">{repo.primary_language}</span>
          )}
          {repo.description && (
            <span className="text-xs text-muted-foreground truncate"># {repo.description}</span>
          )}
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground shrink-0">
          {repo.stars_count > 0 && <span>★{repo.stars_count.toLocaleString()}</span>}
          {repo.forks_count > 0 && <span>⑂{repo.forks_count}</span>}
          {repo.homepage && (
            <a href={repo.homepage} target="_blank" rel="noopener noreferrer"
              className="text-green-500/70 hover:text-green-500 transition-colors">
              [demo]
            </a>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-4 space-y-3">
        {/* AI summary */}
        {repo.ai_summary && (
          <p className="text-xs text-muted-foreground leading-relaxed">
            {repo.ai_summary}
          </p>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-1 text-xs">
          {[
            ["created", String(yearCreated)],
            ["updated", lastUpdated],
            ...(repo.ast_metadata ? [
              ["functions", String(repo.ast_metadata.function_count)],
              ["classes", String(repo.ast_metadata.class_count)],
            ] : []),
          ].map(([k, v]) => (
            <div key={k} className="flex items-center gap-1.5">
              <span className="text-muted-foreground/50">{k}:</span>
              <span className="text-muted-foreground">{v}</span>
            </div>
          ))}
        </div>

        {/* Complexity */}
        {complexity > 0 && (
          <div className="flex items-center gap-3 text-xs">
            <span className="text-muted-foreground/50 shrink-0">complexity:</span>
            <span className={complexity > 60 ? "text-green-500" : "text-muted-foreground"}>
              {"█".repeat(Math.round(complexity / 10))}{"░".repeat(10 - Math.round(complexity / 10))}
            </span>
            <span className="text-muted-foreground">{complexity}/100</span>
          </div>
        )}

        {/* Deps */}
        {(repo.ast_metadata?.imports ?? []).length > 0 && (
          <div className="flex items-start gap-2 text-xs">
            <span className="text-muted-foreground/50 shrink-0">requires:</span>
            <span className="text-muted-foreground">{repo.ast_metadata!.imports.join(", ")}</span>
          </div>
        )}

        {/* Exports */}
        {(repo.ast_metadata?.exported_symbols ?? []).length > 0 && (
          <div className="flex items-start gap-2 text-xs">
            <span className="text-muted-foreground/50 shrink-0">exports:</span>
            <span className="text-green-500/80">{repo.ast_metadata!.exported_symbols.join(", ")}</span>
          </div>
        )}

        {/* Topics */}
        {repo.topics.length > 0 && (
          <div className="flex items-start gap-2 text-xs">
            <span className="text-muted-foreground/50 shrink-0">topics:</span>
            <span className="text-muted-foreground">{repo.topics.join(", ")}</span>
          </div>
        )}

        {/* Frameworks */}
        {(repo.ast_metadata?.frameworks ?? []).length > 0 && (
          <div className="flex items-start gap-2 text-xs">
            <span className="text-muted-foreground/50 shrink-0">stack:</span>
            <span className="text-muted-foreground">{repo.ast_metadata!.frameworks.join(", ")}</span>
          </div>
        )}
      </div>
    </div>
  )
}

function extractIntro(mdx: string): string {
  const next = mdx.search(/^## /m)
  return next > -1 ? mdx.slice(0, next) : mdx.slice(0, 600)
}

function extractRest(mdx: string): string {
  const next = mdx.search(/^## /m)
  return next > -1 ? mdx.slice(next) : ""
}
