"use client";

import * as React from "react";
import { useRef, useEffect, useState } from "react";
import { motion, useReducedMotion, useInView, animate } from "motion/react";
import Image from "next/image";

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
  image: string;
  metrics: Metric[];
}

/* ─── Data ───────────────────────────────────────── */
const stories: FeatureStory[] = [
  {
    id: 1,
    title: "Reads code structure, not just README files",
    body: "Astra uses AST-level parsing to understand how you actually build. It identifies frameworks, patterns, and architectural decisions from the code itself — no manual descriptions required.",
    name: "AST Analysis Engine",
    role: "Core technology",
    image: "/images/features/ast-analysis.png",
    metrics: [
      { value: "47+", label: "Symbols parsed per repo", sub: "Exports, components, hooks" },
      { value: "12+", label: "Frameworks auto-detected", sub: "From Next.js to FastAPI" },
    ],
  },
  {
    id: 2,
    title: "Writes technical narratives, not marketing copy",
    body: "Astra generates project write-ups that explain architecture, design decisions, and engineering depth in plain language. The kind of context a hiring engineer actually needs to evaluate you.",
    name: "Narrative Engine",
    role: "AI layer",
    image: "/images/features/narrative-engine.png",
    metrics: [
      { value: "90s", label: "Average generation time", sub: "End-to-end analysis" },
      { value: "5", label: "Repos per portfolio", sub: "Fully configurable" },
    ],
  },
  {
    id: 3,
    title: "Live URL in under 90 seconds, zero config",
    body: "Connect GitHub, select repos, publish. Your portfolio is live at astra.build/u/you within 60 seconds. No YAML files, no theme selection, no writing copy from scratch.",
    name: "Instant Deploy",
    role: "Distribution layer",
    image: "/images/features/instant-deploy.png",
    metrics: [
      { value: "60s", label: "Time to live URL", sub: "From OAuth to published" },
      { value: "0", label: "Config files needed", sub: "Zero setup required" },
    ],
  },
];

/* ─── Animated counter ───────────────────────────── */
function parseMetricValue(raw: string) {
  const value = (raw ?? "").toString().trim();
  const m = value.match(/^([^\d\-+]*?)\s*([\-+]?\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*([^\d\s]*)$/);
  if (!m) return { prefix: "", end: 0, suffix: value, decimals: 0 };
  const [, prefix, num, suffix] = m;
  const normalized = num.replace(/,/g, "");
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
        {prefix}{formatted}{suffix}
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
          className="max-w-2xl mb-16"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground leading-tight" style={{ textWrap: "balance" }}>
            The portfolio that reads your code,{" "}
            <span className="text-muted-foreground font-normal">not just your bio.</span>
          </h2>
        </motion.div>

        {/* Stories */}
        <div className="flex flex-col gap-16">
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
                {/* Left: image + copy (takes 2 columns) */}
                <div
                  className={[
                    "flex flex-col sm:flex-row gap-8 lg:col-span-2 text-left",
                    reversed
                      ? "lg:order-2 lg:border-l lg:pl-12 xl:pl-16 border-border"
                      : "lg:border-r lg:pr-12 xl:pr-16 border-border",
                  ].join(" ")}
                >
                  <Image
                    src={story.image}
                    alt={story.title}
                    width={300}
                    height={400}
                    className="aspect-3/4 h-auto w-full max-w-50 rounded-xl object-cover ring-1 ring-border hover:scale-[1.02] transition-transform duration-300 shrink-0"
                    loading="lazy"
                  />
                  <figure className="flex flex-col justify-between gap-6 text-left">
                    <blockquote>
                      <h3 className="text-lg sm:text-xl font-semibold text-foreground leading-snug mb-3">
                        {story.title}
                      </h3>
                      <p className="text-muted-foreground leading-relaxed">
                        {story.body}
                      </p>
                    </blockquote>
                    <figcaption className="flex items-center gap-3">
                      <span
                        aria-hidden
                        className="w-6 h-px bg-border"
                      />
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-foreground">{story.name}</span>
                        <span className="text-xs text-muted-foreground">{story.role}</span>
                      </div>
                    </figcaption>
                  </figure>
                </div>

                {/* Right: metrics (1 column) */}
                <div className={["grid grid-cols-1 gap-4 self-center", reversed ? "lg:order-1" : ""].join(" ")}>
                  {story.metrics.map((metric, i) => (
                    <MetricStat key={`${story.id}-${i}`} {...metric} />
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
