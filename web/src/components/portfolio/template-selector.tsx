import type { PortfolioData, TemplateId } from "@/types/portfolio"
import { VoidTemplate } from "./templates/void"
import { MinimalTemplate } from "./templates/minimal"
import { TerminalTemplate } from "./templates/terminal"

export function PortfolioTemplate({ data }: { data: PortfolioData }) {
  const id: TemplateId = data.theme_config?.template ?? "void"

  switch (id) {
    case "minimal":
      return <MinimalTemplate data={data} />
    case "terminal":
      return <TerminalTemplate data={data} />
    case "void":
    default:
      return <VoidTemplate data={data} />
  }
}

// Kept for backwards compat — public portfolio pages use PortfolioTemplate (no edit)
export { PortfolioTemplate as default }

// Picker UI used in the dashboard
interface TemplatePickerProps {
  value: TemplateId
  onChange: (id: TemplateId) => void
}

const TEMPLATES: { id: TemplateId; label: string; description: string; preview: string }[] = [
  {
    id: "void",
    label: "Void",
    description: "Space-black background, brand accents, asymmetric layout",
    preview: "bg-[var(--void)] border-brand/20",
  },
  {
    id: "minimal",
    label: "Minimal",
    description: "Clean typography, generous whitespace, no distractions",
    preview: "bg-background border-border",
  },
  {
    id: "terminal",
    label: "Terminal",
    description: "Monospace, command-line aesthetic, green accents",
    preview: "bg-card border-green-500/20",
  },
]

export function TemplatePicker({ value, onChange }: TemplatePickerProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {TEMPLATES.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`group relative rounded-xl border-2 p-4 text-left transition-all ${
            value === t.id
              ? "border-brand ring-2 ring-brand/20"
              : "border-border hover:border-muted-foreground/30"
          }`}
        >
          <div
            className={`mb-3 h-12 rounded-lg border ${t.preview} flex items-center justify-center`}
          >
            <span className="text-xs font-mono opacity-50">{t.id}</span>
          </div>

          <p className="font-medium text-sm text-foreground">{t.label}</p>
          <p className="mt-0.5 text-xs text-muted-foreground leading-snug">
            {t.description}
          </p>

          {value === t.id && (
            <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-brand flex items-center justify-center">
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                <path d="M1.5 4L3 5.5L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          )}
        </button>
      ))}
    </div>
  )
}
