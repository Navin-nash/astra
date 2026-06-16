"use client"

import type React from "react"
import Image from "next/image"
import { MdxRenderer } from "../mdx-renderer"
import type { PortfolioData, PortfolioRepo, GithubProfile } from "@/types/portfolio"
import type { EditCallbacks } from "@/app/dashboard/preview/preview-client"
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

function seededRng(seed: string) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0
  return () => {
    h = Math.imul(2654435761, h) ^ (h >>> 16)
    return (h >>> 0) / 0xffffffff
  }
}

function generateHeatmap(repos: PortfolioRepo[], username: string): number[][] {
  const WEEKS = 53
  const grid: number[][] = Array.from({ length: WEEKS }, () => Array(7).fill(0))
  const rand = seededRng(username)
  const rate = 0.28 + rand() * 0.28

  for (let w = 0; w < WEEKS; w++) {
    for (let d = 0; d < 7; d++) {
      const wknd = d === 0 || d === 6 ? 0.4 : 1
      if (rand() < rate * wknd) grid[w][d] = Math.floor(rand() * 3) + 1
    }
  }

  const now = Date.now()
  for (const repo of repos) {
    for (const dateStr of [repo.updated_at, repo.created_at]) {
      const days = Math.floor((now - new Date(dateStr).getTime()) / 86400000)
      if (days < 365) {
        const w = Math.min(52, 52 - Math.floor(days / 7))
        const d = days % 7
        grid[w][d] = 4
        for (let dw = -1; dw <= 1; dw++)
          for (let dd = -1; dd <= 1; dd++) {
            if (!dw && !dd) continue
            const nw = w + dw
            if (nw >= 0 && nw < WEEKS)
              grid[nw][(d + dd + 7) % 7] = Math.max(grid[nw][(d + dd + 7) % 7], 2)
          }
      }
    }
  }
  return grid
}

function getLanguageStats(repos: PortfolioRepo[]) {
  const counts: Record<string, number> = {}
  for (const r of repos) if (r.primary_language) counts[r.primary_language] = (counts[r.primary_language] || 0) + 1
  const total = repos.length || 1
  return Object.entries(counts)
    .map(([lang, count]) => ({ lang, count, pct: Math.round((count / total) * 100) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
}

function extractBio(mdx: string): string {
  const paras: string[] = []
  for (const line of mdx.split("\n")) {
    const t = line.trim()
    if (!t) continue
    if (t.startsWith("#") || t.startsWith("-") || t.startsWith("*") || t.startsWith(">")) continue
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
  return results.slice(0, 4)
}

function HighlightedBio({ text }: { text: string }) {
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

// ─── Main ─────────────────────────────────────────────────────────────────────

interface VoidTemplateProps {
  data: PortfolioData
  editMode?: boolean
  editCallbacks?: EditCallbacks
}

export function VoidTemplate({ data, editMode = false, editCallbacks }: VoidTemplateProps) {
  const totalStars = data.repositories.reduce((s, r) => s + r.stars_count, 0)
  const totalForks = data.repositories.reduce((s, r) => s + r.forks_count, 0)
  const languages = [...new Set(data.repositories.map(r => r.primary_language).filter(Boolean))] as string[]
  const bio = extractBio(data.mdx_content)
  const about = extractAbout(data.mdx_content)
  const contributions = extractContributions(data.mdx_content)
  const activities = data.github_profile?.contribution_weeks?.length
    ? data.github_profile.contribution_weeks.flatMap(w => w.days)
    : (() => {
        // Fall back to synthetic grid — convert to Activity[] for kibo-ui
        const grid = generateHeatmap(data.repositories, data.username)
        const now = new Date()
        return grid.flatMap((week, wi) =>
          week.map((level, di) => {
            const daysAgo = (52 - wi) * 7 + (6 - di)
            const d = new Date(now.getTime() - daysAgo * 86400000)
            return { date: d.toISOString().slice(0, 10), count: level, level }
          })
        )
      })()
  const langStats = getLanguageStats(data.repositories)
  const topTechs = [
    ...new Set(data.repositories.flatMap(r => r.ast_metadata?.frameworks ?? []))
  ].slice(0, 12)
  const totalFns = data.repositories.reduce((s, r) => s + (r.ast_metadata?.function_count ?? 0), 0)

  return (
    <div className="min-h-[100dvh] font-sans" style={{ background: "var(--void)", color: "var(--foreground)" }}>
      <style>{`
        .hm-0{background:var(--void-border)}
        .hm-1{background:color-mix(in oklch,var(--brand) 22%,var(--void-surface))}
        .hm-2{background:color-mix(in oklch,var(--brand) 48%,var(--void-surface))}
        .hm-3{background:color-mix(in oklch,var(--brand) 74%,var(--void-surface))}
        .hm-4{background:var(--brand)}
        .v-card{background:var(--void-elevated);border:1px solid var(--void-border)}
        .v-surface{background:var(--void-surface);border:1px solid var(--void-border)}
        .v-card:hover{border-color:color-mix(in oklch,var(--brand) 35%,var(--void-border))}
      `}</style>

      {/* ── Floating Nav ──────────────────────────────────────────────────────── */}
      <nav className="fixed top-4 left-1/2 z-50 -translate-x-1/2">
        <div className="flex items-center gap-5 rounded-full px-5 py-2.5 text-sm shadow-lg backdrop-blur-md"
          style={{ border: "1px solid var(--void-border)", background: "color-mix(in oklch, var(--void-elevated) 88%, transparent)" }}>
          <span className="font-bold text-brand tracking-tight">{data.username}</span>
          <span className="text-muted-foreground/30">|</span>
          <a href="#projects" className="text-muted-foreground hover:text-foreground transition-colors text-xs uppercase tracking-widest">Projects</a>
          <a href="#activity" className="text-muted-foreground hover:text-foreground transition-colors text-xs uppercase tracking-widest">Activity</a>
          <a href="#about" className="text-muted-foreground hover:text-foreground transition-colors text-xs uppercase tracking-widest">About</a>
          <a href={`https://github.com/${data.username}`} target="_blank" rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors text-xs uppercase tracking-widest">GitHub</a>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-6 lg:px-10 pt-32 pb-24 min-h-screen flex flex-col justify-center">
        <div className="grid lg:grid-cols-[1fr_280px] gap-14 items-start">
          <div className="space-y-8">

            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-brand"
              style={{ border: "1px solid color-mix(in oklch,var(--brand) 30%,transparent)", background: "color-mix(in oklch,var(--brand) 8%,transparent)" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-brand" />
              Developer Portfolio
            </div>

            {/* Mobile avatar */}
            {data.avatar_url && (
              <div className="lg:hidden">
                <Image src={data.avatar_url} alt={data.username} width={80} height={80}
                  className="rounded-2xl" style={{ border: "2px solid color-mix(in oklch,var(--brand) 25%,var(--void-border))" }} />
              </div>
            )}

            {/* Name + Bio */}
            <div className="space-y-5">
              <h1 className="text-[clamp(3rem,8vw,6rem)] font-black leading-[0.95] tracking-[-0.04em]">
                {data.username}
              </h1>
              <EditableSection
                editMode={editMode}
                label="Introduction"
                onClick={() => editCallbacks?.onBioEdit(bio)}
              >
                <p className="text-lg sm:text-xl leading-relaxed max-w-2xl text-muted-foreground">
                  <HighlightedBio text={bio} />
                </p>
              </EditableSection>
            </div>

            {/* Stats chips */}
            <div className="flex flex-wrap gap-3">
              {[
                { icon: "★", label: "Stars", value: `${totalStars.toLocaleString()}` },
                { icon: "⌥", label: "Repos", value: data.repositories.length },
                { icon: "⑂", label: "Forks", value: totalForks.toLocaleString() },
                { icon: "ƒ", label: "Functions", value: `${totalFns}+` },
                { icon: "◈", label: "Languages", value: languages.length },
                ...(data.github_profile?.followers != null
                  ? [{ icon: "↑", label: "Followers", value: data.github_profile.followers.toLocaleString() }]
                  : []),
              ].map(({ icon, label, value }) => (
                <div key={label} className="v-card rounded-xl px-4 py-3">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{icon} {label}</div>
                  <div className="text-xl font-bold tabular-nums">{value}</div>
                </div>
              ))}
            </div>

            {/* Language tags */}
            {languages.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {languages.map(lang => (
                  <span key={lang} className="flex items-center gap-2 rounded-full px-3 py-1.5 text-xs text-muted-foreground"
                    style={{ border: "1px solid var(--void-border)", background: "var(--void-surface)" }}>
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: LANG_COLORS[lang] ?? "#888" }} />
                    {lang}
                  </span>
                ))}
              </div>
            )}

            {/* Tech stack */}
            {topTechs.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {topTechs.map(t => (
                  <span key={t} className="v-surface rounded-lg px-2.5 py-1 text-[11px] font-mono text-muted-foreground">{t}</span>
                ))}
              </div>
            )}

            {/* CTAs */}
            <div className="flex flex-wrap gap-3 pt-1">
              <a href="#projects" className="inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-bold tracking-wide transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: "var(--brand)", color: "#fff" }}>
                View Projects
              </a>
              <a href={`https://github.com/${data.username}`} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-medium text-muted-foreground transition-all hover:text-foreground"
                style={{ border: "1px solid var(--void-border)" }}>
                GitHub ↗
              </a>
            </div>
          </div>

          {/* Desktop avatar */}
          {data.avatar_url && (
            <div className="hidden lg:flex flex-col items-center gap-5 pt-8">
              <div className="relative">
                <Image src={data.avatar_url} alt={data.username} width={240} height={240}
                  className="rounded-3xl shadow-2xl"
                  style={{ border: "1px solid var(--void-border)" }} />
                <div className="absolute -bottom-4 -right-4 v-card rounded-2xl px-4 py-2 text-xs font-semibold text-brand"
                  style={{ border: "1px solid color-mix(in oklch,var(--brand) 30%,var(--void-border))" }}>
                  ● Available for work
                </div>
              </div>

              {/* Language donut */}
              {(data.github_profile?.language_bytes || langStats.length > 0) && (
                <div className="w-full v-card rounded-2xl p-5 mt-4">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-4">Top Languages</p>
                  <LanguageDonut
                    languageBytes={data.github_profile?.language_bytes ?? {}}
                    repoLanguages={data.repositories.map(r => r.primary_language).filter(Boolean) as string[]}
                    labelColor="var(--foreground)"
                    dimColor="var(--muted-foreground)"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── GitHub Activity ────────────────────────────────────────────────────── */}
      <section id="activity" className="mx-auto max-w-7xl px-6 lg:px-10 py-20"
        style={{ borderTop: "1px solid var(--void-border)" }}>
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest mb-2 text-brand">Activity</p>
            <h2 className="text-2xl font-bold tracking-tight">Contribution History</h2>
          </div>
          {data.last_synced_at && (
            <p className="text-xs text-muted-foreground">
              Synced {new Date(data.last_synced_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>
          )}
        </div>
        <div className="v-card rounded-2xl p-6 overflow-hidden">
          <ContributionGraph
            data={activities}
            blockSize={12}
            blockMargin={3}
            blockRadius={2}
            fontSize={10}
            totalCount={data.github_profile?.total_contributions}
            className="text-muted-foreground"
          >
            <ContributionGraphCalendar className="overflow-x-auto">
              {({ activity, dayIndex, weekIndex }) => (
                <ContributionGraphBlock
                  key={`${weekIndex}-${dayIndex}`}
                  activity={activity}
                  dayIndex={dayIndex}
                  weekIndex={weekIndex}
                  className="transition-opacity hover:opacity-80"
                  style={{
                    fill: activity.level === 0 ? "var(--void-border)" :
                      `color-mix(in oklch, var(--brand) ${activity.level * 25}%, var(--void-surface))`
                  }}
                />
              )}
            </ContributionGraphCalendar>
            <ContributionGraphFooter className="mt-3 text-[10px]">
              <ContributionGraphTotalCount>
                {({ totalCount, year }) => (
                  <span className="text-muted-foreground">
                    {totalCount.toLocaleString()} contributions in {year}
                  </span>
                )}
              </ContributionGraphTotalCount>
              <ContributionGraphLegend className="ml-auto">
                {({ level }) => (
                  <svg width={12} height={12} key={level}>
                    <rect
                      width={12} height={12} rx={2}
                      style={{
                        fill: level === 0 ? "var(--void-border)" :
                          `color-mix(in oklch, var(--brand) ${level * 25}%, var(--void-surface))`
                      }}
                    />
                  </svg>
                )}
              </ContributionGraphLegend>
            </ContributionGraphFooter>
          </ContributionGraph>
        </div>
      </section>

      {/* ── Featured Projects ──────────────────────────────────────────────────── */}
      <section id="projects" className="mx-auto max-w-7xl px-6 lg:px-10 py-20"
        style={{ borderTop: "1px solid var(--void-border)" }}>
        <div className="mb-10">
          <p className="text-[11px] font-semibold uppercase tracking-widest mb-2 text-brand">Work</p>
          <h2 className="text-2xl font-bold tracking-tight">Featured Projects</h2>
        </div>
        <div className="grid lg:grid-cols-2 gap-5">
          {data.repositories.map(repo => (
            <VoidProjectCard
              key={repo.id}
              repo={repo}
              editMode={editMode}
              onEdit={editCallbacks?.onProjectEdit}
            />
          ))}
        </div>
      </section>

      {/* ── Language Breakdown (mobile) ────────────────────────────────────────── */}
      {(data.github_profile?.language_bytes || langStats.length > 0) && (
        <section className="lg:hidden mx-auto max-w-7xl px-6 py-20"
          style={{ borderTop: "1px solid var(--void-border)" }}>
          <div className="mb-8">
            <p className="text-[11px] font-semibold uppercase tracking-widest mb-2 text-brand">Stack</p>
            <h2 className="text-2xl font-bold tracking-tight">Top Languages</h2>
          </div>
          <div className="v-card rounded-2xl p-6">
            <LanguageDonut
              languageBytes={data.github_profile?.language_bytes ?? {}}
              repoLanguages={data.repositories.map(r => r.primary_language).filter(Boolean) as string[]}
              labelColor="var(--foreground)"
              dimColor="var(--muted-foreground)"
            />
          </div>
        </section>
      )}

      {/* ── Open Source Contributions ──────────────────────────────────────────── */}
      {contributions.length > 0 && (
        <section className="mx-auto max-w-7xl px-6 lg:px-10 py-20"
          style={{ borderTop: "1px solid var(--void-border)" }}>
          <div className="mb-8">
            <p className="text-[11px] font-semibold uppercase tracking-widest mb-2 text-brand">Community</p>
            <h2 className="text-2xl font-bold tracking-tight">Open Source</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {contributions.map((c, i) => (
              <a key={i} href={c.url} target="_blank" rel="noopener noreferrer"
                className="v-card rounded-xl p-5 group transition-all block">
                <p className="text-[10px] uppercase tracking-widest text-brand mb-1.5">Merged · {c.date}</p>
                <p className="font-semibold text-sm group-hover:text-brand transition-colors leading-snug">{c.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{c.repo}</p>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* ── About ─────────────────────────────────────────────────────────────── */}
      {about && (
        <section id="about" className="mx-auto max-w-7xl px-6 lg:px-10 py-20"
          style={{ borderTop: "1px solid var(--void-border)" }}>
          <div className="mb-8">
            <p className="text-[11px] font-semibold uppercase tracking-widest mb-2 text-brand">Bio</p>
            <h2 className="text-2xl font-bold tracking-tight">About</h2>
          </div>
          <EditableSection
            editMode={editMode}
            label="About"
            onClick={() => editCallbacks?.onAboutEdit(about)}
          >
            <div className="max-w-2xl prose max-w-none text-muted-foreground leading-relaxed">
              <MdxRenderer content={about} />
            </div>
          </EditableSection>
        </section>
      )}

      {/* ── Footer CTA ────────────────────────────────────────────────────────── */}
      <footer className="mx-auto max-w-7xl px-6 lg:px-10 py-16"
        style={{ borderTop: "1px solid var(--void-border)" }}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8">
          <div>
            <h3 className="text-2xl sm:text-3xl font-black tracking-tight mb-2">
              Let&apos;s build something amazing.
            </h3>
            <p className="text-sm text-muted-foreground">
              Generated by{" "}
              <a href="/" className="text-brand hover:underline underline-offset-2">Astra</a>
              {data.last_synced_at && (
                <> · Updated {new Date(data.last_synced_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</>
              )}
            </p>
          </div>
          <a href={`https://github.com/${data.username}`} target="_blank" rel="noopener noreferrer"
            className="shrink-0 rounded-full px-8 py-3.5 text-sm font-bold transition-all hover:scale-[1.03] active:scale-[0.98]"
            style={{ background: "var(--brand)", color: "#fff" }}>
            Get in touch ↗
          </a>
        </div>
      </footer>
    </div>
  )
}

// ─── EditableSection ─────────────────────────────────────────────────────────

function EditableSection({
  editMode,
  label,
  onClick,
  children,
}: {
  editMode: boolean
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  if (!editMode) return <>{children}</>
  return (
    <div
      className="relative group cursor-pointer rounded-xl"
      onClick={onClick}
    >
      {children}
      <div className="absolute inset-0 rounded-xl border-2 border-dashed border-brand/30 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      <span className="absolute top-2 right-2 text-[10px] uppercase tracking-widest text-brand bg-background/90 border border-brand/20 px-2 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        Edit ✎
      </span>
    </div>
  )
}

// ─── VoidProjectCard ──────────────────────────────────────────────────────────

interface VoidProjectCardProps {
  repo: PortfolioRepo
  editMode?: boolean
  onEdit?: (repoId: string, currentSummary: string) => void
}

function VoidProjectCard({ repo, editMode = false, onEdit }: VoidProjectCardProps) {
  const complexity = repo.ast_metadata?.complexity_score ?? 0
  const langColor = repo.primary_language ? (LANG_COLORS[repo.primary_language] ?? "#888") : "#888"
  // Use only frameworks — imports include noise like 'button', 'lucide-react', etc.
  const allTech = [...new Set(repo.ast_metadata?.frameworks ?? [])].slice(0, 5)

  const currentSummary = repo.ai_summary ?? repo.description ?? ""

  return (
    <article
      className={`v-card rounded-2xl p-6 flex flex-col gap-4 transition-all ${
        editMode ? "cursor-pointer hover:ring-2 hover:ring-brand/40 relative" : ""
      }`}
      onClick={editMode ? () => onEdit?.(repo.id, currentSummary) : undefined}
      style={{ transition: "border-color 0.15s, box-shadow 0.15s" }}
    >
      {editMode && (
        <span className="absolute top-3 right-3 text-[10px] uppercase tracking-widest text-brand bg-brand/10 px-2 py-0.5 rounded-full border border-brand/20">
          Edit ✎
        </span>
      )}
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center flex-wrap gap-2 mb-1.5">
            {repo.primary_language && (
              <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: langColor }} />
                {repo.primary_language}
              </span>
            )}
            {repo.topics.slice(0, 2).map(t => (
              <span key={t} className="v-surface rounded-full px-2 py-0.5 text-[11px] text-muted-foreground">{t}</span>
            ))}
            <span className="text-[11px] text-muted-foreground/40 ml-auto shrink-0">
              {new Date(repo.created_at).getFullYear()}
            </span>
          </div>
          <h3 className="text-lg font-bold leading-tight">{repo.name}</h3>
        </div>
        <div className="flex items-center gap-2 shrink-0 text-xs">
          {repo.homepage && (
            <a href={repo.homepage} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline underline-offset-2">demo ↗</a>
          )}
          <a href={repo.html_url ?? "#"} target="_blank" rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors">GitHub ↗</a>
        </div>
      </div>

      {/* Description */}
      {repo.description && (
        <p className="text-sm text-muted-foreground leading-snug">{repo.description}</p>
      )}

      {/* AI Summary */}
      {repo.ai_summary && (
        <p className="text-sm text-muted-foreground/80 leading-relaxed flex-1">{repo.ai_summary}</p>
      )}

      {/* Tech stack */}
      {allTech.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {allTech.map(t => (
            <span key={t} className="v-surface rounded-md px-2 py-0.5 text-[11px] font-mono text-muted-foreground">{t}</span>
          ))}
        </div>
      )}

      {/* Exported symbols */}
      {(repo.ast_metadata?.exported_symbols ?? []).length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 mb-1.5">Public API</p>
          <div className="flex flex-wrap gap-1.5">
            {repo.ast_metadata!.exported_symbols.slice(0, 5).map(sym => (
              <code key={sym} className="rounded px-1.5 py-0.5 text-[11px] font-mono text-muted-foreground"
                style={{ background: "var(--void-surface)" }}>
                {sym}
              </code>
            ))}
            {repo.ast_metadata!.exported_symbols.length > 5 && (
              <span className="text-[11px] text-muted-foreground/40">
                +{repo.ast_metadata!.exported_symbols.length - 5} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Footer: stats + complexity */}
      <div className="flex items-center justify-between pt-3" style={{ borderTop: "1px solid var(--void-border)" }}>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {repo.stars_count > 0 && <span>★ {repo.stars_count.toLocaleString()}</span>}
          {repo.forks_count > 0 && <span>⑂ {repo.forks_count}</span>}
          {repo.ast_metadata && <span>{repo.ast_metadata.function_count} fns</span>}
        </div>
        {complexity > 0 && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground/60">Complexity</span>
            <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--void-border)" }}>
              <div className="h-full rounded-full" style={{ width: `${complexity}%`, background: "var(--brand)" }} />
            </div>
            <span className="text-brand font-semibold tabular-nums">{complexity}</span>
          </div>
        )}
      </div>
    </article>
  )
}
