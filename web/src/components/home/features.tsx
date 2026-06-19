"use client";

import * as React from "react";
import { useRef, useEffect, useState } from "react";
import { motion, useReducedMotion, useInView, animate } from "motion/react";

/* ─── Types ─────────────────────────────────────── */
interface Metric {
  value: string;
  label: string;
  sub?: string;
}

interface FeatureStory {
  id: number;
  title: string;
  body: string;
  name: string;
  role: string;
  metrics: Metric[];
}

interface CapabilityCard {
  icon: string;
  title: string;
  body: string;
}

/* ─── Data ───────────────────────────────────────── */
const stories: FeatureStory[] = [
  {
    id: 1,
    title: "Reads code structure, not just README files",
    body: "Astra runs AST-level analysis on every file in your repository — not a surface skim. It identifies exported symbols, infers dependency graphs, detects framework patterns from actual usage, and surfaces architectural decisions that live in the code itself. No manual tagging. No descriptions to fill in. The truth is already in your commits.",
    name: "AST Analysis Engine",
    role: "Core parsing layer",
    metrics: [
      { value: "47+", label: "Symbols parsed per repo", sub: "Exports, components, hooks, handlers" },
      { value: "12+", label: "Frameworks auto-detected", sub: "Next.js, FastAPI, Django, Gin, Axum…" },
    ],
  },
  {
    id: 2,
    title: "Writes technical narratives, not marketing copy",
    body: "The AI layer is calibrated for engineering audiences — not recruiters. It explains tradeoffs, architectural motivations, and implementation depth. Why did you reach for Redis instead of PostgreSQL for the queue? Why are there two API layers? Astra surfaces those decisions in the kind of language a senior engineer uses on a design review, not a job description.",
    name: "Narrative Engine",
    role: "AI reasoning layer",
    metrics: [
      { value: "<60s", label: "Average end-to-end generation", sub: "OAuth to published, 5 repos" },
      { value: "5", label: "Repos analyzed per portfolio", sub: "Configurable — pick your best work" },
    ],
  },
  {
    id: 3,
    title: "Live at your URL in under 60 seconds",
    body: "Connect GitHub, select up to five repositories, and Astra handles everything from there. Analysis runs in parallel, narratives generate concurrently, and your portfolio deploys to a permanent URL at useastra.tech/you. No YAML files. No theme selection. No copy to write. You can edit any generated text before publishing — or ship the first draft and iterate later.",
    name: "Instant Deploy",
    role: "Distribution layer",
    metrics: [
      { value: "<60s", label: "Time from OAuth to live URL", sub: "Median across all users" },
      { value: "0", label: "Config files needed", sub: "Zero setup, zero maintenance" },
    ],
  },
  {
    id: 4,
    title: "Auto-syncs when you push — always current",
    body: "Astra watches your connected repositories via GitHub webhooks. When you push new code, it re-analyzes the delta and updates your portfolio automatically. No manual refresh. No stale \"last updated 8 months ago\" badge. Your portfolio reflects your actual current work at all times, without you thinking about it.",
    name: "Sync Engine",
    role: "Continuous update layer",
    metrics: [
      { value: "< 2 min", label: "Sync lag after push", sub: "Webhook → re-analysis → publish" },
      { value: "100%", label: "Automatic, zero-touch", sub: "No manual refresh ever needed" },
    ],
  },
];

const capabilities: CapabilityCard[] = [
  {
    icon: "⚡",
    title: "Parallel repo analysis",
    body: "All repositories are analyzed concurrently. Five repos parse in the time one takes sequentially.",
  },
  {
    icon: "🔒",
    title: "Read-only GitHub token",
    body: "Astra only requests read permissions. No write access. No private repo access unless you grant it explicitly.",
  },
  {
    icon: "✏️",
    title: "Full editorial control",
    body: "Every generated sentence is editable. Use the AI draft as a starting point, or publish it exactly as written.",
  },
  {
    icon: "🎨",
    title: "Multiple portfolio templates",
    body: "Minimal, Terminal, and Void — three distinct visual identities, each optimised for different engineering aesthetics.",
  },
  {
    icon: "🔗",
    title: "Shareable project deep-links",
    body: "Every project on your portfolio gets its own permanent URL. Link directly to a specific project in applications and messages.",
  },
  {
    icon: "🤖",
    title: "Language-agnostic analysis",
    body: "TypeScript, Python, Rust, Go, Java, Ruby — Astra parses 20+ languages and maps their ecosystem conventions.",
  },
];

/* ─── Animated counter ───────────────────────────── */
function parseMetricValue(raw: string) {
  const value = (raw ?? "").toString().trim();
  const m = value.match(/^([^\d\-+<]*?)\s*([<]?\s*[\-+]?\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*([^\d\s]*)$/);
  if (!m) return { prefix: "", end: 0, suffix: value, decimals: 0 };
  const [, prefix, num, suffix] = m;
  const normalized = num.replace(/,/g, "").replace("<", "");
  const end = parseFloat(normalized);
  const decimals = normalized.split(".")[1]?.length ?? 0;
  return { prefix: prefix ?? "", end: isNaN(end) ? 0 : end, suffix: suffix ?? "", decimals };
}

function MetricStat({ value, label, sub, duration = 1.6 }: Metric & { duration?: number }) {
  const { prefix, end, suffix, decimals } = parseMetricValue(value);
  const ref = useRef<HTMLParagraphElement>(null);
  const inView = useInView(ref as React.RefObject<Element>, { once: true });
  const reduce = useReducedMotion();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduce) { setCurrent(end); return; }
    const ctrl = animate(0, end, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: setCurrent,
    });
    return () => ctrl.stop();
  }, [inView, end, reduce, duration]);

  const formatted = (inView ? current : 0).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <div className="flex flex-col gap-2 text-left p-6">
      <p
        ref={ref}
        className="text-2xl font-bold text-foreground sm:text-4xl"
        aria-label={`${label}: ${value}`}
      >
        {value.startsWith("<") ? "< " : prefix}{formatted}{suffix}
      </p>
      <p className="font-semibold text-foreground text-left text-sm">{label}</p>
      {sub && <p className="text-muted-foreground text-left text-xs">{sub}</p>}
    </div>
  );
}

/* ─── Section ────────────────────────────────────── */
export function Features() {
  const reduce = useReducedMotion();

  return (
    <section id="features" className="py-20 lg:py-28 border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-3xl mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border text-muted-foreground text-[11px] uppercase tracking-[0.18em] mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-brand" aria-hidden />
            How it works under the hood
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground leading-tight" style={{ textWrap: "balance" }}>
            The portfolio that reads your code,{" "}
            <span className="text-muted-foreground font-normal">not just your bio.</span>
          </h2>
          <p className="mt-5 text-muted-foreground leading-relaxed max-w-[52ch]">
            Most portfolio tools ask you to describe yourself. Astra reads your repositories and does it for you — with the technical precision that only comes from actually understanding the code.
          </p>
        </motion.div>

        {/* Feature stories */}
        <div className="flex flex-col gap-16 mb-24">
          {stories.map((story, idx) => {
            const reversed = idx % 2 === 1;
            return (
              <motion.div
                key={story.id}
                initial={reduce ? false : { opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.7, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
                className="grid gap-12 lg:grid-cols-3 xl:gap-20 items-center border-b border-border pb-16 last:border-0 last:pb-0"
              >
                {/* Copy block (takes 2 columns) */}
                <div
                  className={[
                    "flex flex-col gap-8 lg:col-span-2 text-left",
                    reversed
                      ? "lg:order-2 lg:border-l lg:pl-12 xl:pl-16 border-border"
                      : "lg:border-r lg:pr-12 xl:pr-16 border-border",
                  ].join(" ")}
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-muted-foreground/60 tabular-nums">
                        {String(story.id).padStart(2, "0")}
                      </span>
                      <span className="w-8 h-px bg-border" aria-hidden />
                      <span className="text-xs text-muted-foreground uppercase tracking-widest">{story.role}</span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold text-foreground leading-snug">
                      {story.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed text-base">
                      {story.body}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span aria-hidden className="w-6 h-px bg-border" />
                    <span className="text-sm font-semibold text-foreground">{story.name}</span>
                  </div>
                </div>

                {/* Metrics (1 column) */}
                <div className={["grid grid-cols-1 gap-4 self-center", reversed ? "lg:order-1" : ""].join(" ")}>
                  {story.metrics.map((metric, i) => (
                    <MetricStat key={`${story.id}-${i}`} {...metric} />
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Capability grid */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="border-t border-border pt-16"
        >
          <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-2">
            Everything else, included.
          </h3>
          <p className="text-muted-foreground mb-10 max-w-[48ch]">
            No upsells. No "pro plan" gating for basic features. Everything below ships with every Astra account.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {capabilities.map((cap, i) => (
              <motion.div
                key={cap.title}
                initial={reduce ? false : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
                className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3 hover:border-brand/30 transition-colors duration-200"
              >
                <span className="text-xl" aria-hidden>{cap.icon}</span>
                <h4 className="font-semibold text-foreground text-sm">{cap.title}</h4>
                <p className="text-muted-foreground text-sm leading-relaxed">{cap.body}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
