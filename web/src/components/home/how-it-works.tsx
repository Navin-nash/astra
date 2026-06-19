"use client";

import * as React from "react";
import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { GithubLogo, MagnifyingGlass, PaperPlaneTilt } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface OverlayItem {
  label: string;
  done: boolean;
  detail?: string;
}

const steps = [
  {
    number: "01",
    icon: GithubLogo,
    title: "Connect GitHub",
    body: "One-click OAuth. Astra reads your public repos with a scoped token. No passwords stored, no permissions beyond read-only.",
    image: "/images/steps/github-connect.png",
    imageAlt: "GitHub OAuth connection flow",
    overlay: {
      title: "Repository access",
      items: [
        { label: "my-saas-app", done: true, detail: "Next.js · Prisma" },
        { label: "api-gateway", done: true, detail: "Go · gRPC" },
        { label: "ml-experiments", done: false, detail: "PyTorch" },
        { label: "dotfiles", done: false, detail: "Shell scripts" },
      ] as OverlayItem[],
    },
  },
  {
    number: "02",
    icon: MagnifyingGlass,
    title: "Select and analyze",
    body: "Pick up to 5 repos. Astra runs AST analysis, identifies frameworks, patterns, and dependencies without reading your source code.",
    image: "/images/steps/code-analysis.png",
    imageAlt: "Code analysis in progress",
    overlay: {
      title: "Analysis complete",
      items: [
        { label: "Next.js detected", done: true },
        { label: "47 exports parsed", done: true },
        { label: "Prisma + PostgreSQL", done: true },
        { label: "Generating narrative...", done: false },
      ] as OverlayItem[],
    },
  },
  {
    number: "03",
    icon: PaperPlaneTilt,
    title: "Publish and share",
    body: "Review the AI-generated write-ups, edit anything you want, then publish. Your portfolio is live at useastra.tech/u/you.",
    image: "/images/steps/portfolio-live.png",
    imageAlt: "Live portfolio published",
    overlay: {
      title: "Portfolio live",
      items: [
        { label: "Published successfully", done: true, detail: "useastra.tech/you" },
        { label: "Auto-sync enabled", done: true },
        { label: "Custom domain", done: false },
        { label: "Analytics", done: false },
      ] as OverlayItem[],
    },
  },
];

export function HowItWorks() {
  const [active, setActive] = useState(0);
  const reduce = useReducedMotion();
  const activeStep = steps[active];

  return (
    <section id="how-it-works" className="py-20 lg:py-28 border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mb-10"
        >
          <h2
            className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground leading-tight"
            style={{ textWrap: "balance" } as React.CSSProperties}
          >
            From repo to portfolio{" "}
            <span className="text-brand">in three steps.</span>
          </h2>
          <p className="mt-5 text-muted-foreground leading-relaxed max-w-[36ch]">
            No YAML. No theme files. No copy to write from scratch. Astra handles the translation from code to career narrative.
          </p>
        </motion.div>

        {/* Step tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 mb-6">
          {steps.map((step, i) => {
            const Icon = step.icon;
            const isActive = active === i;
            return (
              <motion.button
                key={step.number}
                onClick={() => setActive(i)}
                initial={reduce ? false : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                className={cn(
                  "text-left sm:pr-10 pb-6 pt-5 border-t-2 transition-all duration-200 group",
                  isActive ? "border-brand" : "border-border hover:border-brand/40"
                )}
              >
                <div className="flex flex-col gap-3">
                  <div
                    className={cn(
                      "w-9 h-9 rounded-lg flex items-center justify-center transition-colors duration-200",
                      isActive
                        ? "bg-brand-muted text-brand"
                        : "bg-muted text-muted-foreground group-hover:text-foreground"
                    )}
                  >
                    <Icon size={16} weight="duotone" />
                  </div>
                  <div>
                    <h3
                      className={cn(
                        "font-bold text-base tracking-tight mb-2 transition-colors duration-200",
                        isActive
                          ? "text-foreground"
                          : "text-muted-foreground group-hover:text-foreground"
                      )}
                    >
                      {step.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {step.body}
                    </p>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Preview panel */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="relative rounded-2xl overflow-hidden border border-border bg-card h-95 lg:h-115"
        >
          {/* Background image with crossfade */}
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activeStep.image}
                alt={activeStep.imageAlt}
                className="w-full h-full object-cover opacity-100"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </motion.div>
          </AnimatePresence>

          {/* Dot grid */}
          <div className="absolute inset-0 grid-dots opacity-25 pointer-events-none" />

          {/* Gradient depth */}
          <div className="absolute inset-0 bg-linear-to-br from-card/40 via-transparent to-card/20 pointer-events-none" />

          {/* Floating details card */}
          {/* <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="absolute top-6 right-6 bg-background/96 backdrop-blur-md rounded-xl border border-border shadow-xl w-60 p-5"
            >
              <p className="text-sm font-semibold text-foreground mb-4">
                {activeStep.overlay.title}
              </p>
              <div className="flex flex-col gap-3.5">
                {activeStep.overlay.items.map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    {item.done ? (
                      <CheckCircle
                        size={17}
                        className="text-brand shrink-0 mt-px"
                        weight="fill"
                      />
                    ) : (
                      <Circle
                        size={17}
                        className="text-muted-foreground/30 shrink-0 mt-px"
                        weight="regular"
                      />
                    )}
                    <div className="min-w-0">
                      <span
                        className={cn(
                          "text-sm leading-snug",
                          item.done ? "text-foreground" : "text-muted-foreground"
                        )}
                      >
                        {item.label}
                      </span>
                      {item.detail && (
                        <p className="text-xs text-muted-foreground/60 mt-0.5 font-mono">
                          {item.detail}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </AnimatePresence> */}

          {/* Step indicator — bottom left */}
          <div className="absolute bottom-5 left-6 flex items-center gap-3">
            <div className="flex gap-1.5">
              {steps.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  aria-label={`Go to step ${i + 1}`}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    active === i
                      ? "bg-brand w-5"
                      : "bg-border w-1.5 hover:bg-muted-foreground"
                  )}
                />
              ))}
            </div>
          </div>
        </motion.div>

      </div>
    </section>
  );
}
