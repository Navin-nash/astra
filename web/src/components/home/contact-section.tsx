"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import { Mail, MessageSquare, Sparkles } from "lucide-react";

const CONTACT_EMAIL = "support@useastra.qzz.io";

const reasons = [
  {
    icon: MessageSquare,
    title: "Product feedback",
    description: "Tell us what's working, what isn't, and what you wish existed.",
  },
  {
    icon: Sparkles,
    title: "Feature requests",
    description: "Got an idea? We're building in public and your input shapes the roadmap.",
  },
  {
    icon: Mail,
    title: "General enquiries",
    description: "Anything else — partnerships, press, or just saying hi.",
  },
];

export function ContactSection() {
  const reduce = useReducedMotion();

  return (
    <section id="contact" className="py-20 lg:py-28 border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-4">
            We&apos;d love to hear from you
          </h2>
          <p className="text-muted-foreground text-base max-w-[48ch] mx-auto leading-relaxed">
            Astra is early and actively evolving. Your feedback and ideas directly shape what we
            build next — don&apos;t hold back.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
          {reasons.map((reason, i) => (
            <motion.div
              key={reason.title}
              initial={reduce ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-xl border border-border bg-card p-6 flex flex-col gap-3"
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
          className="flex justify-center"
        >
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="group inline-flex items-center gap-2.5 rounded-full border border-border bg-card px-6 py-3 text-sm font-medium text-foreground transition-all duration-200 hover:border-brand hover:text-brand hover:bg-brand/5"
          >
            <Mail className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
            {CONTACT_EMAIL}
          </a>
        </motion.div>
      </div>
    </section>
  );
}
