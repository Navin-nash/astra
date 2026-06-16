'use client';

import { useRef, useState } from 'react';
import { motion, useInView } from 'motion/react';
import { Play, Pause } from '@phosphor-icons/react';

export function DemoSection() {
  const ref = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.25 });
  const [playing, setPlaying] = useState(false);

  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play();
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  }

  return (
    <section id="demo" className="py-24 md:py-32 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-14"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-muted border border-border text-muted-foreground text-[11px] uppercase tracking-[0.18em] mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-brand" aria-hidden />
            See it in action
          </div>
          <h2
            className="font-black tracking-tight leading-tight text-foreground"
            style={{ fontSize: 'clamp(2rem, 4.5vw, 3.5rem)' }}
          >
            From GitHub to portfolio
            <br />
            <span className="text-brand">in 90 seconds.</span>
          </h2>
          <p className="mt-4 text-muted-foreground text-base md:text-lg max-w-[40ch] mx-auto leading-relaxed">
            Watch Astra analyze a real repository and generate a live portfolio — no configuration, no templates to fill in.
          </p>
        </motion.div>

        {/* Browser mockup */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.97 }}
          animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
          className="relative mx-auto max-w-5xl"
        >
          {/* Glow backdrop */}
          <div
            className="absolute inset-0 -z-10 rounded-2xl blur-3xl opacity-20"
            style={{
              background: 'radial-gradient(ellipse at 50% 60%, var(--brand) 0%, transparent 70%)',
            }}
            aria-hidden
          />

          {/* Window chrome */}
          <div className="rounded-xl overflow-hidden border border-border shadow-2xl shadow-black/40 bg-card">
            {/* Title bar */}
            <div className="flex items-center gap-2.5 px-4 h-10 bg-muted/60 border-b border-border">
              <span className="w-3 h-3 rounded-full bg-red-500/70" />
              <span className="w-3 h-3 rounded-full bg-yellow-500/70" />
              <span className="w-3 h-3 rounded-full bg-green-500/70" />
              <div className="flex-1 flex justify-center">
                <div className="flex items-center gap-1.5 px-3 py-0.5 rounded bg-background/50 border border-border/50 text-muted-foreground text-xs font-mono tracking-tight select-none">
                  <span className="w-2.5 h-2.5 opacity-50">🔒</span>
                  astra.build/portfolio/you
                </div>
              </div>
            </div>

            {/* Video container */}
            <div className="relative bg-black aspect-video group cursor-pointer" onClick={togglePlay}>
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                src="/hero.mp4"
                muted
                playsInline
                loop
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
              />

              {/* Play/pause overlay */}
              <div
                className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${
                  playing ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'
                }`}
              >
                <div className="w-16 h-16 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                  {playing
                    ? <Pause size={22} weight="fill" className="text-white" />
                    : <Play size={22} weight="fill" className="text-white translate-x-0.5" />
                  }
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.45 }}
          className="flex flex-wrap justify-center gap-x-10 gap-y-4 mt-12 text-center"
        >
          {[
            { value: '90s', label: 'Average generation' },
            { value: '0', label: 'Config files needed' },
            { value: '5+', label: 'Repos analyzed at once' },
          ].map(({ value, label }) => (
            <div key={label} className="flex flex-col gap-0.5">
              <span
                className="font-black text-foreground leading-none"
                style={{ fontSize: 'clamp(1.75rem, 3vw, 2.5rem)' }}
              >
                {value}
              </span>
              <span className="text-muted-foreground text-sm">{label}</span>
            </div>
          ))}
        </motion.div>

      </div>
    </section>
  );
}
