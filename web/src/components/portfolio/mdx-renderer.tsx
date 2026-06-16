"use client"

import type { ReactNode } from "react"

interface MdxRendererProps {
  content: string
}

function parseInline(text: string): ReactNode[] {
  const segments: ReactNode[] = []
  let last = 0
  let key = 0

  const regex = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|`([^`]+)`/g
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      segments.push(text.slice(last, match.index))
    }

    if (match[0].startsWith("[")) {
      segments.push(
        <a
          key={key++}
          href={match[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline underline-offset-4 hover:opacity-80 transition-opacity"
        >
          {match[1]}
        </a>
      )
    } else if (match[0].startsWith("**")) {
      segments.push(
        <strong key={key++} className="font-semibold text-foreground">
          {match[3]}
        </strong>
      )
    } else {
      segments.push(
        <code
          key={key++}
          className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm text-foreground"
        >
          {match[4]}
        </code>
      )
    }

    last = match.index + match[0].length
  }

  if (last < text.length) {
    segments.push(text.slice(last))
  }

  return segments
}

export function MdxRenderer({ content }: MdxRendererProps) {
  if (!content?.trim()) {
    return (
      <p className="text-muted-foreground italic">Portfolio content is empty.</p>
    )
  }

  const blocks = content.trim().split(/\n{2,}/)
  const elements: ReactNode[] = []

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i].trim()
    if (!block) continue

    const lines = block.split("\n")

    if (block.startsWith("### ")) {
      elements.push(
        <h3 key={i} className="mt-6 mb-2 text-lg font-medium text-foreground">
          {parseInline(block.slice(4))}
        </h3>
      )
    } else if (block.startsWith("## ")) {
      elements.push(
        <h2 key={i} className="mt-8 mb-3 text-xl font-semibold tracking-tight text-foreground">
          {parseInline(block.slice(3))}
        </h2>
      )
    } else if (block.startsWith("# ")) {
      elements.push(
        <h1 key={i} className="mt-8 mb-4 text-3xl font-bold tracking-tight text-foreground">
          {parseInline(block.slice(2))}
        </h1>
      )
    } else if (lines.every((l) => /^[-*]\s/.test(l))) {
      elements.push(
        <ul key={i} className="mb-4 ml-6 list-disc space-y-1 text-muted-foreground">
          {lines.map((l, j) => (
            <li key={j} className="leading-7">
              {parseInline(l.slice(2))}
            </li>
          ))}
        </ul>
      )
    } else if (lines.every((l) => /^\d+\.\s/.test(l))) {
      elements.push(
        <ol key={i} className="mb-4 ml-6 list-decimal space-y-1 text-muted-foreground">
          {lines.map((l, j) => (
            <li key={j} className="leading-7">
              {parseInline(l.replace(/^\d+\.\s/, ""))}
            </li>
          ))}
        </ol>
      )
    } else if (lines.every((l) => l.startsWith("> "))) {
      elements.push(
        <blockquote
          key={i}
          className="mb-4 border-l-2 border-border pl-4 italic text-muted-foreground"
        >
          {parseInline(lines.map((l) => l.slice(2)).join(" "))}
        </blockquote>
      )
    } else {
      elements.push(
        <p key={i} className="mb-4 leading-7 text-muted-foreground">
          {parseInline(lines.join(" "))}
        </p>
      )
    }
  }

  return <div>{elements}</div>
}
