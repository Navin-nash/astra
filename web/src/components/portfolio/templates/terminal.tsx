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

// ─── Utilities ────────────────────────────────────────────────────────────────

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
}

function seededRng(seed: string) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0
  return () => {
    h = Math.imul(2654435761, h) ^ (h >>> 16)
    return (h >>> 0) / 0xffffffff
  }
}

function getMonthlyActivity(repos: PortfolioRepo[], username: string): { month: string; level: number }[] {
  const rand = seededRng(username)
  const now = new Date()
  const months: { month: string; level: number }[] = []

  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const label = d.toLocaleDateString("en-US", { month: "short" })
    let level = Math.floor(rand() * 5)

    for (const repo of repos) {
      const t = new Date(repo.updated_at).getTime()
      const rd = Math.abs(t - d.getTime())
      if (rd < 30 * 86400000) level = Math.min(9, level + 3)
      const tc = new Date(repo.created_at).getTime()
      const rc = Math.abs(tc - d.getTime())
      if (rc < 30 * 86400000) level = Math.min(9, level + 2)
    }

    months.push({ month: label, level: Math.min(9, level) })
  }
  return months
}

function getLanguageStats(repos: PortfolioRepo[]) {
  const counts: Record<string, number> = {}
  for (const r of repos) if (r.primary_language) counts[r.primary_language] = (counts[r.primary_language] || 0) + 1
  const total = repos.length || 1
  return Object.entries(counts)
    .map(([lang, count]) => ({ lang, count, pct: Math.round((count / total) * 100) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
}

function getAllTechs(repos: PortfolioRepo[]): string[] {
  return [
    ...new Set(repos.flatMap(r => [...(r.ast_metadata?.frameworks ?? []), ...(r.ast_metadata?.imports ?? [])]))
  ].slice(0, 16)
}

function extractIntro(mdx: string): string {
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

function resolveContactHref(value: string): string {
  const v = value.trim()
  if (!v) return ""
  if (v.startsWith("http://") || v.startsWith("https://")) return v
  if (v.includes("@") && !v.includes(" ")) return `mailto:${v}`
  return `https://${v}`
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Prompt({ cmd }: { cmd: string }) {
  return (
    <div className="flex items-center gap-2">
      <span style={{ color: "var(--term-green)" }}>❯</span>
      <span style={{ color: "var(--term-dim)" }}>{cmd}</span>
    </div>
  )
}

function Block({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg overflow-hidden mt-2 mb-6"
      style={{ background: "var(--term-card)", border: "1px solid var(--term-border)" }}>
      {children}
    </div>
  )
}

function BlockHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-4 py-2 text-xs" style={{ background: "var(--term-header)", borderBottom: "1px solid var(--term-border)", color: "var(--term-dim)" }}>
      {children}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

interface TerminalTemplateProps {
  data: PortfolioData
  editMode?: boolean
  editCallbacks?: EditCallbacks
}

export function TerminalTemplate({ data, editMode = false, editCallbacks }: TerminalTemplateProps) {
  const totalStars = data.repositories.reduce((s, r) => s + r.stars_count, 0)
  const totalForks = data.repositories.reduce((s, r) => s + r.forks_count, 0)
  const languages = [...new Set(data.repositories.map(r => r.primary_language).filter(Boolean))] as string[]
  const intro = extractIntro(data.mdx_content)
  const about = extractAbout(data.mdx_content)
  const contributions = extractContributions(data.mdx_content)
  const langStats = getLanguageStats(data.repositories)
  const allTechs = getAllTechs(data.repositories)
  const [liveProfile, setLiveProfile] = useState(data.github_profile ?? null)

  useEffect(() => {
    if (editMode) return
    fetch(`/api/contributions/${data.username}`)
      .then(r => r.ok ? r.json() : null)
      .then(fresh => { if (fresh) setLiveProfile(fresh) })
      .catch(() => {})
  }, [data.username, editMode])

  const activity = liveProfile?.contribution_weeks?.length
    ? (() => {
        const weeks = liveProfile!.contribution_weeks
        const now = new Date()
        return Array.from({ length: 12 }, (_, i) => {
          const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1)
          const label = d.toLocaleDateString("en-US", { month: "short" })
          const totalCount = weeks
            .flatMap(w => w.days)
            .filter(day => {
              const dayDate = new Date(day.date)
              return dayDate.getFullYear() === d.getFullYear() && dayDate.getMonth() === d.getMonth()
            })
            .reduce((s, day) => s + day.count, 0)
          return { month: label, level: Math.min(9, Math.floor(totalCount / 3)) }
        })
      })()
    : getMonthlyActivity(data.repositories, data.username)
  const joined = data.repositories[0] ? new Date(data.repositories[0].created_at).getFullYear() : new Date().getFullYear()
  const graphActivities = liveProfile?.contribution_weeks?.length
    ? liveProfile.contribution_weeks.flatMap(w => w.days)
    : null

  return (
    <div className="min-h-[100dvh] font-mono text-sm" style={{ background: "var(--term-bg)", color: "var(--term-fg)" }}>
      <style>{`
        :root {
          --term-bg: #0e1117;
          --term-fg: #e2e8f0;
          --term-card: #161b22;
          --term-header: #1c2128;
          --term-border: #30363d;
          --term-green: #3fb950;
          --term-orange: var(--brand);
          --term-dim: #7d8590;
          --term-bright: #f0f6fc;
        }
        .dark {
          --term-bg: #0e1117;
          --term-fg: #e2e8f0;
          --term-card: #161b22;
          --term-header: #1c2128;
          --term-border: #30363d;
          --term-green: #3fb950;
          --term-dim: #7d8590;
          --term-bright: #f0f6fc;
        }
        @media (prefers-color-scheme: light) {
          :root:not(.dark) {
            --term-bg: #f6f8fa;
            --term-fg: #24292f;
            --term-card: #ffffff;
            --term-header: #f6f8fa;
            --term-border: #d0d7de;
            --term-green: #1a7f37;
            --term-dim: #6e7781;
            --term-bright: #24292f;
          }
        }
        .light {
          --term-bg: #f6f8fa;
          --term-fg: #24292f;
          --term-card: #ffffff;
          --term-header: #f6f8fa;
          --term-border: #d0d7de;
          --term-green: #1a7f37;
          --term-dim: #6e7781;
          --term-bright: #24292f;
        }
      `}</style>

      {/* ── Title bar ─────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-50 flex items-center justify-between px-4 py-2.5"
        style={{ background: "var(--term-header)", borderBottom: "1px solid var(--term-border)" }}>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ background: "#ff5f57" }} />
          <div className="w-3 h-3 rounded-full" style={{ background: "#ffbd2e" }} />
          <div className="w-3 h-3 rounded-full" style={{ background: "#28ca41" }} />
        </div>
        <span className="text-xs" style={{ color: "var(--term-dim)" }}>
          {data.username}@astra ~ portfolio
        </span>
        <span className="text-xs opacity-0">⌘</span>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-2">

        {/* ── whoami ────────────────────────────────────────────────────────── */}
        <Prompt cmd="whoami --verbose" />
        <Block>
          <BlockHeader>user information</BlockHeader>
          <div className="p-5">
            <div className="flex items-start gap-5">
              {data.avatar_url && (
                <Image src={data.avatar_url} alt={data.username} width={64} height={64}
                  className="rounded shrink-0" style={{ border: "2px solid var(--term-border)" }} />
              )}
              <div className="flex-1 min-w-0 space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1.5 text-xs">
                  {[
                    ["login", data.username],
                    ["since", String(joined)],
                    ["stars", totalStars.toLocaleString()],
                    ["forks", totalForks.toLocaleString()],
                    ["repos", String(data.repositories.length)],
                    ...(liveProfile?.followers != null
                      ? [["followers", liveProfile.followers.toLocaleString()]]
                      : []),
                    ...(liveProfile?.total_contributions != null
                      ? [["contributions", liveProfile.total_contributions.toLocaleString()]]
                      : []),
                    ["languages", languages.join(", ")],
                  ].map(([k, v]) => (
                    <div key={k} className="flex items-baseline gap-1.5">
                      <span style={{ color: "var(--term-dim)" }}>{k}:</span>
                      <span style={{ color: "var(--term-green)", fontWeight: 600 }} className="truncate">{v}</span>
                    </div>
                  ))}
                </div>
                <InlineEditable
                  value={intro}
                  onSave={editCallbacks?.onBioSave ?? (() => {})}
                  editMode={editMode}
                  multiline
                  inputClassName="text-xs"
                >
                  <p className="text-xs leading-relaxed" style={{ color: "var(--term-fg)", maxWidth: "60ch" }}>
                    {intro}
                  </p>
                </InlineEditable>
              </div>
            </div>
          </div>
        </Block>

        {/* ── Language stats ─────────────────────────────────────────────────── */}
        <Prompt cmd="git stats --languages" />
        <Block>
          <BlockHeader>language breakdown · {data.repositories.length} repositories</BlockHeader>
          <div className="p-5">
            <LanguageDonut
              languageBytes={liveProfile?.language_bytes ?? {}}
              repoLanguages={data.repositories.map(r => r.primary_language).filter(Boolean) as string[]}
              labelColor="var(--term-bright)"
              dimColor="var(--term-dim)"
            />
          </div>
        </Block>

        {/* ── Tech stack ─────────────────────────────────────────────────────── */}
        {allTechs.length > 0 && (
          <>
            <Prompt cmd="cat stack.json" />
            <Block>
              <BlockHeader>dependencies & frameworks</BlockHeader>
              <div className="p-5">
                <div className="flex flex-wrap gap-1.5">
                  {allTechs.map(t => (
                    <span key={t} className="rounded px-2 py-0.5 text-xs font-mono"
                      style={{ background: "var(--term-header)", border: "1px solid var(--term-border)", color: "var(--term-green)" }}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </Block>
          </>
        )}

        {/* ── Activity ───────────────────────────────────────────────────────── */}
        <Prompt cmd="git log --activity --contributions" />
        <Block>
          <BlockHeader>contribution activity{liveProfile ? <span style={{ color: "var(--term-green)", marginLeft: "1ch" }}>● live</span> : ""}</BlockHeader>
          <div className="p-5">
            {graphActivities ? (
              <ContributionGraph
                data={graphActivities}
                blockSize={11}
                blockMargin={3}
                blockRadius={2}
                fontSize={10}
                totalCount={liveProfile?.total_contributions}
                className="w-full"
                style={{ color: "var(--term-dim)" }}
              >
                <ContributionGraphCalendar className="overflow-x-auto">
                  {({ activity: act, dayIndex, weekIndex }) => (
                    <ContributionGraphBlock
                      key={`${weekIndex}-${dayIndex}`}
                      activity={act}
                      dayIndex={dayIndex}
                      weekIndex={weekIndex}
                      className={undefined}
                      style={{
                        fill: act.level === 0
                          ? "var(--term-border)"
                          : `color-mix(in oklch, var(--term-green) ${act.level * 25}%, var(--term-card))`
                      }}
                    />
                  )}
                </ContributionGraphCalendar>
                <ContributionGraphFooter className="mt-2 text-[10px]">
                  <ContributionGraphTotalCount>
                    {({ totalCount, year }) => (
                      <span style={{ color: "var(--term-dim)" }}>
                        {totalCount.toLocaleString()} contributions in {year}
                      </span>
                    )}
                  </ContributionGraphTotalCount>
                  <ContributionGraphLegend className="ml-auto">
                    {({ level }) => (
                      <svg width={11} height={11} key={level}>
                        <rect
                          width={11} height={11} rx={2}
                          style={{
                            fill: level === 0
                              ? "var(--term-border)"
                              : `color-mix(in oklch, var(--term-green) ${level * 25}%, var(--term-card))`
                          }}
                        />
                      </svg>
                    )}
                  </ContributionGraphLegend>
                </ContributionGraphFooter>
              </ContributionGraph>
            ) : (
              <div className="space-y-2">
                {activity.map(({ month, level }) => {
                  const bar = Math.round(level * 4)
                  const empty = 36 - bar
                  return (
                    <div key={month} className="flex items-center gap-3 text-xs">
                      <span className="w-8 shrink-0 text-right" style={{ color: "var(--term-dim)" }}>{month}</span>
                      <span className="font-mono tracking-tighter" style={{ color: "var(--term-green)" }}>
                        {"█".repeat(bar)}
                        <span style={{ color: "var(--term-border)" }}>{"░".repeat(empty)}</span>
                      </span>
                      <span style={{ color: "var(--term-dim)" }} className="tabular-nums">{level * 10}%</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </Block>

        {/* ── Projects ────────────────────────────────────────────────────────── */}
        <Prompt cmd={`ls -la ./projects/  # ${data.repositories.length} found`} />
        <div className="space-y-3 mb-2">
          {data.repositories.map(repo => (
            <TerminalRepoBlock
              key={repo.id}
              repo={repo}
              editMode={editMode}
              onProjectSave={editCallbacks?.onProjectSave}
            />
          ))}
        </div>

        {/* ── Open Source ─────────────────────────────────────────────────────── */}
        {contributions.length > 0 && (
          <>
            <Prompt cmd="gh pr list --state=merged --author=@me" />
            <Block>
              <BlockHeader>merged pull requests · external repositories</BlockHeader>
              <div className="divide-y" style={{ borderColor: "var(--term-border)" }}>
                {contributions.map((c, i) => (
                  <div key={i} className="px-4 py-3 text-xs flex items-start gap-3">
                    <span style={{ color: "var(--term-green)" }} className="shrink-0 mt-0.5">✓</span>
                    <div className="flex-1 min-w-0">
                      <a href={c.url} target="_blank" rel="noopener noreferrer"
                        className="font-medium hover:underline underline-offset-2 leading-snug block"
                        style={{ color: "var(--term-bright)" }}>
                        {c.title}
                      </a>
                      <span style={{ color: "var(--term-dim)" }}>{c.repo} · merged {c.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Block>
          </>
        )}

        {/* ── About ───────────────────────────────────────────────────────────── */}
        {about && (
          <>
            <Prompt cmd="cat ./about.md" />
            <Block>
              <div className="p-5 text-xs leading-relaxed" style={{ color: "var(--term-fg)" }}>
                <InlineEditable
                  value={about}
                  onSave={editCallbacks?.onAboutSave ?? (() => {})}
                  editMode={editMode}
                  multiline
                  inputClassName="text-xs"
                >
                  <MdxRenderer content={about} />
                </InlineEditable>
              </div>
            </Block>
          </>
        )}

        {/* ── Footer prompt ────────────────────────────────────────────────────── */}
        <div className="pt-4 pb-8 space-y-2">
          {editMode ? (
            <div className="flex items-center gap-2">
              <span style={{ color: "var(--term-green)" }}>❯</span>
              <span className="text-xs" style={{ color: "var(--term-dim)" }}>contact:</span>
              <InlineEditable
                value={data.theme_config.contact_url ?? ""}
                onSave={editCallbacks?.onContactSave ?? (() => {})}
                editMode={editMode}
                multiline={false}
                inputClassName="text-xs bg-transparent"
              >
                <span className="text-xs" style={{ color: "var(--term-green)" }}>
                  {data.theme_config.contact_url || <span style={{ opacity: 0.5 }}>+ add contact link</span>}
                </span>
              </InlineEditable>
            </div>
          ) : data.theme_config.contact_url ? (
            <div className="flex items-center gap-2">
              <span style={{ color: "var(--term-green)" }}>❯</span>
              <span className="text-xs" style={{ color: "var(--term-dim)" }}>contact:</span>
              <a
                href={resolveContactHref(data.theme_config.contact_url)}
                target={data.theme_config.contact_url.includes("@") && !data.theme_config.contact_url.startsWith("http") ? undefined : "_blank"}
                rel="noopener noreferrer"
                className="text-xs hover:underline underline-offset-2"
                style={{ color: "var(--term-green)" }}
              >
                {data.theme_config.contact_url}
              </a>
            </div>
          ) : null}
          <div className="flex items-center gap-2 text-xs" style={{ color: "var(--term-dim)" }}>
            <span style={{ color: "var(--term-green)" }}>❯</span>
            <span>
              Generated by{" "}
              <a href="/" style={{ color: "var(--term-green)" }} className="hover:underline underline-offset-2">astra</a>
              {data.last_synced_at && (
                <> · synced {new Date(data.last_synced_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</>
              )}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span style={{ color: "var(--term-green)" }}>❯</span>
            <span className="animate-pulse text-xs" style={{ color: "var(--term-green)" }}>█</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── TerminalRepoBlock ────────────────────────────────────────────────────────

interface TerminalRepoBlockProps {
  repo: PortfolioRepo
  editMode?: boolean
  onProjectSave?: (repoId: string, newSummary: string) => void
}

function TerminalRepoBlock({ repo, editMode = false, onProjectSave }: TerminalRepoBlockProps) {
  const complexity = repo.ast_metadata?.complexity_score ?? 0
  const lastUpdated = new Date(repo.updated_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })
  const year = new Date(repo.created_at).getFullYear()
  const filled = complexity > 0 ? Math.round(complexity / 10) : 0
  const allTech = [...new Set([...(repo.ast_metadata?.frameworks ?? []), ...(repo.ast_metadata?.imports ?? [])])].slice(0, 6)

  return (
    <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--term-border)" }}>
      {/* Header */}
      <div className="flex items-center justify-between gap-4 px-4 py-2.5"
        style={{ background: "var(--term-header)", borderBottom: "1px solid var(--term-border)" }}>
        <div className="flex items-center gap-3 min-w-0">
          <a href={repo.html_url ?? "#"} target="_blank" rel="noopener noreferrer"
            className="font-bold text-sm hover:underline underline-offset-2 shrink-0"
            style={{ color: "var(--term-green)" }}>
            {repo.name}
          </a>
          {repo.primary_language && (
            <span className="text-xs shrink-0 flex items-center gap-1.5" style={{ color: "var(--term-dim)" }}>
              <span className="w-2 h-2 rounded-full" style={{ background: LANG_COLORS[repo.primary_language] ?? "#888" }} />
              {repo.primary_language}
            </span>
          )}
          {repo.description && (
            <span className="text-xs truncate hidden sm:block" style={{ color: "var(--term-dim)" }}>
              # {repo.description}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 text-xs shrink-0" style={{ color: "var(--term-dim)" }}>
          {repo.stars_count > 0 && (
            <span style={{ color: "var(--term-green)" }}>★{repo.stars_count.toLocaleString()}</span>
          )}
          {repo.forks_count > 0 && <span>⑂{repo.forks_count}</span>}
          {repo.homepage && (
            <a href={repo.homepage} target="_blank" rel="noopener noreferrer"
              className="hover:underline underline-offset-2" style={{ color: "var(--brand)" }}>
              [live]
            </a>
          )}
          <a href={repo.html_url ?? "#"} target="_blank" rel="noopener noreferrer"
            className="hover:underline underline-offset-2" style={{ color: "var(--term-dim)" }}>
            [gh]
          </a>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-4 space-y-3" style={{ background: "var(--term-card)" }}>
        {repo.ai_summary && (
          <InlineEditable
            value={repo.ai_summary}
            onSave={(v) => onProjectSave?.(repo.id, v)}
            editMode={editMode}
            multiline
            inputClassName="text-xs"
          >
            <p className="text-xs leading-relaxed" style={{ color: "var(--term-fg)" }}>{repo.ai_summary}</p>
          </InlineEditable>
        )}

        {/* Key-value pairs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-1 text-xs">
          {[
            ["created", String(year)],
            ["updated", lastUpdated],
            ...(repo.ast_metadata ? [
              ["functions", String(repo.ast_metadata.function_count)],
              ["classes", String(repo.ast_metadata.class_count)],
            ] : []),
          ].map(([k, v]) => (
            <div key={k} className="flex items-center gap-1.5">
              <span style={{ color: "var(--term-dim)" }}>{k}:</span>
              <span style={{ color: "var(--term-fg)" }}>{v}</span>
            </div>
          ))}
        </div>

        {/* Complexity bar */}
        {complexity > 0 && (
          <div className="flex items-center gap-3 text-xs">
            <span className="shrink-0" style={{ color: "var(--term-dim)" }}>complexity:</span>
            <span className="font-mono tracking-tighter">
              <span style={{ color: "var(--brand)" }}>{"█".repeat(filled)}</span>
              <span style={{ color: "var(--term-border)" }}>{"░".repeat(10 - filled)}</span>
            </span>
            <span style={{ color: "var(--term-dim)" }} className="tabular-nums">{complexity}/100</span>
          </div>
        )}

        {/* Stack */}
        {allTech.length > 0 && (
          <div className="flex items-start gap-2 text-xs flex-wrap">
            <span className="shrink-0" style={{ color: "var(--term-dim)" }}>stack:</span>
            <div className="flex flex-wrap gap-1">
              {allTech.map(t => (
                <span key={t} className="rounded px-1.5 py-px font-mono"
                  style={{ background: "var(--term-header)", border: "1px solid var(--term-border)", color: "var(--term-green)" }}>
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Exports */}
        {(repo.ast_metadata?.exported_symbols ?? []).length > 0 && (
          <div className="flex items-start gap-2 text-xs">
            <span className="shrink-0" style={{ color: "var(--term-dim)" }}>exports:</span>
            <span style={{ color: "var(--term-green)", opacity: 0.8 }}>
              {repo.ast_metadata!.exported_symbols.slice(0, 6).join(", ")}
              {repo.ast_metadata!.exported_symbols.length > 6 && ` +${repo.ast_metadata!.exported_symbols.length - 6}`}
            </span>
          </div>
        )}

        {/* Topics */}
        {repo.topics.length > 0 && (
          <div className="flex items-start gap-2 text-xs">
            <span className="shrink-0" style={{ color: "var(--term-dim)" }}>topics:</span>
            <span style={{ color: "var(--term-dim)" }}>{repo.topics.join(", ")}</span>
          </div>
        )}
      </div>
    </div>
  )
}
