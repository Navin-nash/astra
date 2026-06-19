"use client"

import { useEffect, useState } from "react"
import { motion, useReducedMotion } from "motion/react"

interface Stats {
  portfolios: number
  published: number
  waitlist: number
}

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number]

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.75, ease: EASE } },
}

function fmt(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return n.toString()
}

export function LiveStats({ variants }: { variants?: typeof fadeUp }) {
  const [stats, setStats] = useState<Stats | null>(null)
  const reduce = useReducedMotion()

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setStats(data) })
      .catch(() => {})
  }, [])

  if (!stats) return null

  const items = [
    stats.portfolios > 0 && { label: "portfolios generated", value: fmt(stats.portfolios) },
    stats.waitlist > 0 && { label: "developers waiting", value: fmt(stats.waitlist) },
  ].filter(Boolean) as { label: string; value: string }[]

  if (items.length === 0) return null

  return (
    <motion.div
      variants={reduce ? undefined : (variants ?? fadeUp)}
      className="flex flex-wrap justify-center gap-x-6 gap-y-1.5"
    >
      {items.map(({ label, value }) => (
        <span key={label} className="text-xs text-white/35 flex items-center gap-1.5">
          <span className="w-1 h-1 rounded-full bg-green-400/70" />
          <span className="text-white/55 font-semibold tabular-nums">{value}</span>
          {label}
        </span>
      ))}
    </motion.div>
  )
}
