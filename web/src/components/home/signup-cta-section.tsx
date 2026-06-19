"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight } from "@phosphor-icons/react";
import { RippleButton } from "@/components/ui/ripple-button";
import { WavePath } from "@/components/wave-path";

export function SignupCtaSection() {
  const reduce = useReducedMotion();
  const router = useRouter();

  return (
    <section id="signup" className="py-20 lg:py-28 border-t border-border overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="flex justify-center mb-16">
          <WavePath className="text-border hover:text-brand transition-colors duration-300" />
        </div>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center text-center gap-6 max-w-2xl mx-auto"
        >

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground leading-tight" style={{ textWrap: "balance" }}>
            Your repos are already{" "}
            <span className="text-brand">your best resume.</span>
          </h2>

          <p className="text-muted-foreground text-base leading-relaxed max-w-[46ch]">
            Connect GitHub once. Astra reads your codebase, surfaces your architecture,
            and ships a portfolio that shows how you actually build — live in under 60 seconds.
          </p>

          <div className="flex items-center gap-3 flex-wrap justify-center mt-2">
            <RippleButton
              onClick={() => router.push("/login")}
              rippleColor="#ffffff40"
              className="h-11 px-6 rounded-full border-0 bg-foreground text-background text-sm font-semibold hover:bg-foreground/90 active:scale-[0.97] transition-all"
            >
              <span className="flex items-center gap-2 whitespace-nowrap">
                Get started free
                <ArrowRight size={14} aria-hidden />
              </span>
            </RippleButton>
            <RippleButton
              onClick={() => router.push("/docs")}
              rippleColor="#00000010"
              className="h-11 px-6 rounded-full border border-border bg-transparent text-foreground text-sm font-medium hover:border-brand hover:text-brand active:scale-[0.97] transition-all whitespace-nowrap"
            >
              Read the docs
            </RippleButton>
          </div>

        </motion.div>
      </div>
    </section>
  );
}
