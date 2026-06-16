import Link from "next/link"

const templates = [
  {
    id: "void",
    label: "Void",
    description: "Dark, cosmic — space-black with brand accents",
    colors: ["#050509", "#EB5B00", "#1e1e2e"],
  },
  {
    id: "minimal",
    label: "Minimal",
    description: "Clean, light — warm white with no noise",
    colors: ["#fafaf9", "#0f172a", "#e2e2dc"],
  },
  {
    id: "terminal",
    label: "Terminal",
    description: "Hacker aesthetic — green-on-black monospace",
    colors: ["#0a0e0a", "#4ade80", "#1a2a1a"],
  },
]

export default function PreviewIndex() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center px-6 py-16">
      <div className="max-w-2xl w-full">
        <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-4">
          Astra / Templates
        </p>
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Portfolio Templates
        </h1>
        <p className="text-sm text-muted-foreground mb-12">
          Click any template to preview it with sample data.
        </p>

        <div className="space-y-3">
          {templates.map((t) => (
            <Link
              key={t.id}
              href={`/preview/${t.id}`}
              className="group flex items-center gap-5 rounded-xl border border-border bg-card px-5 py-4 transition-all hover:border-muted-foreground/30 hover:bg-muted/40"
            >
              {/* Color swatches — intentionally fixed to show the template's actual palette */}
              <div className="flex gap-1.5 shrink-0">
                {t.colors.map((c, i) => (
                  <div
                    key={i}
                    className="w-5 h-5 rounded-full border border-border"
                    style={{ background: c }}
                  />
                ))}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-foreground">{t.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{t.description}</div>
              </div>
              <svg
                className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-foreground"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M7 17L17 7M17 7H7M17 7V17" />
              </svg>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
