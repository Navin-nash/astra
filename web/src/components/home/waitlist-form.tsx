"use client";

import * as React from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { ArrowRight, CheckCircle } from "@phosphor-icons/react";
import { toast } from "sonner";
import { joinWaitlist } from "@/app/actions/waitlist";
import { RippleButton } from "@/components/ui/ripple-button";

export function WaitlistForm() {
  const [email, setEmail] = React.useState("");
  const [state, setState] = React.useState<"idle" | "loading" | "success">("idle");
  const reduce = useReducedMotion();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || state !== "idle") return;
    setState("loading");

    const result = await joinWaitlist(email);

    if (result.success) {
      setState("success");
      setEmail("");
    } else {
      setState("idle");
      toast.error(result.error ?? "Something went wrong. Try again.");
    }
  }

  if (state === "success") {
    return (
      <motion.div
        initial={reduce ? false : { opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-3 px-5 py-3 rounded-full bg-brand-muted border border-brand/20 text-brand text-sm font-medium"
      >
        <CheckCircle size={16} weight="fill" />
        You are on the list. We will be in touch.
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 w-full max-w-md">
      <div className="flex-1 relative">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@github.com"
          required
          aria-label="Email address"
          className="w-full h-11 px-4 rounded-full bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
        />
      </div>
      <RippleButton
        type="submit"
        disabled={state === "loading"}
        rippleColor="#ffffff40"
        className="h-11 px-5 rounded-full border-0 bg-primary text-primary-foreground text-sm font-medium gap-2 hover:bg-primary/90 active:scale-[0.98] active:-translate-y-px transition-all disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
      >
        <span className="flex items-center gap-2">
          {state === "loading" ? (
            <span className="w-4 h-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
          ) : (
            <>
              Get early access
              <ArrowRight size={14} />
            </>
          )}
        </span>
      </RippleButton>
    </form>
  );
}
