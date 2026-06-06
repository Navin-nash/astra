import { MDXRemote } from "next-mdx-remote/rsc"
import type { ComponentPropsWithoutRef } from "react"

const components = {
  h1: (props: ComponentPropsWithoutRef<"h1">) => (
    <h1
      className="mt-8 mb-4 text-3xl font-bold tracking-tight text-foreground"
      {...props}
    />
  ),
  h2: (props: ComponentPropsWithoutRef<"h2">) => (
    <h2
      className="mt-8 mb-3 text-xl font-semibold tracking-tight text-foreground"
      {...props}
    />
  ),
  h3: (props: ComponentPropsWithoutRef<"h3">) => (
    <h3 className="mt-6 mb-2 text-lg font-medium text-foreground" {...props} />
  ),
  p: (props: ComponentPropsWithoutRef<"p">) => (
    <p className="mb-4 leading-7 text-muted-foreground" {...props} />
  ),
  ul: (props: ComponentPropsWithoutRef<"ul">) => (
    <ul className="mb-4 ml-6 list-disc space-y-1 text-muted-foreground" {...props} />
  ),
  ol: (props: ComponentPropsWithoutRef<"ol">) => (
    <ol className="mb-4 ml-6 list-decimal space-y-1 text-muted-foreground" {...props} />
  ),
  li: (props: ComponentPropsWithoutRef<"li">) => (
    <li className="leading-7" {...props} />
  ),
  code: (props: ComponentPropsWithoutRef<"code">) => (
    <code
      className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm text-foreground"
      {...props}
    />
  ),
  pre: (props: ComponentPropsWithoutRef<"pre">) => (
    <pre
      className="mb-4 overflow-x-auto rounded-xl border border-border bg-muted p-4 font-mono text-sm text-foreground"
      {...props}
    />
  ),
  blockquote: (props: ComponentPropsWithoutRef<"blockquote">) => (
    <blockquote
      className="mb-4 border-l-2 border-border pl-4 italic text-muted-foreground"
      {...props}
    />
  ),
  a: (props: ComponentPropsWithoutRef<"a">) => (
    <a
      className="text-primary underline underline-offset-4 hover:opacity-80 transition-opacity"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    />
  ),
  hr: () => <hr className="my-8 border-border" />,
}

interface MdxRendererProps {
  content: string
}

export function MdxRenderer({ content }: MdxRendererProps) {
  if (!content?.trim()) {
    return (
      <p className="text-muted-foreground italic">Portfolio content is empty.</p>
    )
  }
  return <MDXRemote source={content} components={components} />
}
