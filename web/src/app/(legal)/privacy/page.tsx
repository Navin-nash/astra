import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — Astra",
  description: "How Astra collects, uses, and protects your data.",
};

const sections = [
  {
    id: "what-we-collect",
    title: "What we collect",
    content: (
      <>
        <p>
          When you sign in with GitHub, we receive your GitHub username and public email address via OAuth. We store an access token scoped to read public repository metadata only. We do not read private repositories unless you explicitly grant that permission.
        </p>
        <ul>
          <li>
            <strong>Repository metadata</strong> — names, languages, topics, stars, forks, and commit statistics for repositories you select. We do not store full source code on our servers.
          </li>
          <li>
            <strong>Generated portfolio content</strong> — AI-generated descriptions and narratives stored and served from your public portfolio page.
          </li>
          <li>
            <strong>Usage logs</strong> — standard server logs (timestamps, IP address, browser type) retained for 30 days to maintain service quality and diagnose errors.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "how-we-use-it",
    title: "How we use it",
    content: (
      <ul>
        <li>To authenticate you and maintain your session.</li>
        <li>To generate and publish your developer portfolio.</li>
        <li>To improve AI analysis quality using aggregate, anonymised data.</li>
        <li>To send transactional notifications (portfolio ready, status updates) if you opt in.</li>
      </ul>
    ),
  },
  {
    id: "ai-providers",
    title: "Third-party AI providers",
    content: (
      <p>
        Astra uses Google Gemini, Groq, and NVIDIA NIM to generate portfolio narratives. Repository summaries and metadata are sent as prompt inputs to these providers. Under our agreements, none of these providers use your data to train their models.
      </p>
    ),
  },
  {
    id: "retention",
    title: "Data retention",
    content: (
      <p>
        Account data, generated portfolio content, and repository metadata are retained while your account is active. You may request deletion at any time. Deletions are processed within 14 days.
      </p>
    ),
  },
  {
    id: "your-rights",
    title: "Your rights",
    content: (
      <p>
        You may request a copy of the data we hold, correct inaccuracies, or request deletion. Email{" "}
        <a href="mailto:support@useastra.qzz.io" className="text-brand hover:underline font-medium">
          support@useastra.qzz.io
        </a>{" "}
        to exercise these rights.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes to this policy",
    content: (
      <p>
        We may update this policy as the product evolves. We will notify you of material changes via the email associated with your account.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      badge="Privacy"
      title="Privacy Policy"
      updated="June 2025"
      intro="We built Astra to showcase your engineering work. Here is exactly what data we handle to do that."
      sections={sections}
      sibling={{ label: "Terms of Service", href: "/terms" }}
    />
  );
}

/* ─── Shared Legal Page Shell ────────────────────── */

interface Section {
  id: string;
  title: string;
  content: React.ReactNode;
}

function LegalPage({
  badge,
  title,
  updated,
  intro,
  sections,
  sibling,
}: {
  badge: string;
  title: string;
  updated: string;
  intro: string;
  sections: Section[];
  sibling: { label: string; href: string };
}) {
  return (
    <div>
      {/* Page header */}
      <div className="border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/10 border border-brand/20 text-brand text-[11px] font-semibold uppercase tracking-widest mb-6">
            {badge}
          </div>
          <h1
            className="font-black tracking-tight text-foreground leading-tight mb-5"
            style={{ fontSize: "clamp(2rem, 4.5vw, 3.25rem)", textWrap: "balance" }}
          >
            {title}
          </h1>
          <p className="text-muted-foreground text-base md:text-lg max-w-[52ch] leading-relaxed mb-6">
            {intro}
          </p>
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-xs text-muted-foreground/60 font-mono">
              Last updated: {updated}
            </span>
            <Link
              href={sibling.href}
              className="text-xs text-brand hover:underline font-medium"
            >
              {sibling.label} &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-12 lg:gap-16">

          {/* Sticky TOC */}
          <aside className="hidden lg:block">
            <nav className="sticky top-28 space-y-1">
              <p className="text-xs font-semibold text-foreground uppercase tracking-widest mb-4">
                On this page
              </p>
              {sections.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="block text-sm text-muted-foreground hover:text-foreground py-1.5 border-l-2 border-transparent hover:border-brand pl-3 transition-colors duration-150"
                >
                  {s.title}
                </a>
              ))}
              <div className="pt-6 mt-4 border-t border-border">
                <a
                  href="mailto:support@useastra.qzz.io"
                  className="text-xs text-brand hover:underline font-medium"
                >
                  Questions? Email us
                </a>
              </div>
            </nav>
          </aside>

          {/* Content */}
          <div className="space-y-10">
            {sections.map((s, i) => (
              <section
                key={s.id}
                id={s.id}
                className="scroll-mt-28 pb-10 border-b border-border last:border-0 last:pb-0"
              >
                <div className="flex items-baseline gap-4 mb-5">
                  <span className="text-xs font-mono text-muted-foreground/40 tabular-nums w-6 shrink-0">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h2 className="text-lg md:text-xl font-bold text-foreground">
                    {s.title}
                  </h2>
                </div>
                <div className="pl-10 text-muted-foreground leading-relaxed space-y-4 [&_ul]:space-y-3 [&_ul]:list-none [&_li]:relative [&_li]:pl-5 [&_li]:before:absolute [&_li]:before:left-0 [&_li]:before:top-[0.6em] [&_li]:before:w-1.5 [&_li]:before:h-1.5 [&_li]:before:rounded-full [&_li]:before:bg-brand/60 [&_strong]:text-foreground [&_strong]:font-semibold [&_a]:text-brand [&_a:hover]:underline">
                  {s.content}
                </div>
              </section>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
