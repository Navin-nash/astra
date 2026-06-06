"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import { GithubLogo, MagnifyingGlass, PaperPlaneTilt } from "@phosphor-icons/react";
import {
  CardHoverReveal,
  CardHoverRevealMain,
  CardHoverRevealContent,
} from "@/components/ui/reveal-on-hover";

const steps = [
  {
    number: "01",
    icon: GithubLogo,
    title: "Connect GitHub",
    body: "One-click OAuth. Astra reads your public repos using your own token. No passwords stored, no permissions beyond what you grant.",
    detail: "Full control over which repos get analyzed.",
    image: "https://picsum.photos/seed/github-oauth-connect/600/400",
    imageAlt: "GitHub OAuth connection flow",
  },
  {
    number: "02",
    icon: MagnifyingGlass,
    title: "Select and analyze",
    body: "Pick up to 5 repos. Astra parses the AST, fetches READMEs, and identifies frameworks, patterns, and dependencies.",
    detail: "Real-time progress stream so you watch it work.",
    image: "https://picsum.photos/seed/code-analysis-scan/600/400",
    imageAlt: "Code analysis in progress",
  },
  {
    number: "03",
    icon: PaperPlaneTilt,
    title: "Publish and share",
    body: "Review the AI-generated copy, tweak what you want, then publish. Your portfolio is live at useastra.qzz.io/you.",
    detail: "Edit anytime. Sync on every push.",
    image: "https://picsum.photos/seed/portfolio-live-deploy/600/400",
    imageAlt: "Live portfolio published",
  },
];

export function HowItWorks() {
  const reduce = useReducedMotion();

  return (
    <section id="how-it-works" className="py-20 lg:py-28 border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">

          {/* Left: sticky heading */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="lg:sticky lg:top-32"
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground leading-tight" style={{ textWrap: "balance" }}>
              From repo to portfolio{" "}
              <span className="text-brand">in three steps.</span>
            </h2>
            <p className="mt-5 text-muted-foreground leading-relaxed max-w-[36ch]">
              No YAML config. No theme files. No writing copy from scratch. Astra
              handles the translation from code to career narrative.
            </p>
            <p className="mt-3 text-xs text-muted-foreground/60">
              Hover each step to preview what it looks like.
            </p>
          </motion.div>

          {/* Right: reveal-on-hover step cards */}
          <div className="flex flex-col gap-4">
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.number}
                  initial={reduce ? false : { opacity: 0, x: 24 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                >
                  <CardHoverReveal className="rounded-xl border border-border overflow-hidden h-48">
                    {/* Background image that scales on hover */}
                    <CardHoverRevealMain
                      initialScale={1}
                      hoverScale={1.04}
                      className="absolute inset-0"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={step.image}
                        alt={step.imageAlt}
                        className="w-full h-full object-cover opacity-15"
                      />
                    </CardHoverRevealMain>

                    {/* Base content always visible */}
                    <div className="relative z-10 flex gap-5 p-5 h-full">
                      <div className="flex flex-col items-center gap-3 shrink-0">
                        <div className="w-10 h-10 rounded-xl bg-brand-muted flex items-center justify-center text-brand shrink-0">
                          <Icon size={18} weight="duotone" />
                        </div>
                        {i < 2 && (
                          <div className="w-px flex-1 bg-gradient-to-b from-border to-transparent" aria-hidden />
                        )}
                      </div>
                      <div className="flex flex-col gap-2 pt-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono text-muted-foreground/50 tracking-widest">
                            {step.number}
                          </span>
                          <h3 className="font-bold text-foreground text-base tracking-tight">
                            {step.title}
                          </h3>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {step.body}
                        </p>
                      </div>
                    </div>

                    {/* Hover overlay reveals detail */}
                    <CardHoverRevealContent className="rounded-lg bg-foreground/90 backdrop-blur-sm">
                      <p className="text-sm text-background/80 leading-relaxed font-medium">
                        {step.detail}
                      </p>
                    </CardHoverRevealContent>
                  </CardHoverReveal>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
