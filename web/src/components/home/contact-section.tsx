"use client";

import * as React from "react";
import { useState } from "react";
import { motion, useReducedMotion, AnimatePresence } from "motion/react";
import { Mail, MessageSquare, Sparkles, Handshake, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const CONTACT_EMAIL = "support@useastra.tech";

const reasons = [
  {
    icon: MessageSquare,
    title: "Product feedback",
    description: "Tell us what's working, what isn't, and what you wish existed. We read every message and respond to most. This is genuinely how the roadmap gets shaped.",
  },
  {
    icon: Sparkles,
    title: "Feature requests",
    description: "Got an idea? We're building in public and your input shapes the roadmap. If five people ask for the same thing in a week, it moves to the top of the list.",
  },
  {
    icon: Handshake,
    title: "Partnerships & press",
    description: "Bootcamps, job boards, engineering communities — if you want to bring Astra to your audience, reach out. We're open to integrations and co-promotion.",
  },
  {
    icon: Mail,
    title: "General enquiries",
    description: "Anything else — whether it's a billing question, a bug report, or just to say the portfolio looks good. We're a small team and we actually reply.",
  },
];

const faqs = [
  {
    q: "How does Astra analyze my code without compromising privacy?",
    a: "Astra uses a read-only GitHub token scoped only to the repositories you explicitly select. It performs AST parsing on your code structure — symbols, exports, dependencies, patterns — but never stores your raw source. Processed summaries are cached; original code is not persisted anywhere.",
  },
  {
    q: "How long does it actually take to go from GitHub to a live portfolio?",
    a: "Median time is under 60 seconds for a five-repo portfolio. Repository analysis runs in parallel, narrative generation happens concurrently per project, and publishing is instant. The only thing that slows it down is an unusually large codebase or rate limits from the GitHub API.",
  },
  {
    q: "Can I edit what Astra generates before it goes live?",
    a: "Yes, fully. Every generated paragraph is editable inline before you publish. You can rewrite a sentence, cut a section, or publish the first draft exactly as-is. After publishing, you can still edit at any time — changes go live immediately.",
  },
  {
    q: "Which languages and frameworks does Astra support?",
    a: "Astra parses 20+ languages including TypeScript, JavaScript, Python, Rust, Go, Java, Ruby, Swift, and Kotlin. Framework detection covers Next.js, FastAPI, Django, Gin, Axum, Rails, Spring Boot, and more. If a language has an established AST toolchain, it's likely supported.",
  },
  {
    q: "What happens to my portfolio when I push new code?",
    a: "Astra watches your connected repositories via GitHub webhooks. On push, it re-analyzes the diff and updates your portfolio within two minutes — no action required from you. Your portfolio always reflects the current state of your work.",
  },
  {
    q: "How is this different from just linking my GitHub profile?",
    a: "A GitHub profile shows a grid of repositories and contribution heatmaps. Astra reads the code inside those repositories and generates a technical narrative that explains architecture, design decisions, and engineering depth. It translates what you built into language that a hiring engineer or technical founder can evaluate at a glance.",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();

  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-4 py-5 text-left group"
        aria-expanded={open}
      >
        <span className="text-sm font-medium text-foreground group-hover:text-brand transition-colors duration-200">
          {q}
        </span>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <p className="pb-5 text-sm text-muted-foreground leading-relaxed">
              {a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ContactSection() {
  const reduce = useReducedMotion();

  return (
    <section id="contact" className="py-20 lg:py-28 border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="mb-12"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border text-muted-foreground text-[11px] uppercase tracking-[0.18em] mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-brand" aria-hidden />
            Get in touch
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground leading-tight mb-4">
            We&apos;d love to hear from you
          </h2>
          <p className="text-muted-foreground text-base max-w-[52ch] leading-relaxed">
            Astra is early and actively evolving. Your feedback and ideas directly shape what we
            build next. We read everything — don&apos;t hold back.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">

          {/* Left: reason cards + CTA */}
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {reasons.map((reason, i) => (
                <motion.div
                  key={reason.title}
                  initial={reduce ? false : { opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.6, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
                  className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3 hover:border-brand/30 transition-colors duration-200"
                >
                  <div className="w-9 h-9 rounded-lg bg-brand/10 flex items-center justify-center">
                    <reason.icon className="w-4 h-4 text-brand" />
                  </div>
                  <h3 className="font-semibold text-foreground text-sm">{reason.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{reason.description}</p>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={reduce ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="group inline-flex items-center gap-2.5 rounded-full border border-border bg-card px-6 py-3 text-sm font-medium text-foreground transition-all duration-200 hover:border-brand hover:text-brand hover:bg-brand/5"
              >
                <Mail className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
                {CONTACT_EMAIL}
              </a>
              <p className="mt-3 text-xs text-muted-foreground/60">
                Typical reply time: under 24 hours on weekdays.
              </p>
            </motion.div>
          </div>

          {/* Right: FAQ */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            <h3 className="text-lg font-semibold text-foreground mb-1">
              Common questions
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              If yours isn&apos;t here, email us.
            </p>
            <div>
              {faqs.map((faq) => (
                <FaqItem key={faq.q} q={faq.q} a={faq.a} />
              ))}
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
