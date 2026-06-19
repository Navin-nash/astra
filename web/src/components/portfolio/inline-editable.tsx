"use client"

import type React from "react"
import { useState, useEffect } from "react"

interface InlineEditableProps {
  value: string
  onSave: (newValue: string) => void
  editMode: boolean
  multiline?: boolean
  wrapperClassName?: string
  inputClassName?: string
  children: React.ReactNode
}

export function InlineEditable({
  value,
  onSave,
  editMode,
  multiline = true,
  wrapperClassName = "",
  inputClassName = "",
  children,
}: InlineEditableProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  useEffect(() => {
    if (!editing) setDraft(value)
  }, [value, editing])

  if (!editMode) return <>{children}</>

  if (editing) {
    const base = "w-full bg-background/80 border border-brand/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 text-foreground"

    if (multiline) {
      return (
        <textarea
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => { onSave(draft); setEditing(false) }}
          onKeyDown={(e) => {
            if (e.key === "Escape") { setDraft(value); setEditing(false) }
          }}
          className={`${base} p-3 text-sm resize-none leading-relaxed font-sans ${inputClassName}`}
          rows={Math.max(3, Math.ceil(draft.length / 70) + 1)}
        />
      )
    }

    return (
      <input
        autoFocus
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => { onSave(draft); setEditing(false) }}
        onKeyDown={(e) => {
          if (e.key === "Enter") { onSave(draft); setEditing(false) }
          if (e.key === "Escape") { setDraft(value); setEditing(false) }
        }}
        className={`${base} px-3 py-1 ${inputClassName}`}
      />
    )
  }

  return (
    <div
      className={`relative group cursor-pointer rounded-xl ${wrapperClassName}`}
      onClick={() => { setDraft(value); setEditing(true) }}
    >
      {children}
      <div className="absolute inset-0 rounded-xl border-2 border-dashed border-brand/30 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      <span className="absolute top-1.5 right-1.5 z-10 text-[10px] uppercase tracking-widest text-brand bg-background/90 border border-brand/20 px-2 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        Edit ✎
      </span>
    </div>
  )
}
