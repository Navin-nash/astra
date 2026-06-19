import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Docs — Astra",
  description: "How Astra turns GitHub repositories into a developer portfolio in under 60 seconds.",
};

const navItems = [
  { id: "quickstart", label: "Quickstart" },
  { id: "how-it-works", label: "How it works" },
  { id: "what-astra-reads", label: "What Astra reads" },
  { id: "auto-sync", label: "Auto-sync" },
  { id: "templates", label: "Portfolio templates" },
  { id: "faq", label: "FAQ" },
];

export default function DocsPage() {
  return (
    <div>
      {/* Page header */}
      <div className="border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/10 border border-brand/20 text-brand text-[11px] font-semibold uppercase tracking-widest mb-6">
            Documentation
          </div>
          <h1
            className="font-black tracking-tight text-foreground leading-tight mb-5"
            style={{ fontSize: "clamp(2rem, 4.5vw, 3.25rem)", textWrap: "balance" }}
          >
            How Astra works
          </h1>
          <p className="text-muted-foreground text-base md:text-lg max-w-[52ch] leading-relaxed">
            Everything you need to get your GitHub repositories live as a portfolio in under 60 seconds.
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-12 lg:gap-16">

          {/* Sticky sidebar */}
          <aside className="hidden lg:block">
            <nav className="sticky top-28 space-y-1">
              <p className="text-xs font-semibold text-foreground uppercase tracking-widest mb-4">
                Contents
              </p>
              {navItems.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="block text-sm text-muted-foreground hover:text-foreground py-1.5 border-l-2 border-transparent hover:border-brand pl-3 transition-colors duration-150"
                >
                  {item.label}
                </a>
              ))}
              <div className="pt-6 mt-4 border-t border-border">
                <a
                  href="mailto:support@useastra.tech"
                  className="text-xs text-brand hover:underline font-medium"
                >
                  Something missing? Email us
                </a>
              </div>
            </nav>
          </aside>

          {/* Content */}
          <div className="space-y-16">

            <DocSection id="quickstart" title="Quickstart">
              <p>
                Getting from zero to a live portfolio takes four steps and under 60 seconds.
              </p>
              <div className="space-y-4 mt-4">
                {[
                  {
                    step: "01",
                    heading: "Sign in with GitHub",
                    detail:
                      "Astra requests a read-only OAuth token scoped to your public repository metadata. No write access is requested. Private repositories are never accessed unless you explicitly extend the permission scope.",
                  },
                  {
                    step: "02",
                    heading: "Select up to 5 repositories",
                    detail:
                      "Choose the projects you want to feature. Astra runs parallel AST analysis on all selected repositories — language detection, exported symbols, dependency graphs, framework patterns, and commit statistics.",
                  },
                  {
                    step: "03",
                    heading: "Generate",
                    detail:
                      "Hit Generate. Within 60 seconds, Astra produces technical narratives for each project, identifies your engineering patterns, and assembles a complete portfolio. You can edit any generated text before publishing.",
                  },
                  {
                    step: "04",
                    heading: "Share your link",
                    detail: (
                      <>
                        Your portfolio is live at{" "}
                        <code className="text-foreground bg-muted px-1.5 py-0.5 rounded text-sm font-mono">
                          useastra.tech/u/your-username
                        </code>
                        . Share it in applications, your bio, or anywhere you want your work seen.
                      </>
                    ),
                  },
                ].map(({ step, heading, detail }) => (
                  <div key={step} className="flex gap-5">
                    <span className="text-xs font-mono text-brand font-bold mt-0.5 w-6 shrink-0">
                      {step}
                    </span>
                    <div>
                      <p className="font-semibold text-foreground mb-1">{heading}</p>
                      <p className="text-muted-foreground text-sm leading-relaxed">{detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </DocSection>

            <DocSection id="how-it-works" title="How it works">
              <p>
                Astra is built on a Rust processing engine that connects to the GitHub API, fetches your selected repository data, and runs AST-level static analysis — not a surface-level README skim. It identifies exported symbols, framework usage patterns, dependency graphs, and architectural signals directly from the code structure.
              </p>
              <p>
                The analysis output is passed to an AI reasoning layer calibrated for engineering audiences. Rather than generating generic marketing copy, the AI produces technical narratives that explain architecture, design trade-offs, and implementation depth — the kind of context a hiring engineer or technical founder needs to evaluate your work.
              </p>
              <p>
                All repository analysis runs in parallel. Five repositories take roughly the same time as one. Generated portfolios are server-rendered for fast load times and are publicly accessible without requiring visitors to log in.
              </p>
              <div className="mt-5 p-4 rounded-lg bg-muted/60 border border-border">
                <p className="text-sm text-foreground font-semibold mb-1">AI providers</p>
                <p className="text-sm text-muted-foreground">
                  Astra uses Google Gemini as the primary inference provider. Repository summaries are sent as prompt inputs. Under our agreement, Gemini does not use your data to train its models.
                </p>
              </div>
            </DocSection>

            <DocSection id="what-astra-reads" title="What Astra reads">
              <p>
                Astra performs AST-level analysis on your selected repositories. Here is exactly what is accessed and how it is used:
              </p>
              <ul>
                {[
                  "Repository name, description, and GitHub topics",
                  "Primary language and full language breakdown by byte count",
                  "Exported symbols, components, hooks, handlers, and classes (structure only — not logic)",
                  "Dependency manifest (package.json, Cargo.toml, requirements.txt, go.mod, etc.) — packages and versions",
                  "Framework and library detection inferred from import patterns",
                  "Commit count and activity frequency (not commit messages or diffs)",
                  "Open-source licence type",
                  "Star and fork counts",
                ].map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <div className="mt-5 p-4 rounded-lg bg-muted/60 border border-border">
                <p className="text-sm text-foreground font-semibold mb-1">What Astra never reads or stores</p>
                <p className="text-sm text-muted-foreground">
                  Astra does not read or store raw source code, commit messages, commit diffs, pull requests, issues, code review comments, or any private repository data. AST analysis extracts structural signals only — the shape of your code, not the content.
                </p>
              </div>
            </DocSection>

            <DocSection id="auto-sync" title="Auto-sync">
              <p>
                Once your portfolio is published, Astra watches your connected repositories via GitHub webhooks. When you push new code, Astra automatically re-analyzes the affected repositories and updates your portfolio within approximately two minutes.
              </p>
              <p>
                Auto-sync is enabled by default for all connected repositories. You can disable it per-repository from your dashboard settings if you prefer to control when updates go live.
              </p>
              <div className="space-y-4 mt-4">
                {[
                  {
                    step: "01",
                    heading: "You push to a connected repository",
                    detail: "GitHub sends a webhook event to Astra within seconds of the push.",
                  },
                  {
                    step: "02",
                    heading: "Astra re-analyzes the repository",
                    detail: "The delta is analyzed using the same AST pipeline as the initial generation.",
                  },
                  {
                    step: "03",
                    heading: "Portfolio updates automatically",
                    detail: "The updated narrative and project data are published to your live portfolio within ~2 minutes. No action required.",
                  },
                ].map(({ step, heading, detail }) => (
                  <div key={step} className="flex gap-5">
                    <span className="text-xs font-mono text-brand font-bold mt-0.5 w-6 shrink-0">
                      {step}
                    </span>
                    <div>
                      <p className="font-semibold text-foreground mb-1">{heading}</p>
                      <p className="text-muted-foreground text-sm leading-relaxed">{detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </DocSection>

            <DocSection id="templates" title="Portfolio templates">
              <p>
                Astra ships three portfolio templates. Template selection is available from your dashboard after generation.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                {[
                  {
                    name: "Minimal",
                    desc: "Clean layout with a light default. Focused on readability and presenting technical depth without visual noise.",
                  },
                  {
                    name: "Terminal",
                    desc: "Monospaced, command-line aesthetic. Built for engineers who want their portfolio to feel like an interface.",
                  },
                  {
                    name: "Void",
                    desc: "Dark, high-contrast design with a code-editor feel. Built for engineers who want something that reads as technical and serious.",
                  },
                ].map(({ name, desc }) => (
                  <div key={name} className="p-5 rounded-xl border border-border bg-card">
                    <div className="inline-flex items-center gap-1.5 mb-3">
                      <span className="w-2 h-2 rounded-full bg-brand" aria-hidden />
                      <span className="font-bold text-foreground text-sm">{name}</span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
              <p className="mt-4">
                All templates support dark and light display modes and are optimised for both desktop and mobile viewing. Additional templates are in development.
              </p>
            </DocSection>

            <DocSection id="faq" title="FAQ">
              <div className="space-y-8">
                {[
                  {
                    q: "Is Astra free?",
                    a: "Astra is free during early access. Pricing will be announced before the public launch. Waitlist members lock in their rate at signup.",
                  },
                  {
                    q: "Can I edit the generated portfolio?",
                    a: "Yes, fully. Every generated sentence is editable inline before and after publishing. You can rewrite a section, cut a paragraph, or publish the first draft exactly as-is.",
                  },
                  {
                    q: "Does Astra support private repositories?",
                    a: "Not by default. The default OAuth scope is read-only on public repositories. Private repo access is not currently offered.",
                  },
                  {
                    q: "How is my portfolio URL structured?",
                    a: "Your portfolio is served at useastra.tech/u/your-github-username. The username is set automatically from your GitHub account.",
                  },
                  {
                    q: "How often does my portfolio update?",
                    a: "Automatically — within ~2 minutes of any push to a connected repository via GitHub webhooks. You can also manually trigger a regeneration from your dashboard.",
                  },
                  {
                    q: "Which languages does Astra support?",
                    a: "Astra parses 20+ languages including TypeScript, JavaScript, Python, Rust, Go, Java, Ruby, Swift, and Kotlin, with framework detection for Next.js, FastAPI, Django, Gin, Axum, Rails, Spring Boot, and more.",
                  },
                  {
                    q: "How long does generation take?",
                    a: "Under 60 seconds for up to five repositories. All repos are analyzed in parallel, and narrative generation runs concurrently per project.",
                  },
                ].map(({ q, a }) => (
                  <div key={q} className="pb-8 border-b border-border last:border-0 last:pb-0">
                    <p className="font-semibold text-foreground mb-2">{q}</p>
                    <p className="text-muted-foreground text-sm leading-relaxed">{a}</p>
                  </div>
                ))}
              </div>
            </DocSection>

          </div>
        </div>
      </div>
    </div>
  );
}

function DocSection({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-28">
      <h2 className="text-xl md:text-2xl font-bold text-foreground mb-6 pb-4 border-b border-border">
        {title}
      </h2>
      <div className="text-muted-foreground leading-relaxed space-y-4 [&_ul]:space-y-2.5 [&_ul]:list-none [&_ul]:mt-3 [&_li]:relative [&_li]:pl-5 [&_li]:before:absolute [&_li]:before:left-0 [&_li]:before:top-[0.6em] [&_li]:before:w-1.5 [&_li]:before:h-1.5 [&_li]:before:rounded-full [&_li]:before:bg-brand/60 [&_strong]:text-foreground [&_strong]:font-semibold [&_p]:text-sm [&_p]:leading-relaxed">
        {children}
      </div>
    </section>
  );
}
