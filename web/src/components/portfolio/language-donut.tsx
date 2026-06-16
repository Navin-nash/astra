"use client"

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
  HTML: "#e44b23",
  CSS: "#563d7c",
  Vue: "#4FC08D",
  Svelte: "#FF3E00",
  Scala: "#c22d40",
  Haskell: "#5e5086",
  Elixir: "#6e4a7e",
  Clojure: "#db5855",
  R: "#198ce7",
  MATLAB: "#e16737",
  Lua: "#000080",
  Zig: "#ec915c",
  Nim: "#ffc200",
  OCaml: "#3be133",
  "F#": "#b845fc",
  Solidity: "#aa6746",
  SQL: "#e38c00",
}

function langColor(name: string, index: number): string {
  if (LANG_COLORS[name]) return LANG_COLORS[name]
  // Deterministic fallback color from name hash
  let h = 0
  for (let i = 0; i < name.length; i++) h = (Math.imul(31, h) + name.charCodeAt(i)) | 0
  const hue = ((h >>> 0) % 360)
  return `hsl(${hue}, 65%, 55%)`
}

interface DonutSlice {
  name: string
  pct: number
  color: string
  bytes: number
}

function buildSlices(languageBytes: Record<string, number>, maxSlices = 5): DonutSlice[] {
  const total = Object.values(languageBytes).reduce((s, v) => s + v, 0)
  if (total === 0) return []

  const sorted = Object.entries(languageBytes)
    .sort((a, b) => b[1] - a[1])

  const top = sorted.slice(0, maxSlices)
  const otherBytes = sorted.slice(maxSlices).reduce((s, [, v]) => s + v, 0)

  const slices: DonutSlice[] = top.map(([name, bytes], i) => ({
    name,
    bytes,
    pct: Math.round((bytes / total) * 1000) / 10,
    color: langColor(name, i),
  }))

  if (otherBytes > 0) {
    slices.push({
      name: "Other",
      bytes: otherBytes,
      pct: Math.round((otherBytes / total) * 1000) / 10,
      color: "#6b7280",
    })
  }

  return slices
}

interface LanguageDonutProps {
  languageBytes: Record<string, number>
  /** Repos-per-language fallback (used when no byte data) */
  repoLanguages?: string[]
  className?: string
  labelColor?: string
  dimColor?: string
  maxSlices?: number
}

export function LanguageDonut({
  languageBytes,
  repoLanguages,
  className,
  labelColor = "currentColor",
  dimColor = "var(--muted-foreground, #888)",
  maxSlices = 5,
}: LanguageDonutProps) {
  // Prefer byte data; fall back to repo counts
  const byteData =
    Object.keys(languageBytes).length > 0
      ? languageBytes
      : Object.fromEntries(
          (repoLanguages ?? []).reduce<[string, number][]>((acc, lang) => {
            if (!lang) return acc
            const existing = acc.find(([l]) => l === lang)
            if (existing) existing[1]++
            else acc.push([lang, 1])
            return acc
          }, [])
        )

  const slices = buildSlices(byteData, maxSlices)
  if (slices.length === 0) return null

  const R = 38
  const STROKE = 18
  const CX = 52
  const CY = 52
  const C = 2 * Math.PI * R
  const GAP = 2 // gap between segments in px

  // Compute cumulative offsets; start from 12 o'clock (-90°)
  let cumulative = 0
  const segments = slices.map((slice) => {
    const fraction = slice.pct / 100
    const len = Math.max(0, fraction * C - GAP)
    const offset = -(cumulative * C) // negative = clockwise from top
    cumulative += fraction
    return { ...slice, len, offset }
  })

  return (
    <div className={`flex items-center gap-6 ${className ?? ""}`}>
      {/* Donut SVG */}
      <svg
        viewBox={`0 0 ${CX * 2} ${CY * 2}`}
        width={104}
        height={104}
        className="shrink-0 -rotate-90"
        aria-hidden
      >
        {/* Background ring */}
        <circle
          cx={CX} cy={CY} r={R}
          fill="none"
          strokeWidth={STROKE}
          stroke="currentColor"
          className="text-border opacity-40"
        />
        {segments.map((seg) => (
          <circle
            key={seg.name}
            cx={CX} cy={CY} r={R}
            fill="none"
            strokeWidth={STROKE}
            stroke={seg.color}
            strokeDasharray={`${seg.len} ${C}`}
            strokeDashoffset={seg.offset}
            strokeLinecap="butt"
          />
        ))}
      </svg>

      {/* Legend */}
      <div className="flex-1 min-w-0 space-y-2">
        {slices.map((slice) => (
          <div key={slice.name} className="flex items-center gap-2 text-xs">
            <span
              className="w-2.5 h-2.5 rounded-sm shrink-0"
              style={{ background: slice.color }}
            />
            <span className="flex-1 truncate font-medium" style={{ color: labelColor }}>
              {slice.name}
            </span>
            <span className="tabular-nums shrink-0" style={{ color: dimColor }}>
              {slice.pct.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
