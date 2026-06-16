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
          Astra detected a full-stack Next.js application using App Router,
          server components, and a Prisma-managed PostgreSQL database. The AI
          narrative explains the architecture, the data model decisions, and the
          deployment setup on Vercel.
        </p>
        <ul className="space-y-2 list-none">
          {[
            "3 production applications analyzed",
            "React, Next.js, Node.js ecosystem",
            "Prisma + PostgreSQL data layer",
            "GitHub Actions CI/CD pipeline",
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
          Astra parsed training pipelines, model architectures, and evaluation
          scripts. The narrative explains model design decisions, dataset
          management patterns, and reproducibility practices — turning
          research code into a readable technical story.
        </p>
        <ul className="space-y-2 list-none">
          {[
            "5 ML project repositories",
            "PyTorch, HuggingFace, scikit-learn",
            "Custom training pipelines",
            "Model evaluation and benchmarking",
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
          Astra identified memory-safe patterns in Rust and concurrent service
          architecture in Go. The portfolio highlights low-level expertise,
          performance optimizations, and systems-level thinking that a standard
          resume rarely conveys.
        </p>
        <ul className="space-y-2 list-none">
          {[
            "CLI tools and async runtimes",
            "Rust ownership patterns analyzed",
            "Go concurrent service design",
            "Performance benchmarks documented",
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
          <p className="mt-4 text-muted-foreground max-w-[44ch] leading-relaxed">
            Click any card to see how Astra shapes your code into a technical
            narrative. Every portfolio is unique to the engineer.
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
              transition={{ duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
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
      </div>
    </section>
  );
}
