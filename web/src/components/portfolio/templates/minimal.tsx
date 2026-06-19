"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { MdxRenderer } from "../mdx-renderer"
import type { PortfolioData, PortfolioRepo } from "@/types/portfolio"
import type { EditCallbacks } from "@/app/dashboard/preview/preview-client"
import { InlineEditable } from "@/components/portfolio/inline-editable"
import {
  ContributionGraph,
  ContributionGraphBlock,
  ContributionGraphCalendar,
  ContributionGraphFooter,
  ContributionGraphLegend,
  ContributionGraphTotalCount,
} from "@/components/kibo-ui/contribution-graph"
import { LanguageDonut } from "@/components/portfolio/language-donut"

// ─── Constants ───────────────────────────────────────────────────────────────

const LANG_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f0db4f",
  Python: "#3572A5",
  Rust: "#dea584",
  Go: "#00ADD8",
  Java: "#b07219",
  "C++": "#f34b7d",
  "C#": "#178600",
  Swift: "#F05138",
  Kotlin: "#A97BFF",
  Ruby: "#701516",
  PHP: "#4F5D95",
  Dart: "#00B4AB",
  Shell: "#89e051",
}

const TECH_KEYWORDS = new Set([
  "React", "TypeScript", "JavaScript", "Python", "Rust", "Go", "Node.js",
  "Next.js", "GraphQL", "PostgreSQL", "MongoDB", "Redis", "Docker", "Kubernetes",
  "AWS", "GCP", "Azure", "WebAssembly", "WASM", "CUDA", "PyTorch", "TensorFlow",
  "Supabase", "LSP", "CRDT", "WASI", "gRPC", "REST", "ML", "AI", "LLM",
  "production", "scalable", "distributed", "real-time", "edge", "serverless",
  "open-source", "full-stack", "systems", "inference", "fine-tuning",
])

// ─── Utilities ────────────────────────────────────────────────────────────────

function getLanguageStats(repos: PortfolioRepo[]) {
  const counts: Record<string, number> = {}
  for (const r of repos) if (r.primary_language) counts[r.primary_language] = (counts[r.primary_language] || 0) + 1
  const total = repos.length || 1
  return Object.entries(counts)
    .map(([lang, count]) => ({ lang, count, pct: Math.round((count / total) * 100) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
}

function extractIntro(mdx: string): string {
  const paras: string[] = []
  for (const line of mdx.split("\n")) {
    const t = line.trim()
    if (!t) continue
    if (t.startsWith("#")) continue
    if (t.startsWith("-") || t.startsWith("*") || t.startsWith(">")) continue
    paras.push(line)
    if (paras.length >= 2) break
  }
  return paras.join(" ")
}

function extractAbout(mdx: string): string {
  const idx = mdx.search(/^#{1,2}\s*(about|bio)/im)
  if (idx === -1) return ""
  const after = mdx.slice(idx).replace(/^#{1,2}[^\n]+\n/, "").trimStart()
  const next = after.search(/^#{1,2}\s/m)
  return next === -1 ? after.trimEnd() : after.slice(0, next).trimEnd()
}

function extractContributions(mdx: string) {
  const idx = mdx.search(/^#{1,2}\s*(open source)/im)
  if (idx === -1) return []
  const section = mdx.slice(idx)
  const rest = section.slice(1)
  const endOffset = rest.search(/^#{1,2}\s/m)
  const end = endOffset === -1 ? -1 : endOffset + 1
  const block = end === -1 ? section : section.slice(0, end)
  const results: Array<{ repo: string; title: string; url: string; date: string }> = []
  for (const line of block.split("\n").filter(l => l.trim().startsWith("-"))) {
    const links = [...line.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)]
    const merged = line.match(/\(merged ([^)]+)\)/)
    if (links.length >= 2)
      results.push({ repo: links[0][1], title: links[1][1], url: links[1][2], date: merged?.[1] ?? "" })
  }
  return results.slice(0, 3)
}

function HighlightedText({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\s+)/).map((word, i) => {
        const clean = word.trim().replace(/[^a-zA-Z0-9.#+-]/g, "")
        if (TECH_KEYWORDS.has(clean) || TECH_KEYWORDS.has(word.trim()))
          return <span key={i} className="text-brand font-semibold">{word}</span>
        return word
      })}
    </>
  )
}

function resolveContactHref(value: string): string {
  const v = value.trim()
  if (!v) return ""
  if (v.startsWith("http://") || v.startsWith("https://")) return v
  if (v.includes("@") && !v.includes(" ")) return `mailto:${v}`
  return `https://${v}`
}

// ─── Main ─────────────────────────────────────────────────────────────────────

interface MinimalTemplateProps {
  data: PortfolioData
  editMode?: boolean
  editCallbacks?: EditCallbacks
}

export function MinimalTemplate({ data, editMode = false, editCallbacks }: MinimalTemplateProps) {
  const displayName = data.theme_config.display_name ?? data.username
  const totalStars = data.repositories.reduce((s, r) => s + r.stars_count, 0)
  const totalForks = data.repositories.reduce((s, r) => s + r.forks_count, 0)
  const languages = [...new Set(data.repositories.map(r => r.primary_language).filter(Boolean))] as string[]
  const intro = extractIntro(data.mdx_content)
  const about = extractAbout(data.mdx_content)
  const contributions = extractContributions(data.mdx_content)
  const langStats = getLanguageStats(data.repositories)
  const [liveProfile, setLiveProfile] = useState(data.github_profile ?? null)

  useEffect(() => {
    if (editMode) return
    fetch(`/api/contributions/${data.username}`)
      .then(r => r.ok ? r.json() : null)
      .then(fresh => { if (fresh) setLiveProfile(fresh) })
      .catch(() => {})
  }, [data.username, editMode])

  const activities = liveProfile?.contribution_weeks?.length
    ? liveProfile.contribution_weeks.flatMap(w => w.days)
    : null

  return (
    <div className="min-h-[100dvh] bg-background text-foreground font-sans">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto max-w-3xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {data.avatar_url && (
              <Image src={data.avatar_url} alt={data.username} width={32} height={32}
                className="rounded-full border border-border shrink-0" />
            )}
            <span className="font-bold text-sm tracking-tight">{displayName}</span>
          </div>
          <div className="flex items-center gap-5 text-xs text-muted-foreground">
            <a href="#work" className="hover:text-foreground transition-colors">Work</a>
            <a href="#about" className="hover:text-foreground transition-colors">About</a>
            <a href={`https://github.com/${data.username}`} target="_blank" rel="noopener noreferrer"
              className="hover:text-foreground transition-colors">GitHub ↗</a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6">

        {/* ── Hero ──────────────────────────────────────────────────────────── */}
        <section className="pt-20 pb-16">
          {/* Avatar + name */}
          {data.avatar_url && (
            <div className="mb-8 flex items-center gap-5">
              <Image src={data.avatar_url} alt={data.username} width={72} height={72}
                className="rounded-2xl border border-border shadow-sm shrink-0" />
              <div className="flex-1 min-w-0">
                <InlineEditable
                  value={displayName}
                  onSave={editCallbacks?.onNameSave ?? (() => {})}
                  editMode={editMode}
                  multiline={false}
                  inputClassName="text-xl font-bold"
                >
                  <h1 className="text-xl font-bold">{displayName}</h1>
                </InlineEditable>
                <a href={`https://github.com/${data.username}`} target="_blank" rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  github.com/{data.username}
                </a>
              </div>
            </div>
          )}

          {!data.avatar_url && (
            <InlineEditable
              value={displayName}
              onSave={editCallbacks?.onNameSave ?? (() => {})}
              editMode={editMode}
              multiline={false}
              wrapperClassName="mb-6"
              inputClassName="text-3xl font-bold"
            >
              <h1 className="text-3xl font-bold mb-6">{displayName}</h1>
            </InlineEditable>
          )}

          {/* Bio */}
          <InlineEditable
            value={intro}
            onSave={editCallbacks?.onBioSave ?? (() => {})}
            editMode={editMode}
            multiline
            wrapperClassName="mb-10"
          >
            <p className="text-xl sm:text-2xl leading-snug text-foreground font-medium mb-10" style={{ maxWidth: "42ch" }}>
              <HighlightedText text={intro} />
            </p>
          </InlineEditable>

          {/* Stats chips */}
          <div className="flex flex-wrap gap-3 mb-8">
            {[
              { label: "Stars", value: totalStars.toLocaleString(), icon: "★" },
              { label: "Forks", value: totalForks.toLocaleString(), icon: "⑂" },
              { label: "Repos", value: data.repositories.length, icon: "⌥" },
              { label: "Languages", value: languages.length, icon: "◈" },
              ...(liveProfile?.followers != null
                ? [{ label: "Followers", value: liveProfile.followers.toLocaleString(), icon: "↑" }]
                : []),
            ].map(({ label, value, icon }) => (
              <div key={label} className="flex items-center gap-2 rounded-full border border-border bg-muted/40 px-4 py-2">
                <span className="text-brand text-sm">{icon}</span>
                <span className="text-sm font-bold tabular-nums">{value}</span>
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>

          {/* Language donut */}
          {(liveProfile?.language_bytes || langStats.length > 0) && (
            <LanguageDonut
              languageBytes={liveProfile?.language_bytes ?? {}}
              repoLanguages={data.repositories.map(r => r.primary_language).filter(Boolean) as string[]}
            />
          )}
        </section>

        {/* ── Contribution Graph ─────────────────────────────────────────────── */}
        {activities && (
          <section className="pb-20">
            <div className="flex items-center gap-4 mb-6">
              <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground shrink-0">
                Activity
              </h2>
              <div className="flex-1 h-px bg-border" />
              {liveProfile?.total_contributions != null && (
                <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1.5">
                  {liveProfile !== data.github_profile && <span className="w-1.5 h-1.5 rounded-full bg-green-500" />}
                  {liveProfile.total_contributions.toLocaleString()} contributions
                </span>
              )}
            </div>
            <ContributionGraph
              data={activities}
              blockSize={11}
              blockMargin={3}
              blockRadius={2}
              fontSize={10}
              totalCount={liveProfile?.total_contributions}
              className="text-muted-foreground w-full max-w-full"
            >
              <ContributionGraphCalendar className="overflow-hidden [&>svg]:w-full [&>svg]:h-auto">
                {({ activity, dayIndex, weekIndex }) => (
                  <ContributionGraphBlock
                    key={`${weekIndex}-${dayIndex}`}
                    activity={activity}
                    dayIndex={dayIndex}
                    weekIndex={weekIndex}
                    className={undefined}
                    style={{
                      fill: activity.level === 0
                        ? "var(--border)"
                        : `color-mix(in oklch, var(--brand) ${activity.level * 25}%, var(--muted))`
                    }}
                  />
                )}
              </ContributionGraphCalendar>
              <ContributionGraphFooter className="mt-2 text-[10px]">
                <ContributionGraphTotalCount className="text-muted-foreground" />
                <ContributionGraphLegend className="ml-auto">
                  {({ level }) => (
                    <svg width={11} height={11} key={level}>
                      <rect
                        width={11} height={11} rx={2}
                        style={{
                          fill: level === 0
                            ? "var(--border)"
                            : `color-mix(in oklch, var(--brand) ${level * 25}%, var(--muted))`
                        }}
                      />
                    </svg>
                  )}
                </ContributionGraphLegend>
              </ContributionGraphFooter>
            </ContributionGraph>
          </section>
        )}

        {/* ── Selected Work ──────────────────────────────────────────────────── */}
        <section id="work" className="pb-20">
          <div className="flex items-center gap-4 mb-10">
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground shrink-0">
              Selected Work
            </h2>
            <div className="flex-1 h-px bg-border" />
          </div>

          <div className="space-y-14">
            {data.repositories.map((repo, i) => (
              <MinimalRepoCard
                key={repo.id}
                repo={repo}
                index={i}
                editMode={editMode}
                onProjectSave={editCallbacks?.onProjectSave}
              />
            ))}
          </div>
        </section>

        {/* ── Open Source ────────────────────────────────────────────────────── */}
        {contributions.length > 0 && (
          <section className="pb-20">
            <div className="flex items-center gap-4 mb-8">
              <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground shrink-0">
                Open Source
              </h2>
              <div className="flex-1 h-px bg-border" />
            </div>
            <div className="space-y-3">
              {contributions.map((c, i) => (
                <a key={i} href={c.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-start gap-4 group">
                  <span className="text-brand text-xs mt-1 shrink-0">↳</span>
                  <div>
                    <p className="text-sm font-medium group-hover:text-brand transition-colors leading-snug">{c.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{c.repo} · merged {c.date}</p>
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* ── About ──────────────────────────────────────────────────────────── */}
        {about && (
          <section id="about" className="pb-20 pt-4 border-t border-border">
            <div className="flex items-center gap-4 mb-8 pt-10">
              <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground shrink-0">About</h2>
              <div className="flex-1 h-px bg-border" />
            </div>
            <InlineEditable
              value={about}
              onSave={editCallbacks?.onAboutSave ?? (() => {})}
              editMode={editMode}
              multiline
            >
              <div className="prose prose-neutral dark:prose-invert max-w-none text-muted-foreground leading-relaxed">
                <MdxRenderer content={about} />
              </div>
            </InlineEditable>
          </section>
        )}
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-border">
        <div className="mx-auto max-w-3xl px-6 py-12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <p className="text-sm text-muted-foreground mb-1">
              Generated by{" "}
              <a href="/" className="text-brand hover:underline underline-offset-2">Astra</a>
            </p>
            {data.last_synced_at && (
              <p className="text-xs text-muted-foreground">
                Updated {new Date(data.last_synced_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </p>
            )}
          </div>
          {editMode ? (
            <InlineEditable
              value={data.theme_config.contact_url ?? ""}
              onSave={editCallbacks?.onContactSave ?? (() => {})}
              editMode={editMode}
              multiline={false}
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-brand/40 px-6 py-2.5 text-sm font-medium text-brand cursor-pointer">
                {data.theme_config.contact_url || "+ Add contact link"}
              </div>
            </InlineEditable>
          ) : data.theme_config.contact_url ? (
            <a
              href={resolveContactHref(data.theme_config.contact_url)}
              target={data.theme_config.contact_url.includes("@") && !data.theme_config.contact_url.startsWith("http") ? undefined : "_blank"}
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-brand/40 px-6 py-2.5 text-sm font-medium text-brand hover:bg-brand/5 transition-colors"
            >
              {data.theme_config.contact_url.includes("@") && !data.theme_config.contact_url.startsWith("http")
                ? data.theme_config.contact_url
                : "Get in touch ↗"}
            </a>
          ) : null}
        </div>
      </footer>
    </div>
  )
}

// ─── MinimalRepoCard ──────────────────────────────────────────────────────────

interface MinimalRepoCardProps {
  repo: PortfolioRepo
  index: number
  editMode?: boolean
  onProjectSave?: (repoId: string, newSummary: string) => void
}

function MinimalRepoCard({ repo, index, editMode = false, onProjectSave }: MinimalRepoCardProps) {
  const complexity = repo.ast_metadata?.complexity_score ?? 0
  const langColor = repo.primary_language ? (LANG_COLORS[repo.primary_language] ?? "#888") : "#888"
  const allTech = [
    ...new Set([...(repo.ast_metadata?.frameworks ?? []), ...(repo.ast_metadata?.imports ?? [])])
  ].slice(0, 6)
  const lastUpdated = new Date(repo.updated_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })
  const year = new Date(repo.created_at).getFullYear()
  const currentSummary = repo.ai_summary ?? repo.description ?? ""

  return (
    <article>
      {/* Title row */}
      <div className="flex items-start justify-between gap-6 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xs font-mono text-muted-foreground/50 tabular-nums">{String(index + 1).padStart(2, "0")}</span>
            <h3 className="text-lg font-bold tracking-tight">{repo.name}</h3>
            {repo.primary_language && (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: langColor }} />
                {repo.primary_language}
              </span>
            )}
            <span className="text-xs text-muted-foreground/40">{year}</span>
          </div>
          {repo.description && (
            <p className="text-sm text-muted-foreground leading-snug">{repo.description}</p>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0 text-xs text-muted-foreground">
          {repo.homepage && (
            <a href={repo.homepage} target="_blank" rel="noopener noreferrer"
              className="text-brand hover:underline underline-offset-2">demo ↗</a>
          )}
          <a href={repo.html_url ?? "#"} target="_blank" rel="noopener noreferrer"
            className="hover:text-foreground transition-colors">GitHub ↗</a>
        </div>
      </div>

      {/* AI Summary — inline editable */}
      {repo.ai_summary && (
        <InlineEditable
          value={currentSummary}
          onSave={(v) => onProjectSave?.(repo.id, v)}
          editMode={editMode}
          multiline
          wrapperClassName="mb-4"
        >
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">{repo.ai_summary}</p>
        </InlineEditable>
      )}

      {/* Stats row */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-muted-foreground mb-4">
        {repo.stars_count > 0 && <span>★ {repo.stars_count.toLocaleString()}</span>}
        {repo.forks_count > 0 && <span>⑂ {repo.forks_count}</span>}
        {repo.ast_metadata && (
          <>
            <span>{repo.ast_metadata.function_count} functions</span>
            {repo.ast_metadata.class_count > 0 && <span>{repo.ast_metadata.class_count} classes</span>}
          </>
        )}
        <span className="ml-auto text-muted-foreground/40">Updated {lastUpdated}</span>
      </div>

      {/* Tech stack */}
      {allTech.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {allTech.map(t => (
            <span key={t} className="rounded-md border border-border bg-muted/30 px-2 py-0.5 text-[11px] font-mono text-muted-foreground">
              {t}
            </span>
          ))}
        </div>
      )}

      {/* Topics */}
      {repo.topics.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {repo.topics.slice(0, 6).map(t => (
            <span key={t} className="rounded-full bg-muted/50 px-2.5 py-0.5 text-[11px] text-muted-foreground">{t}</span>
          ))}
        </div>
      )}

      {/* Exported symbols */}
      {(repo.ast_metadata?.exported_symbols ?? []).length > 0 && (
        <div className="border-l-2 border-brand/30 pl-4 mb-4">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 mb-1.5">Public API</p>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {repo.ast_metadata!.exported_symbols.slice(0, 6).map(sym => (
              <code key={sym} className="text-[11px] font-mono text-muted-foreground">{sym}</code>
            ))}
            {repo.ast_metadata!.exported_symbols.length > 6 && (
              <span className="text-[11px] text-muted-foreground/40">+{repo.ast_metadata!.exported_symbols.length - 6} more</span>
            )}
          </div>
        </div>
      )}

      {/* Complexity bar */}
      {complexity > 0 && (
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-muted-foreground/50 shrink-0 uppercase tracking-wider">Complexity</span>
          <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-muted">
            <div className="h-full rounded-full bg-brand/50 transition-all" style={{ width: `${complexity}%` }} />
          </div>
          <span className="text-[11px] text-muted-foreground tabular-nums">{complexity}/100</span>
        </div>
      )}
    </article>
  )
}
