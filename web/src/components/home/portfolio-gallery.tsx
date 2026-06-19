"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import { ExpandableCard } from "@/components/expandable-card";
import { DiaTextReveal } from "@/components/ui/dia-text-reveal";

const portfolioExamples = [
  {
    title: "Full-Stack Engineer",
    description: "Next.js + PostgreSQL",
    src: "/images/portfolio/fullstack.png",
    children: (
      <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
        <p>
          Astra detected a full-stack Next.js application using App Router, React Server Components,
          and a Prisma-managed PostgreSQL database. The AI narrative explains the architecture behind
          the auth flow, the data model decisions driving the schema, and the trade-off between edge
          rendering and database-heavy queries. It reads like a design doc — not a feature list.
        </p>
        <ul className="space-y-2 list-none">
          {[
            "3 production applications analyzed in 47 seconds",
            "App Router, RSC, and streaming patterns detected",
            "Prisma schema → data model narrative generated",
            "GitHub Actions CI/CD pipeline documented",
            "Environment isolation and deployment strategy inferred",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-brand shrink-0" aria-hidden />
              {item}
            </li>
          ))}
        </ul>
      </div>
    ),
  },
  {
    title: "ML Engineer",
    description: "Python + PyTorch",
    src: "/images/portfolio/ml-engineer.png",
    children: (
      <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
        <p>
          Astra parsed training pipelines, custom model architectures, and evaluation harnesses
          across five repositories. The narrative explains dataset management strategies, model
          design decisions and their experimental rationale, and reproducibility practices.
          It turns research code into a coherent technical story — the kind hiring managers
          at AI labs actually want to read.
        </p>
        <ul className="space-y-2 list-none">
          {[
            "5 ML repositories, 3 different model families",
            "PyTorch, HuggingFace Transformers, scikit-learn",
            "Custom training loops and loss functions surfaced",
            "Evaluation metrics and benchmarking strategies documented",
            "Experiment tracking and reproducibility patterns noted",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-brand shrink-0" aria-hidden />
              {item}
            </li>
          ))}
        </ul>
      </div>
    ),
  },
  {
    title: "Systems Engineer",
    description: "Rust + Go",
    src: "/images/portfolio/systems-engineer.png",
    children: (
      <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
        <p>
          Astra identified memory-safety patterns in Rust ownership models and concurrent service
          architecture in Go. The portfolio highlights low-level expertise, async runtime design,
          and performance optimization decisions that a standard resume rarely conveys. If you
          wrote a zero-copy parser or a lock-free queue, Astra will find it and explain why it
          matters.
        </p>
        <ul className="space-y-2 list-none">
          {[
            "CLI tools, async runtimes, and systems daemons",
            "Rust ownership and lifetime patterns analyzed",
            "Go goroutine concurrency and channel patterns",
            "SIMD optimizations and unsafe blocks documented",
            "Performance benchmarks and flamegraph context inferred",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-brand shrink-0" aria-hidden />
              {item}
            </li>
          ))}
        </ul>
      </div>
    ),
  },
];

export function PortfolioGallery() {
  const reduce = useReducedMotion();

  return (
    <section id="portfolio" className="py-20 lg:py-28 border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mb-12"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border text-muted-foreground text-[11px] uppercase tracking-[0.18em] mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-brand" aria-hidden />
            Portfolio examples
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground leading-tight" style={{ textWrap: "balance" }}>
            What Astra builds{" "}
            <DiaTextReveal
              text="for you."
              textColor="var(--muted-foreground)"
              startOnView
              once
              className="font-normal"
            />
          </h2>
          <p className="mt-4 text-muted-foreground max-w-[52ch] leading-relaxed">
            Click any card to see how Astra translates code into a technical narrative. Every
            portfolio is unique to the engineer — shaped by your actual architecture, not a
            template you filled in.
          </p>
        </motion.div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {portfolioExamples.map((example, i) => (
            <motion.div
              key={example.title}
              initial={reduce ? false : { opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
            >
              <ExpandableCard
                title={example.title}
                src={example.src}
                description={example.description}
                className="hover:border-brand/30 hover:shadow-sm transition-all duration-300 bg-card border-border"
                classNameExpanded="bg-background"
              >
                {example.children}
              </ExpandableCard>
            </motion.div>
          ))}
        </div>

        {/* Bottom note */}
        <motion.p
          initial={reduce ? false : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-10 text-center text-sm text-muted-foreground/60"
        >
          Every portfolio is generated fresh from your code — never from a shared template.
        </motion.p>
      </div>
    </section>
  );
}
