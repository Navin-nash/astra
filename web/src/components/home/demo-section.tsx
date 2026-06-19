'use client';

import { useRef, useState } from 'react';
import { motion, useInView } from 'motion/react';
import { Play, Pause, ArrowLeft, ArrowRight, ArrowClockwise, LockSimple, DotsThree } from '@phosphor-icons/react';

const DEMO_VIDEO = 'https://res.cloudinary.com/dtqadlaim/video/upload/v1781849549/astra_demo_n6eiwm.mp4';

export function DemoSection() {
  const ref = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.25 });
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

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

  function handleTimeUpdate() {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    setProgress((v.currentTime / v.duration) * 100);
  }

  function handleSeek(e: React.MouseEvent<HTMLDivElement>) {
    const v = videoRef.current;
    if (!v) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    v.currentTime = pct * v.duration;
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
          {/* Ambient glow */}
          <div
            className="absolute -inset-8 -z-10 rounded-3xl blur-3xl opacity-[0.15]"
            style={{ background: 'radial-gradient(ellipse at 50% 70%, var(--brand) 0%, transparent 65%)' }}
            aria-hidden
          />

          {/* Outer shadow ring */}
          <div className="rounded-2xl p-[1px] bg-gradient-to-b from-border/80 to-border/20 shadow-2xl shadow-black/30">
            <div className="rounded-2xl overflow-hidden bg-[#1c1c1e]">

              {/* ── Title bar ── */}
              <div className="flex items-center gap-0 h-10 bg-[#2a2a2c] border-b border-white/[0.07] select-none">

                {/* Traffic lights */}
                <div className="flex items-center gap-1.5 px-4">
                  <span className="w-3 h-3 rounded-full bg-[#ff5f57] shadow-[0_0_0_0.5px_rgba(0,0,0,0.3)]" />
                  <span className="w-3 h-3 rounded-full bg-[#febc2e] shadow-[0_0_0_0.5px_rgba(0,0,0,0.3)]" />
                  <span className="w-3 h-3 rounded-full bg-[#28c840] shadow-[0_0_0_0.5px_rgba(0,0,0,0.3)]" />
                </div>

                {/* Nav buttons */}
                <div className="flex items-center gap-0.5 px-1">
                  <button className="w-7 h-7 flex items-center justify-center rounded text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors" aria-label="Back">
                    <ArrowLeft size={13} weight="bold" />
                  </button>
                  <button className="w-7 h-7 flex items-center justify-center rounded text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors" aria-label="Forward">
                    <ArrowRight size={13} weight="bold" />
                  </button>
                  <button className="w-7 h-7 flex items-center justify-center rounded text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors" aria-label="Reload">
                    <ArrowClockwise size={13} weight="bold" />
                  </button>
                </div>

                {/* Address bar */}
                <div className="flex-1 flex justify-center px-2">
                  <div className="flex items-center gap-1.5 w-full max-w-sm h-6 px-2.5 rounded-md bg-[#141415] border border-white/[0.08] text-white/40 text-[11px] font-mono tracking-tight">
                    <LockSimple size={10} weight="bold" className="text-[#28c840] shrink-0" />
                    <span className="truncate">useastra.tech/demo</span>
                  </div>
                </div>

                {/* Menu */}
                <div className="px-3">
                  <button className="w-7 h-7 flex items-center justify-center rounded text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors" aria-label="Menu">
                    <DotsThree size={16} weight="bold" />
                  </button>
                </div>
              </div>

              {/* ── Tab bar ── */}
              <div className="flex items-end h-8 bg-[#232325] border-b border-white/[0.06] px-3 gap-0.5 select-none">
                <div className="flex items-center gap-1.5 px-3 h-6 rounded-t-md bg-[#1c1c1e] border border-b-0 border-white/[0.09] text-white/70 text-[10px] font-medium max-w-[160px]">
                  <div className="w-3 h-3 rounded-sm bg-brand/80 shrink-0 flex items-center justify-center">
                    <span className="text-[6px] text-white font-black leading-none">A</span>
                  </div>
                  <span className="truncate">Astra — Live Demo</span>
                </div>
              </div>

              {/* ── Video ── */}
              <div
                className="relative bg-black aspect-video group cursor-pointer"
                onClick={togglePlay}
              >
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  src={DEMO_VIDEO}
                  muted
                  playsInline
                  loop
                  onPlay={() => setPlaying(true)}
                  onPause={() => setPlaying(false)}
                  onTimeUpdate={handleTimeUpdate}
                />

                {/* Play/pause overlay */}
                <div
                  className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${
                    playing ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'
                  }`}
                >
                  <div className="w-14 h-14 rounded-full bg-black/50 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg">
                    {playing
                      ? <Pause size={20} weight="fill" className="text-white" />
                      : <Play size={20} weight="fill" className="text-white translate-x-0.5" />
                    }
                  </div>
                </div>
              </div>

              {/* ── Progress bar ── */}
              <div
                className="h-0.5 bg-white/[0.06] cursor-pointer group/bar"
                onClick={handleSeek}
                role="progressbar"
                aria-valuenow={Math.round(progress)}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full bg-brand transition-all duration-100 ease-linear group-hover/bar:h-1 -mt-px"
                  style={{ width: `${progress}%` }}
                />
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
