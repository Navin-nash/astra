"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import { WaitlistForm } from "@/components/home/waitlist-form";
import { WavePath } from "@/components/wave-path";

export function WaitlistSection() {
  const reduce = useReducedMotion();

  return (
    <section id="waitlist" className="py-20 lg:py-28 border-t border-border overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Interactive WavePath divider */}
        <div className="flex justify-center mb-16">
          <WavePath className="text-border hover:text-brand transition-colors duration-300" />
        </div>

        {/* CTA content */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center text-center gap-6 max-w-2xl mx-auto"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground leading-tight" style={{ textWrap: "balance" }}>
            Your repos are already
            <br />
            <span className="text-brand">your best resume.</span>
          </h2>

          <p className="text-muted-foreground text-base leading-relaxed max-w-[44ch]">
            Join the waitlist. Be first to turn your GitHub into a portfolio
            that shows how you actually think and build.
          </p>

          <div className="mt-2 w-full max-w-md">
            <WaitlistForm />
          </div>

          {/* Social proof hint */}
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
              Join 400+ engineers already on the list
            </p>
          </div>

          <p className="text-xs text-muted-foreground/50">
            No spam. No fluff. Just early access when we ship.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
