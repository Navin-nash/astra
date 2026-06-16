'use client';

import { motion, useReducedMotion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { ArrowRight } from '@phosphor-icons/react';
import { WordRotate } from '@/components/ui/word-rotate';

const VIDEO_SRC = '/hero.mp4';

const ROLES = [
  'full-stack engineers',
  'ML researchers',
  'systems builders',
  'backend developers',
  'open-source contributors',
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.11, delayChildren: 0.1 } },
};

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.75, ease: EASE } },
};

export function Hero() {
  const reduce = useReducedMotion();

  return (
    <section className="relative min-h-dvh overflow-hidden flex items-center justify-center">
      {/* Background video */}
      <video
        className="absolute inset-0 w-full h-full object-cover"
        src={VIDEO_SRC}
        autoPlay
        muted
        playsInline
        loop
      />

      {/* Vignette — stronger toward edges so text always reads */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 70% at 50% 55%, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.82) 100%)',
        }}
        aria-hidden
      />

      {/* Content */}
      <motion.div
        variants={reduce ? undefined : container}
        initial={reduce ? false : 'hidden'}
        animate="show"
        className="relative z-10 flex flex-col items-center gap-6 text-center px-4 max-w-4xl w-full"
      >
        {/* Eyebrow */}
        <motion.div variants={reduce ? undefined : fadeUp}>
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 border border-white/15 backdrop-blur-sm text-white/55 text-[11px] uppercase tracking-[0.18em]">
            <span
              className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_6px_1px_#4ade80]"
              aria-hidden
            />
            Now in early access
          </div>
        </motion.div>

        {/* Headline — solid color from the start, no sweep dependency */}
        <motion.h1
          variants={reduce ? undefined : fadeUp}
          className="font-black tracking-tight leading-[1.06] text-white"
          style={{ fontSize: 'clamp(2.6rem, 6vw, 5.5rem)', textWrap: 'balance' }}
        >
          Your GitHub,
          <br />
          <span style={{ color: 'var(--brand)' }}>as a portfolio.</span>
        </motion.h1>

        {/* Subtext */}
        <motion.p
          variants={reduce ? undefined : fadeUp}
          className="text-base md:text-lg leading-relaxed max-w-[42ch] text-white/60"
        >
          Connect GitHub once. Astra reads your codebase, surfaces your architecture,
          and ships a portfolio that shows how you actually build — live in under 90 seconds.
        </motion.p>

        {/* Rotating audience */}
        <motion.div
          variants={reduce ? undefined : fadeUp}
          className="flex items-center justify-center gap-2 text-sm text-white/40 -mt-1"
        >
          <span>Built for</span>
          <WordRotate
            words={ROLES}
            duration={2600}
            className="text-white/70 font-semibold text-sm"
            motionProps={{
              initial: { opacity: 0, y: 6 },
              animate: { opacity: 1, y: 0 },
              exit: { opacity: 0, y: -6 },
              transition: { duration: 0.2, ease: 'easeOut' },
            }}
          />
        </motion.div>

        {/* Stat pills */}
        <motion.div
          variants={reduce ? undefined : fadeUp}
          className="flex flex-wrap justify-center gap-2 -mt-1"
        >
          {['⚡ 90s avg generation', '0 config files', '5 repos analyzed'].map((s) => (
            <span
              key={s}
              className="px-3 py-1 rounded-full bg-white/8 border border-white/12 text-white/48 text-xs backdrop-blur-sm"
            >
              {s}
            </span>
          ))}
        </motion.div>

        {/* CTAs */}
        <motion.div
          variants={reduce ? undefined : fadeUp}
          className="flex items-center gap-3 flex-wrap justify-center mt-1"
        >
          <Button
            size="lg"
            className="gap-2 rounded-full px-7"
            onClick={() => { window.location.hash = 'waitlist'; }}
          >
            Get early access
            <ArrowRight size={15} aria-hidden />
          </Button>
          <Button
            size="lg"
            variant="ghost"
            className="gap-2 rounded-full px-7 text-white/65 hover:text-white hover:bg-white/10 border border-white/15"
            onClick={() =>
              document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })
            }
          >
            See demo
          </Button>
        </motion.div>
      </motion.div>
    </section>
  );
}
