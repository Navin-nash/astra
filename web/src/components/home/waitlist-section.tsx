"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import { WaitlistForm } from "@/components/home/waitlist-form";
import { WavePath } from "@/components/wave-path";

const benefits = [
  {
    title: "First access when we open",
    body: "Waitlist members get access before the public launch. No scrambling, no queues.",
  },
  {
    title: "Influence the roadmap",
    body: "Early users talk directly to the builder. Your feedback shapes what ships next.",
  },
  {
    title: "Portfolio in under 60 seconds",
    body: "On day one: connect GitHub, pick repos, get a live portfolio URL. That's the whole flow.",
  },
  {
    title: "Always up to date",
    body: "Push new code and your portfolio updates automatically — no manual edits needed.",
  },
];

export function WaitlistSection() {
  const reduce = useReducedMotion();

  return (
    <section id="waitlist" className="py-20 lg:py-28 border-t border-border overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Wave divider */}
        <div className="flex justify-center mb-16">
          <WavePath className="text-border hover:text-brand transition-colors duration-300" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">

          {/* Left: copy + form */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col gap-6"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border text-muted-foreground text-[11px] uppercase tracking-[0.18em] w-fit">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_6px_2px_rgba(74,222,128,0.5)]" aria-hidden />
              Accepting signups
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground leading-tight" style={{ textWrap: "balance" }}>
              Your repos are already{" "}
              <span className="text-brand">your best resume.</span>
            </h2>

            <p className="text-muted-foreground text-base leading-relaxed max-w-[46ch]">
              You&apos;ve shipped real things. Astra reads what you built and tells that story to
              the people who matter — without you writing a single word of copy. Join the waitlist
              and be first through the door.
            </p>

            <div className="w-full max-w-md">
              <WaitlistForm />
            </div>

            {/* Social proof */}
            <div className="flex items-center gap-4 mt-2">
              <div className="flex -space-x-2" aria-hidden>
                {[47, 92, 23, 61, 84].map((seed) => (
                  <div
                    key={seed}
                    className="w-7 h-7 rounded-full border-2 border-background bg-muted ring-1 ring-border overflow-hidden"
                    style={{ backgroundImage: `url(https://picsum.photos/seed/user-${seed}/28/28)`, backgroundSize: "cover" }}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">400+ engineers</span> already on the list
              </p>
            </div>

            <p className="text-xs text-muted-foreground/50">
              No spam. No dark patterns. Unsubscribe in one click.
            </p>
          </motion.div>

          {/* Right: benefit cards */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            {benefits.map((benefit, i) => (
              <motion.div
                key={benefit.title}
                initial={reduce ? false : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5, delay: 0.1 + i * 0.07, ease: [0.16, 1, 0.3, 1] }}
                className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3 hover:border-brand/30 transition-colors duration-200"
              >
                <div className="w-6 h-6 rounded-md bg-brand/10 flex items-center justify-center">
                  <span className="w-2 h-2 rounded-full bg-brand" aria-hidden />
                </div>
                <h3 className="font-semibold text-foreground text-sm">{benefit.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{benefit.body}</p>
              </motion.div>
            ))}

            {/* Quote */}
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="sm:col-span-2 rounded-xl border border-brand/20 bg-brand/5 p-5 flex flex-col gap-3"
            >
              <p className="text-sm text-foreground/80 leading-relaxed italic">
                &ldquo;I spent two hours building my portfolio last year. With Astra I had something
                better live in under a minute — and it explained my projects better than I could.&rdquo;
              </p>
              <p className="text-xs text-muted-foreground font-medium">
                Beta tester · Senior Engineer @ fintech startup
              </p>
            </motion.div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
