import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — Astra",
  description: "How Astra collects, uses, and protects your data.",
};

const sections = [
  {
    id: "overview",
    title: "Overview",
    content: (
      <p>
        Astra is a developer portfolio tool. To generate your portfolio, we need to read structural
        signals from your GitHub repositories. This policy explains exactly what we access, what we
        store, how we use it, and what we never touch. We keep this language plain because you should
        be able to read and understand it without a lawyer.
      </p>
    ),
  },
  {
    id: "what-we-collect",
    title: "What we collect",
    content: (
      <>
        <p>
          When you sign in with GitHub, we receive your GitHub username and the email address
          associated with your GitHub account via OAuth. We store a read-only access token scoped
          to public repository metadata. We do not request write permissions. We do not access
          private repositories.
        </p>
        <ul>
          <li>
            <strong>GitHub identity</strong> — username and public email, used to authenticate
            you and set your portfolio URL.
          </li>
          <li>
            <strong>Repository structural data</strong> — for repositories you select: name,
            description, topics, language breakdown, exported symbol structure (AST-level),
            dependency manifests (package names and versions), commit count and frequency,
            star and fork counts, and licence type. Raw source code is never stored.
          </li>
          <li>
            <strong>Generated portfolio content</strong> — AI-generated project narratives and
            summaries stored and served from your public portfolio page at
            useastra.tech/u/your-username.
          </li>
          <li>
            <strong>Webhook events</strong> — if auto-sync is enabled, GitHub sends push event
            metadata (repository name, ref, timestamp) to Astra when you push new code. Commit
            messages, diffs, and file contents are not included.
          </li>
          <li>
            <strong>Usage logs</strong> — standard server logs (request timestamps, IP address,
            browser user-agent) retained for 30 days to maintain service quality and diagnose
            errors. These are not linked to individual user profiles.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "what-we-never-read",
    title: "What we never read or store",
    content: (
      <>
        <p>
          This is explicit because it matters. Astra's AST analysis reads the <em>shape</em> of
          your code — exported identifiers, import patterns, file structure — not the logic inside
          functions or the content of your commits. We never access or store:
        </p>
        <ul>
          <li>Raw source code content (function bodies, business logic, algorithms)</li>
          <li>Commit messages or commit diffs</li>
          <li>Pull requests, issues, or code review comments</li>
          <li>Any data from private repositories</li>
          <li>Environment variables, secrets, or configuration files</li>
          <li>GitHub Actions workflows or CI/CD outputs</li>
        </ul>
      </>
    ),
  },
  {
    id: "how-we-use-it",
    title: "How we use your data",
    content: (
      <ul>
        <li>To authenticate you and maintain your session.</li>
        <li>To generate and publish your developer portfolio at your public URL.</li>
        <li>To automatically update your portfolio when you push new code (auto-sync).</li>
        <li>
          To improve AI narrative quality using aggregate, anonymised structural patterns —
          never linked to individual accounts.
        </li>
        <li>
          To send transactional notifications (portfolio ready, sync updates) if you have
          enabled email notifications in your account settings.
        </li>
      </ul>
    ),
  },
  {
    id: "ai-providers",
    title: "Third-party AI providers",
    content: (
      <p>
        Astra uses Google Gemini to generate portfolio narratives. Curated repository summaries
        (structural signals and metadata, never raw source code) are sent as prompt inputs to
        Gemini's API. Under our data processing agreement with Google, your data is not used
        to train Gemini models. Processing occurs within Google's infrastructure under their
        enterprise data handling terms.
      </p>
    ),
  },
  {
    id: "data-sharing",
    title: "Data sharing",
    content: (
      <>
        <p>
          We do not sell your data. We do not share your data with third parties for advertising
          or marketing purposes. Data is shared only in the following limited circumstances:
        </p>
        <ul>
          <li>
            <strong>AI inference providers</strong> — as described above, repository summaries
            are sent to Google Gemini for narrative generation.
          </li>
          <li>
            <strong>Infrastructure providers</strong> — our hosting, database, and CDN providers
            process data as part of operating the service. All providers are under data processing
            agreements.
          </li>
          <li>
            <strong>Legal requirements</strong> — if required by law or a valid legal process,
            we may disclose data. We will notify you where legally permitted to do so.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "retention",
    title: "Data retention",
    content: (
      <p>
        Account data, generated portfolio content, and repository structural data are retained
        while your account is active. Usage logs are retained for 30 days then automatically
        deleted. If you delete your account, all associated data is purged within 14 days.
        You can request deletion at any time without deleting your account by emailing
        support@useastra.tech.
      </p>
    ),
  },
  {
    id: "your-rights",
    title: "Your rights",
    content: (
      <p>
        You have the right to access a copy of the data we hold about you, correct inaccuracies,
        request deletion, and withdraw consent for optional data uses (such as email notifications).
        To exercise any of these rights, email{" "}
        <a href="mailto:support@useastra.tech" className="text-brand hover:underline font-medium">
          support@useastra.tech
        </a>
        . We will respond within 14 days.
      </p>
    ),
  },
  {
    id: "security",
    title: "Security",
    content: (
      <p>
        GitHub OAuth tokens are stored encrypted at rest. All data in transit is encrypted via
        TLS. Repository structural data is processed ephemerally during analysis and only the
        derived summaries (not raw data) are stored. We conduct periodic security reviews and
        will notify affected users promptly in the event of a data breach.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes to this policy",
    content: (
      <p>
        We may update this policy as the product evolves. The date at the top of this page
        reflects when it was last revised. We will notify you of material changes via the email
        associated with your GitHub account at least 14 days before they take effect.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      badge="Privacy"
      title="Privacy Policy"
      updated="June 19, 2025"
      intro="We built Astra to showcase your engineering work. Here is exactly what data we handle to make that happen — nothing more."
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
                  href="mailto:support@useastra.tech"
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
                <div className="pl-10 text-muted-foreground leading-relaxed space-y-4 [&_ul]:space-y-3 [&_ul]:list-none [&_li]:relative [&_li]:pl-5 [&_li]:before:absolute [&_li]:before:left-0 [&_li]:before:top-[0.6em] [&_li]:before:w-1.5 [&_li]:before:h-1.5 [&_li]:before:rounded-full [&_li]:before:bg-brand/60 [&_strong]:text-foreground [&_strong]:font-semibold [&_a]:text-brand [&_a:hover]:underline [&_em]:italic">
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
