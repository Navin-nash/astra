'use client';

import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, ArrowDown } from '@phosphor-icons/react';
import { WordRotate } from '@/components/ui/word-rotate';
import { VideoText } from '@/components/ui/video-text';
import { Button } from '@/components/ui/button';

const DEMO_VIDEO =
  'https://res.cloudinary.com/dtqadlaim/video/upload/v1781593121/hero_catr9o.mp4';

const ROLES = [
  'full-stack engineers',
  'ML researchers',
  'systems builders',
  'backend developers',
  'open-source contributors',
];

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE } },
};

// font-size for each line; container must be ~2.3× taller to fit two lines
const HEADLINE_FS = 'clamp(3rem, 11vw, 160px)';
const HEADLINE_H  = 'clamp(6.8rem, 26vw, 380px)';

export function Hero() {
  const reduce = useReducedMotion();

  return (
    <section className="relative min-h-dvh flex flex-col overflow-hidden bg-background">

      {/* ── Layered grid / glow background ── */}
      <div className="absolute inset-0 z-0 pointer-events-none select-none" aria-hidden>

        {/* 1. Brand radial glow from bottom-left corner */}
        <div
          className="absolute inset-0 opacity-85 dark:opacity-100 transition-opacity duration-500"
          style={{
            background: [
              'radial-gradient(ellipse 110% 130% at 0% 100%,',
              'color-mix(in oklch, var(--brand) 95%, white) 0%,',
              'color-mix(in oklch, var(--brand) 72%, transparent) 22%,',
              'color-mix(in oklch, var(--brand) 38%, transparent) 44%,',
              'color-mix(in oklch, var(--brand) 10%, transparent) 64%,',
              'transparent 80%)',
            ].join(' '),
          }}
        />

        {/* 2. Grid lines — masked to the glow area only */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: [
              'linear-gradient(color-mix(in oklch, var(--background) 94%, var(--foreground)) 1.5px, transparent 1.5px)',
              'linear-gradient(90deg, color-mix(in oklch, var(--background) 94%, var(--foreground)) 1.5px, transparent 1.5px)',
            ].join(', '),
            backgroundSize: '38px 38px',
            WebkitMaskImage: 'radial-gradient(ellipse 112% 132% at 0% 100%, black 0%, black 36%, transparent 80%)',
            maskImage: 'radial-gradient(ellipse 112% 132% at 0% 100%, black 0%, black 36%, transparent 80%)',
          }}
        />

        {/* 3. Vignette: smooth fade at the glow boundary (dark mode full, light subtle) */}
        <div
          className="absolute inset-0 opacity-45 dark:opacity-100 transition-opacity duration-500"
          style={{
            background: [
              'radial-gradient(ellipse 90% 92% at 0% 100%,',
              'transparent 30%,',
              'var(--background) 70%)',
            ].join(' '),
          }}
        />
      </div>

      {/* ── Upper content: eyebrow + headline + CTAs ── */}
      <motion.div
        variants={reduce ? undefined : container}
        initial={reduce ? false : 'hidden'}
        animate="show"
        className="relative z-10 flex-1 flex flex-col px-6 pt-12 md:px-12 lg:px-20 md:pt-14"
      >
        {/* Eyebrow */}
        <motion.div variants={reduce ? undefined : fadeUp} className="mb-8 md:mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border text-muted-foreground text-[11px] uppercase tracking-[0.2em]">
            <span
              className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_6px_2px_rgba(74,222,128,0.5)]"
              aria-hidden
            />
            Now in early access
          </div>
        </motion.div>

        {/* VideoText: video plays through both headline lines */}
        <motion.div variants={reduce ? undefined : fadeUp} className="w-full">
          <div style={{ height: HEADLINE_H, width: '100%' }}>
            <VideoText
              src={DEMO_VIDEO}
              fontSize={11}
              fontWeight="900"
              fontFamily="var(--font-satoshi)"
              autoPlay
              muted
              loop
              preload="auto"
            >
              {`Your GitHub,\nas a portfolio.`}
            </VideoText>
          </div>
        </motion.div>

        {/* CTAs — right below the headline */}
        <motion.div
          variants={reduce ? undefined : fadeUp}
          className="flex items-center gap-3 flex-wrap mt-8 md:mt-10"
        >
          <Button
            size="lg"
            className="gap-2 rounded-lg px-6 h-11"
            onClick={() => { window.location.hash = 'waitlist'; }}
          >
            Get early access
            <ArrowRight size={15} aria-hidden />
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="rounded-lg px-6 h-11"
            onClick={() =>
              document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })
            }
          >
            See demo
          </Button>
        </motion.div>

        {/* "Built for" rotating label */}
        <motion.div
          variants={reduce ? undefined : fadeUp}
          className="flex items-center gap-2 text-sm text-muted-foreground mt-6"
        >
          <span>Built for</span>
          <WordRotate
            words={ROLES}
            duration={2600}
            className="text-foreground font-semibold text-sm"
            motionProps={{
              initial: { opacity: 0, y: 6 },
              animate: { opacity: 1, y: 0 },
              exit: { opacity: 0, y: -6 },
              transition: { duration: 0.22, ease: 'easeOut' },
            }}
          />
        </motion.div>
      </motion.div>

      {/* ── Bottom bar: description | scroll indicator | stats ── */}
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut', delay: 0.55 }}
        className="relative z-10 px-6 pb-8 md:px-12 lg:px-20 flex items-end justify-between gap-6"
      >
        {/* Left: description */}
        <p className="max-w-xs md:max-w-sm text-muted-foreground text-sm md:text-base leading-relaxed">
          Connect GitHub once. Astra reads your codebase, surfaces your architecture,
          and ships a portfolio that shows how you actually build — live in under 60 seconds.
        </p>

        {/* Center: scroll indicator */}
        <div className="hidden lg:flex items-center gap-2 text-muted-foreground/50 text-sm absolute left-1/2 -translate-x-1/2 bottom-8 whitespace-nowrap">
          <span>Scroll to Discover</span>
          <motion.span
            animate={{ y: [0, 4, 0] }}
            transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
          >
            <ArrowDown size={14} aria-hidden />
          </motion.span>
        </div>

        {/* Right: quick stats */}
        <div className="hidden md:flex items-end gap-8 shrink-0">
          {[
            { value: '60s', label: 'To ship' },
            { value: '0', label: 'Config files' },
            { value: '5+', label: 'Repos at once' },
          ].map(({ value, label }) => (
            <div key={label} className="flex flex-col gap-0.5 text-right">
              <span className="font-black text-foreground text-2xl leading-none">{value}</span>
              <span className="text-muted-foreground text-xs">{label}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
