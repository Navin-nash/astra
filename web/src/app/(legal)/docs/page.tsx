import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Docs — Astra",
  description: "How Astra turns GitHub repositories into a developer portfolio in under 90 seconds.",
};

const navItems = [
  { id: "quickstart", label: "Quickstart" },
  { id: "how-it-works", label: "How it works" },
  { id: "what-astra-reads", label: "What Astra reads" },
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
            Everything you need to get your GitHub repositories live as a portfolio in under 90 seconds.
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
                  href="mailto:support@useastra.qzz.io"
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
                Getting from zero to a live portfolio takes four steps and about 90 seconds.
              </p>
              <div className="space-y-4 mt-4">
                {[
                  {
                    step: "01",
                    heading: "Sign in with GitHub",
                    detail:
                      "Astra requests read-only access to your public repository metadata. No write permissions, no access to private repositories.",
                  },
                  {
                    step: "02",
                    heading: "Select up to 5 repositories",
                    detail:
                      "Choose the projects you want to feature. Astra will analyze language breakdown, commit activity, topics, and project descriptions.",
                  },
                  {
                    step: "03",
                    heading: "Generate",
                    detail:
                      "Hit Generate. Within ~90 seconds, Astra produces written narratives for each project, a short bio, and assembles your portfolio.",
                  },
                  {
                    step: "04",
                    heading: "Share your link",
                    detail: (
                      <>
                        Your portfolio is live at{" "}
                        <code className="text-foreground bg-muted px-1.5 py-0.5 rounded text-sm font-mono">
                          astra.build/u/your-username
                        </code>
                        . Share it anywhere.
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
                Astra is built on a Rust processing engine that fetches repository data from the GitHub API, runs static analysis to extract language statistics and structural signals, then passes curated summaries to a cascade of AI models.
              </p>
              <p>
                The AI layer uses a tiered approach: fast models produce initial narrative drafts; a quality pass refines the output. This keeps generation fast without sacrificing quality. We use Google Gemini Flash, Groq, and NVIDIA NIM as inference providers.
              </p>
              <p>
                Generated portfolios are server-rendered for instant load times and are publicly accessible without requiring visitors to sign in.
              </p>
            </DocSection>

            <DocSection id="what-astra-reads" title="What Astra reads">
              <p>Astra reads the following from your selected repositories:</p>
              <ul>
                {[
                  "Repository name, description, and topics",
                  "Primary language and language breakdown by byte count",
                  "Star and fork counts",
                  "Recent commit activity (count and frequency, not commit messages)",
                  "README presence (not content)",
                  "Open-source licence type",
                ].map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <div className="mt-5 p-4 rounded-lg bg-muted/60 border border-border">
                <p className="text-sm text-foreground font-semibold mb-1">What we never read</p>
                <p className="text-sm text-muted-foreground">
                  Astra does not read your source code, commit messages, issues, pull requests, or any private repository data.
                </p>
              </div>
            </DocSection>

            <DocSection id="templates" title="Portfolio templates">
              <p>Astra ships two portfolio templates:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                {[
                  {
                    name: "Minimal",
                    desc: "Clean, light-themed layout focused on readability. Presents a focused project list with clear technical depth.",
                  },
                  {
                    name: "Void",
                    desc: "Dark, high-contrast design with a code-editor aesthetic. Built for engineers who want something that reads as technical.",
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
                More templates are in development. Template selection is available after generation from your dashboard.
              </p>
            </DocSection>

            <DocSection id="faq" title="FAQ">
              <div className="space-y-8">
                {[
                  {
                    q: "Is Astra free?",
                    a: "During early access, Astra is free to use. Pricing will be announced before the public launch.",
                  },
                  {
                    q: "Can I edit the generated portfolio?",
                    a: "Yes. After generation, you can edit any text in the dashboard before publishing.",
                  },
                  {
                    q: "Does Astra support private repositories?",
                    a: "Not currently. Astra is designed for showcasing public work. Private repo support may come in a future update.",
                  },
                  {
                    q: "How is my portfolio URL set?",
                    a: "Your portfolio is served at astra.build/u/your-github-username by default.",
                  },
                  {
                    q: "Can I use a custom domain?",
                    a: "Custom domain support is planned after the early access period.",
                  },
                  {
                    q: "How often does my portfolio update?",
                    a: "Portfolios are generated on demand. Re-run generation from your dashboard to refresh the content from your latest repository state.",
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
