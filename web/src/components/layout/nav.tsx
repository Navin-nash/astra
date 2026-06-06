"use client";

import * as React from "react";
import { motion, useScroll, useMotionValueEvent, useReducedMotion } from "motion/react";
import Link from "next/link";
import Image from "next/image";
import { RippleButton } from "@/components/ui/ripple-button";

export function Nav() {
  const { scrollY } = useScroll();
  const reduce = useReducedMotion();
  const [scrolled, setScrolled] = React.useState(false);

  useMotionValueEvent(scrollY, "change", (v) => {
    setScrolled(v > 40);
  });

  return (
    <motion.header
      className="fixed top-0 left-0 right-0 z-50 flex justify-center px-4 pt-4"
      initial={reduce ? false : { opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <nav
        className={`flex items-center gap-6 px-5 h-14 rounded-full transition-all duration-300 ${
          scrolled
            ? "bg-background/90 backdrop-blur-md border border-border shadow-sm shadow-black/8"
            : "bg-transparent border border-transparent"
        }`}
      >
        {/* Logo */}
        <Link href="/" className="flex items-center shrink-0">
          <Image
            src="/favicon.svg"
            alt=""
            height={32}
            width={96}
            aria-hidden
            className="h-8 w-auto"
            style={{ width: "auto" }}
          />
        </Link>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-5">
          {[
            { label: "Features", href: "#features" },
            { label: "How it works", href: "#how-it-works" },
            { label: "Examples", href: "#portfolio" },
          ].map(({ label, href }) => (
            <Link
              key={label}
              href={href}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 ml-auto md:ml-0">

          <RippleButton
            onClick={() => { window.location.hash = "waitlist"; }}
            rippleColor="#ffffff40"
            className="h-8 px-4 text-xs font-semibold rounded-full border-0 bg-foreground text-background hover:bg-foreground/90 active:scale-[0.97] transition-all"
          >
            Join waitlist
          </RippleButton>
        </div>
      </nav>
    </motion.header>
  );
}
