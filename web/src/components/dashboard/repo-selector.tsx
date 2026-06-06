"use client"

import { useMemo, useState } from "react"
import type { GithubRepo, TemplateId } from "@/types/portfolio"
import { TemplatePicker } from "@/components/portfolio/template-selector"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const PAGE_SIZE = 10

type SortKey = "updated" | "stars" | "name"

interface RepoSelectorProps {
  repos: GithubRepo[]
  onGenerate: (repoIds: number[], template: TemplateId) => Promise<void>
}

const LANG_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f7df1e",
  Python: "#3572A5",
  Rust: "#dea584",
  Go: "#00ADD8",
  Ruby: "#701516",
  Java: "#b07219",
  "C++": "#f34b7d",
  Swift: "#F05138",
  Kotlin: "#A97BFF",
}

const SORT_LABELS: Record<SortKey, string> = {
  updated: "Recently updated",
  stars: "Most stars",
  name: "Name A–Z",
}

export function RepoSelector({ repos, onGenerate }: RepoSelectorProps) {
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [template, setTemplate] = useState<TemplateId>("void")
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState<SortKey>("updated")
  const [page, setPage] = useState(0)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = q
      ? repos.filter(
          (r) =>
            r.name.toLowerCase().includes(q) ||
            r.description?.toLowerCase().includes(q) ||
            r.language?.toLowerCase().includes(q)
        )
      : repos

    return [...list].sort((a, b) => {
      if (sort === "stars") return b.stargazers_count - a.stargazers_count
      if (sort === "name") return a.name.localeCompare(b.name)
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    })
  }, [repos, search, sort])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const safePage = Math.min(page, Math.max(0, totalPages - 1))
  const pageRepos = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE)

  function handleSearch(q: string) {
    setSearch(q)
    setPage(0)
  }

  function handleSort(s: SortKey) {
    setSort(s)
    setPage(0)
  }

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleGenerate() {
    if (selected.size === 0) return
    setLoading(true)
    try {
      await onGenerate(Array.from(selected), template)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        {/* Header row */}
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-foreground">Select repositories</h2>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              {selected.size > 0 ? (
                <span className="font-medium text-foreground">{selected.size}</span>
              ) : (
                "0"
              )}{" "}
              selected
            </span>

            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={safePage === 0}
                  aria-label="Previous page"
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path
                      d="M6.5 2L3.5 5L6.5 8"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </Button>
                <span className="w-12 text-center text-xs tabular-nums text-muted-foreground">
                  {safePage + 1} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={safePage >= totalPages - 1}
                  aria-label="Next page"
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path
                      d="M3.5 2L6.5 5L3.5 8"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Search + sort row */}
        <div className="mb-3 flex items-center gap-2">
          <div className="relative flex-1">
            <svg
              width="13"
              height="13"
              viewBox="0 0 13 13"
              fill="none"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.25" />
              <path
                d="M8.5 8.5L11 11"
                stroke="currentColor"
                strokeWidth="1.25"
                strokeLinecap="round"
              />
            </svg>
            <Input
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search repos…"
              className="pl-8 pr-8 text-xs"
            />
            {search && (
              <button
                onClick={() => handleSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path
                    d="M2 2L8 8M8 2L2 8"
                    stroke="currentColor"
                    strokeWidth="1.25"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 whitespace-nowrap text-xs">
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 11 11"
                  fill="none"
                  className="shrink-0 text-muted-foreground"
                >
                  <path
                    d="M1 3h9M3 5.5h5M5 8h1"
                    stroke="currentColor"
                    strokeWidth="1.25"
                    strokeLinecap="round"
                  />
                </svg>
                {SORT_LABELS[sort]}
                <svg width="9" height="9" viewBox="0 0 9 9" fill="none" className="text-muted-foreground">
                  <path
                    d="M1.5 3L4.5 6.5L7.5 3"
                    stroke="currentColor"
                    strokeWidth="1.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                <DropdownMenuItem
                  key={k}
                  onClick={() => handleSort(k)}
                  className="justify-between text-xs"
                >
                  {SORT_LABELS[k]}
                  {sort === k && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path
                        d="M2 5L4.5 7.5L8.5 2.5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Repo rows */}
        {pageRepos.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">
            No repositories match your search.
          </p>
        ) : (
          <div className="space-y-1.5">
            {pageRepos.map((repo) => {
              const isSelected = selected.has(repo.id)
              return (
                <div
                  key={repo.id}
                  role="checkbox"
                  aria-checked={isSelected}
                  tabIndex={0}
                  onClick={() => toggle(repo.id)}
                  onKeyDown={(e) =>
                    (e.key === " " || e.key === "Enter") && toggle(repo.id)
                  }
                  className={`group flex cursor-pointer items-start gap-4 rounded-xl border p-4 text-left transition-all ${
                    isSelected
                      ? "border-brand/40 bg-brand-muted"
                      : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"
                  }`}
                >
                  <Checkbox
                    checked={isSelected}
                    className="pointer-events-none mt-0.5 shrink-0"
                    tabIndex={-1}
                  />

                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{repo.name}</span>

                      {repo.private && (
                        <Badge variant="outline" className="px-1.5 py-0.5 text-[10px]">
                          private
                        </Badge>
                      )}

                      {repo.language && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <span
                            className="inline-block h-2 w-2 shrink-0 rounded-full"
                            style={{ background: LANG_COLORS[repo.language] ?? "currentColor" }}
                          />
                          {repo.language}
                        </span>
                      )}

                      {repo.stargazers_count > 0 && (
                        <span className="text-xs text-muted-foreground">
                          ★ {repo.stargazers_count}
                        </span>
                      )}

                      <span className="ml-auto text-[10px] text-muted-foreground/60">
                        {formatRelative(repo.updated_at)}
                      </span>
                    </div>

                    {repo.description && (
                      <p className="line-clamp-2 text-xs leading-snug text-muted-foreground">
                        {repo.description}
                      </p>
                    )}

                    {repo.topics.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {repo.topics.slice(0, 4).map((t) => (
                          <Badge
                            key={t}
                            variant="outline"
                            className="rounded-full px-2 py-0.5 text-[10px] text-muted-foreground"
                          >
                            {t}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Bottom pagination */}
        {totalPages > 1 && (
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {safePage * PAGE_SIZE + 1}–{Math.min((safePage + 1) * PAGE_SIZE, filtered.length)} of{" "}
              {filtered.length} repos
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-6 w-6"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={safePage === 0}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path
                    d="M6.5 2L3.5 5L6.5 8"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-6 w-6"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={safePage >= totalPages - 1}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path
                    d="M3.5 2L6.5 5L3.5 8"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Template picker */}
      <div>
        <h2 className="mb-4 text-sm font-medium text-foreground">Choose a template</h2>
        <TemplatePicker value={template} onChange={setTemplate} />
      </div>

      {/* Generate CTA */}
      <button
        onClick={handleGenerate}
        disabled={selected.size === 0 || loading}
        className="w-full rounded-full bg-foreground py-3 text-sm font-semibold text-background transition-all hover:bg-foreground/90 hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading
          ? "Starting generation…"
          : selected.size === 0
          ? "Select at least 1 repository"
          : `Generate portfolio from ${selected.size} repo${selected.size > 1 ? "s" : ""}`}
      </button>
    </div>
  )
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.floor(months / 12)}y ago`
}
