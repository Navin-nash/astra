"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import type { PortfolioData, TemplateId } from "@/types/portfolio"
import { savePortfolioChanges, togglePortfolioPublished } from "./actions"
import { VoidTemplate } from "@/components/portfolio/templates/void"
import { MinimalTemplate } from "@/components/portfolio/templates/minimal"
import { TerminalTemplate } from "@/components/portfolio/templates/terminal"

// ── MDX helpers ───────────────────────────────────────────────────────────────

const OVERRIDE_MARKER = "<!-- project-summaries:"

function parseProjectOverrides(mdx: string): Record<string, string> {
  const start = mdx.indexOf(OVERRIDE_MARKER)
  if (start === -1) return {}
  const end = mdx.indexOf("-->", start)
  if (end === -1) return {}
  try {
    return JSON.parse(mdx.slice(start + OVERRIDE_MARKER.length, end).trim())
  } catch {
    return {}
  }
}

function serializeProjectOverrides(mdx: string, overrides: Record<string, string>): string {
  const start = mdx.indexOf(OVERRIDE_MARKER)
  let base = mdx
  if (start !== -1) {
    const end = mdx.indexOf("-->", start)
    if (end !== -1) base = (mdx.slice(0, start) + mdx.slice(end + 3)).trimEnd()
  }
  if (Object.keys(overrides).length === 0) return base.trim()
  return `${base.trim()}\n\n${OVERRIDE_MARKER} ${JSON.stringify(overrides)} -->`
}

function replaceBioInMdx(mdx: string, newBio: string): string {
  const lines = mdx.split("\n")
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim()
    if (!t) continue
    if (t.startsWith("#") || t.startsWith("-") || t.startsWith("*") || t.startsWith(">")) continue
    lines[i] = newBio
    return lines.join("\n")
  }
  return newBio + "\n\n" + mdx
}

function replaceAboutInMdx(mdx: string, newAbout: string): string {
  const idx = mdx.search(/^#{1,2}\s*(about|bio)/im)
  if (idx === -1) return mdx
  const headerMatch = mdx.slice(idx).match(/^#{1,2}[^\n]+\n/)
  if (!headerMatch) return mdx
  const afterHeader = idx + headerMatch[0].length
  const rest = mdx.slice(afterHeader)
  const nextSection = rest.search(/^#{1,2}\s/m)
  if (nextSection === -1) return mdx.slice(0, afterHeader) + newAbout
  return mdx.slice(0, afterHeader) + newAbout + "\n\n" + rest.slice(nextSection)
}

// ── Edit callbacks interface ───────────────────────────────────────────────────

export interface EditCallbacks {
  onBioSave: (newBio: string) => void
  onAboutSave: (newAbout: string) => void
  onProjectSave: (repoId: string, newSummary: string) => void
  onNameSave: (newName: string) => void
  onContactSave: (newContact: string) => void
}

// ── Template renderer ─────────────────────────────────────────────────────────

function RenderTemplate({
  data,
  editMode,
  editCallbacks,
}: {
  data: PortfolioData
  editMode: boolean
  editCallbacks: EditCallbacks
}) {
  switch (data.theme_config.template) {
    case "minimal":
      return <MinimalTemplate data={data} editMode={editMode} editCallbacks={editCallbacks} />
    case "terminal":
      return <TerminalTemplate data={data} editMode={editMode} editCallbacks={editCallbacks} />
    default:
      return <VoidTemplate data={data} editMode={editMode} editCallbacks={editCallbacks} />
  }
}

// ── Template chip bar ─────────────────────────────────────────────────────────

const TEMPLATES: { id: TemplateId; label: string }[] = [
  { id: "void", label: "Void" },
  { id: "minimal", label: "Minimal" },
  { id: "terminal", label: "Terminal" },
]

// ── Main ──────────────────────────────────────────────────────────────────────

interface PreviewClientProps {
  initialData: PortfolioData
  isPublished: boolean
}

export function PreviewClient({ initialData, isPublished }: PreviewClientProps) {
  const router = useRouter()

  const [mdxContent, setMdxContent] = useState(initialData.mdx_content)
  const [template, setTemplate] = useState<TemplateId>(initialData.theme_config.template)
  const [displayName, setDisplayName] = useState(
    initialData.theme_config.display_name ?? initialData.username
  )
  const [contactUrl, setContactUrl] = useState(
    initialData.theme_config.contact_url ?? ""
  )
  const [projectEdits, setProjectEdits] = useState<Record<string, string>>(
    () => parseProjectOverrides(initialData.mdx_content)
  )
  const [published, setPublished] = useState(isPublished)
  const [editMode, setEditMode] = useState(false)

  const [isSaving, startSave] = useTransition()
  const [isPublishing, startPublish] = useTransition()
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  // Data with overrides applied
  const data: PortfolioData = {
    ...initialData,
    mdx_content: mdxContent,
    theme_config: { ...initialData.theme_config, template, display_name: displayName, contact_url: contactUrl },
    repositories: initialData.repositories.map((repo) => ({
      ...repo,
      ai_summary: projectEdits[repo.id] ?? repo.ai_summary,
    })),
  }

  const hasChanges =
    mdxContent !== initialData.mdx_content ||
    template !== initialData.theme_config.template ||
    displayName !== (initialData.theme_config.display_name ?? initialData.username) ||
    Object.keys(projectEdits).length > 0 ||
    contactUrl !== (initialData.theme_config.contact_url ?? "")

  // Inline edit callbacks — templates manage their own edit UI, just save here
  const editCallbacks: EditCallbacks = {
    onBioSave: (newBio) => setMdxContent((prev) => replaceBioInMdx(prev, newBio)),
    onAboutSave: (newAbout) => setMdxContent((prev) => replaceAboutInMdx(prev, newAbout)),
    onProjectSave: (repoId, newSummary) =>
      setProjectEdits((prev) => ({ ...prev, [repoId]: newSummary })),
    onNameSave: (newName) => setDisplayName(newName.trim() || initialData.username),
    onContactSave: (newContact) => setContactUrl(newContact.trim()),
  }

  const handleSave = () => {
    startSave(async () => {
      try {
        const finalMdx = serializeProjectOverrides(mdxContent, projectEdits)
        await savePortfolioChanges(finalMdx, { template, display_name: displayName, contact_url: contactUrl })
        setSaveMessage("Saved")
        setTimeout(() => setSaveMessage(null), 2000)
      } catch {
        setSaveMessage("Failed to save")
        setTimeout(() => setSaveMessage(null), 3000)
      }
    })
  }

  const handlePublishToggle = () => {
    startPublish(async () => {
      try {
        await togglePortfolioPublished(!published)
        setPublished((p) => !p)
      } catch {}
    })
  }

  return (
    <div className="relative min-h-dvh">
      {/* ── Top bar ──────────────────────────────────────────────────────────── */}
      <div className="fixed top-0 left-0 right-0 z-50 h-12 flex items-center justify-between px-4 bg-background/95 backdrop-blur-sm border-b border-border gap-3">
        {/* Left */}
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M19 12H5M5 12l7-7M5 12l7 7" />
          </svg>
          Dashboard
        </button>

        {/* Right */}
        <div className="flex items-center gap-2 shrink-0">
          {saveMessage && (
            <span
              className={`text-xs ${
                saveMessage === "Saved"
                  ? "text-green-600 dark:text-green-400"
                  : "text-destructive"
              }`}
            >
              {saveMessage}
            </span>
          )}

          <button
            onClick={() => setEditMode((v) => !v)}
            className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
              editMode
                ? "bg-foreground text-background border-foreground"
                : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
            }`}
          >
            {editMode ? "Close editor" : "Edit"}
          </button>

          {hasChanges && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="rounded-full bg-foreground text-background px-3 py-1 text-xs font-medium hover:bg-foreground/90 transition-colors disabled:opacity-40"
            >
              {isSaving ? "Saving…" : "Save"}
            </button>
          )}

          <button
            onClick={handlePublishToggle}
            disabled={isPublishing}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              published
                ? "border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                : "bg-foreground text-background hover:bg-foreground/90"
            }`}
          >
            {isPublishing ? "…" : published ? "Unpublish" : "Publish"}
          </button>
        </div>
      </div>

      {/* ── Edit toolbar (template switcher + hint) ───────────────────────────── */}
      <div
        className={`fixed top-12 left-0 right-0 z-40 transition-all duration-200 overflow-hidden ${
          editMode ? "h-10 opacity-100" : "h-0 opacity-0 pointer-events-none"
        }`}
        style={{ background: "color-mix(in oklch, var(--brand) 6%, var(--background))" }}
      >
        <div className="h-10 flex items-center justify-between px-4 border-b border-brand/15">
          {/* Template chips */}
          <div className="flex items-center gap-3">
            <span className="text-[10px] uppercase tracking-widest text-brand/60 font-semibold">
              Template
            </span>
            <div className="flex items-center gap-0.5 rounded-full border border-brand/20 bg-background/60 p-0.5">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTemplate(t.id)}
                  className={`rounded-full px-3 py-0.5 text-[11px] font-medium transition-colors ${
                    template === t.id
                      ? "bg-foreground text-background shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          {/* Hint */}
          <p className="text-[11px] text-brand/70 hidden sm:block">
            Click any section on the portfolio to edit it inline
          </p>
        </div>
      </div>

      {/* ── Portfolio ─────────────────────────────────────────────────────────── */}
      <div style={{ paddingTop: editMode ? "5.5rem" : "3rem" }} className="transition-[padding] duration-200">
        <RenderTemplate
          data={data}
          editMode={editMode}
          editCallbacks={editCallbacks}
        />
      </div>
    </div>
  )
}
