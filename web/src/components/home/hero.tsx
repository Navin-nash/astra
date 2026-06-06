"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, GithubLogo } from "@phosphor-icons/react";
import { WaitlistForm } from "@/components/home/waitlist-form";

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, delay, ease: EASE },
});

const TRUST_ITEMS = [
  { icon: GithubLogo, label: "GitHub OAuth" },
  { label: "No credit card" },
  { label: "Live in 60 seconds" },
];

export function Hero() {
  const reduce = useReducedMotion();

  return (
    <section className="relative min-h-[100dvh] flex flex-col justify-center overflow-hidden pt-20">
      {/* Subtle dot grid */}
      <div className="absolute inset-0 grid-dots opacity-30 pointer-events-none" />

      {/* Soft brand glow behind headline */}
      <div
        className="absolute top-1/3 left-0 w-[500px] h-[500px] pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, oklch(0.65 0.20 47 / 0.06) 0%, transparent 65%)",
        }}
        aria-hidden
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* Left: copy */}
          <div className="flex flex-col gap-6">
            {/* Badge */}
            <motion.div
              {...(reduce ? {} : fadeUp(0.1))}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-brand/25 bg-brand-muted text-brand text-xs font-semibold w-fit"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" aria-hidden />
              Now accepting early access
            </motion.div>

            {/* Headline */}
            <motion.h1
              {...(reduce ? {} : fadeUp(0.2))}
              className="text-5xl sm:text-6xl lg:text-6xl xl:text-7xl font-bold tracking-tight leading-[1.0] text-foreground"
              style={{ textWrap: "balance" }}
            >
              Your GitHub,{" "}
              <br className="hidden sm:block" />
              <span className="text-brand">as a portfolio.</span>
            </motion.h1>

            {/* Subtext */}
            <motion.p
              {...(reduce ? {} : fadeUp(0.3))}
              className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-[42ch]"
            >
              Astra reads your code structure. AI-powered summaries, instant
              deployment, zero manual work.
            </motion.p>

            {/* CTA form */}
            <motion.div
              {...(reduce ? {} : fadeUp(0.4))}
              className="flex flex-col sm:flex-row gap-3 max-w-md"
            >
              <WaitlistForm />
            </motion.div>

            {/* Trust strip */}
            <motion.div
              {...(reduce ? {} : fadeUp(0.5))}
              className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground"
            >
              {TRUST_ITEMS.map(({ icon: Icon, label }, i) => (
                <React.Fragment key={label}>
                  {i > 0 && (
                    <span aria-hidden className="w-px h-3 bg-border" />
                  )}
                  <span className="flex items-center gap-1.5">
                    {Icon && <Icon size={13} aria-hidden />}
                    {label}
                  </span>
                </React.Fragment>
              ))}
            </motion.div>
          </div>

          {/* Right: terminal preview */}
          <motion.div
            initial={reduce ? false : { opacity: 0, x: 32 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.9, delay: 0.3, ease: EASE }}
            className="hidden lg:block"
          >
            <CodePreview />
          </motion.div>
        </div>

        {/* Scroll indicator strip */}
        <motion.div
          {...(reduce ? {} : fadeUp(0.8))}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden lg:flex items-center gap-2"
        >
          <span className="w-px h-8 bg-gradient-to-b from-transparent via-border to-transparent" aria-hidden />
        </motion.div>
      </div>
    </section>
  );
}

function CodePreview() {
  return (
    <div className="relative rounded-2xl border border-border overflow-hidden bg-foreground shadow-xl shadow-foreground/10">
      {/* Terminal bar */}
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border/20 bg-foreground/95">
        <span className="w-3 h-3 rounded-full bg-red-500/70" aria-hidden />
        <span className="w-3 h-3 rounded-full bg-yellow-500/70" aria-hidden />
        <span className="w-3 h-3 rounded-full bg-green-500/70" aria-hidden />
        <span className="ml-4 text-[11px] font-mono text-background/40">
          astra analyze ./src
        </span>
      </div>

      {/* Code body */}
      <div className="p-5 font-mono text-[12px] leading-relaxed space-y-1 bg-foreground">
        <CodeLine delay={0.6} color="muted"># Parsing AST...</CodeLine>
        <CodeLine delay={0.75} color="brand">Framework: Next.js 14 (App Router)</CodeLine>
        <CodeLine delay={0.9} color="muted">Exports: 47 symbols across 23 modules</CodeLine>
        <CodeLine delay={1.05} color="brand">Patterns: server-components, custom-hooks</CodeLine>
        <CodeLine delay={1.2} color="muted">Dependencies: react, tailwindcss, prisma</CodeLine>
        <div className="pt-2">
          <CodeLine delay={1.35} color="green">Generating portfolio summary...</CodeLine>
        </div>
        <div className="pt-2 space-y-1">
          <CodeLine delay={1.5} color="muted">{`mdx_content = """`}</CodeLine>
          <CodeLine delay={1.6} color="white" indent={1}>{`<ProjectSummary title="my-saas-app">`}</CodeLine>
          <CodeLine delay={1.7} color="muted" indent={2}>A full-stack SaaS built with Next.js App</CodeLine>
          <CodeLine delay={1.8} color="muted" indent={2}>Router, featuring server components and...</CodeLine>
          <CodeLine delay={1.9} color="white" indent={1}>{`</ProjectSummary>`}</CodeLine>
          <CodeLine delay={2.0} color="muted">{`"""`}</CodeLine>
        </div>
        <div className="pt-3 flex items-center gap-2">
          <CodeLine delay={2.1} color="green">Published at useastra.qzz.io/you</CodeLine>
          <BlinkingCursor delay={2.1} />
        </div>
      </div>
    </div>
  );
}

function CodeLine({
  children,
  delay = 0,
  color = "muted",
  indent = 0,
}: {
  children: React.ReactNode;
  delay?: number;
  color?: "muted" | "brand" | "green" | "white";
  indent?: number;
}) {
  const colors: Record<string, string> = {
    muted: "text-background/40",
    brand: "text-brand",
    green: "text-green-400",
    white: "text-background/90",
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, delay }}
      className={`${colors[color] ?? colors.muted} ${
        indent === 1 ? "pl-4" : indent === 2 ? "pl-8" : ""
      }`}
    >
      {children}
    </motion.div>
  );
}

function BlinkingCursor({ delay = 0 }: { delay?: number }) {
  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 1, 0] }}
      transition={{ duration: 1.2, delay, repeat: Infinity, times: [0, 0.1, 0.8, 1] }}
      className="inline-block w-2 h-4 bg-brand align-middle"
      aria-hidden
    />
  );
}
