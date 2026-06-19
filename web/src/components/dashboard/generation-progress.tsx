"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import type { GenerationJob } from "@/lib/rust-api"

const STATUS_LABELS: Record<string, string> = {
  pending: "Initialising...",
  parsing_ast: "Parsing code structure",
  generating_content: "Generating AI summaries",
  assembling_portfolio: "Assembling portfolio",
  completed: "Complete",
  failed: "Failed",
}

const STATUS_ORDER = [
  "parsing_ast",
  "generating_content",
  "assembling_portfolio",
  "completed",
]

interface GenerationProgressProps {
  jobId: string
  username: string
}

export function GenerationProgress({ jobId, username }: GenerationProgressProps) {
  const [job, setJob] = useState<GenerationJob | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`/api/job-status/${jobId}`)
        if (!res.ok) throw new Error("Failed to fetch job status")
        const data: GenerationJob = await res.json()
        setJob(data)

        if (data.status === "completed") {
          setTimeout(() => router.push("/dashboard/preview"), 1500)
        }
        if (data.status === "failed") {
          setError(data.error ?? "Generation failed")
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown error")
      }
    }

    poll()
    const interval = setInterval(() => {
      if (job?.status === "completed" || job?.status === "failed") return
      poll()
    }, 2000)

    return () => clearInterval(interval)
  }, [jobId, job?.status, router])

  const progress = job?.progress ?? 0
  const label = job ? (STATUS_LABELS[job.status] ?? job.status) : "Starting..."
  const isDone = job?.status === "completed"
  const isFailed = job?.status === "failed"

  return (
    <div className="max-w-md mx-auto text-center space-y-8">
      {/* Progress ring */}
      <div className="relative mx-auto w-24 h-24">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50" cy="50" r="44"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            className="text-border"
          />
          <circle
            cx="50" cy="50" r="44"
            fill="none"
            stroke={isFailed ? "var(--destructive)" : "var(--brand)"}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 44}`}
            strokeDashoffset={`${2 * Math.PI * 44 * (1 - progress / 100)}`}
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className={`text-lg font-bold tabular-nums ${
              isFailed ? "text-destructive" : "text-brand"
            }`}
          >
            {isDone ? "✓" : isFailed ? "✗" : `${progress}%`}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-foreground">{label}</h2>
        {!isFailed && !isDone && (
          <p className="text-sm text-muted-foreground">
            Analysing repositories and generating your portfolio
          </p>
        )}
        {isDone && (
          <p className="text-sm text-muted-foreground">
            Redirecting to your dashboard...
          </p>
        )}
        {isFailed && (
          <p className="text-sm text-destructive">
            {error ?? "Something went wrong. Please try again."}
          </p>
        )}
      </div>

      {/* Step list */}
      <div className="text-left space-y-2">
        {STATUS_ORDER.map((status) => {
          const currentIdx = STATUS_ORDER.indexOf(job?.status ?? "")
          const thisIdx = STATUS_ORDER.indexOf(status)
          const done = currentIdx > thisIdx
          const active = currentIdx === thisIdx

          return (
            <div key={status} className="flex items-center gap-3 text-sm">
              <div
                className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                  done
                    ? "bg-brand"
                    : active
                    ? "border-2 border-brand bg-brand-muted"
                    : "border border-border"
                }`}
              >
                {done && (
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <path
                      d="M1.5 4L3 5.5L6.5 2"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      className="text-primary-foreground"
                    />
                  </svg>
                )}
                {active && (
                  <div className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
                )}
              </div>
              <span
                className={
                  done
                    ? "text-muted-foreground line-through"
                    : active
                    ? "text-foreground font-medium"
                    : "text-muted-foreground"
                }
              >
                {STATUS_LABELS[status]}
              </span>
            </div>
          )
        })}
      </div>

      {isFailed && (
        <button
          onClick={() => router.push("/dashboard")}
          className="rounded-full border border-border px-6 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
        >
          Back to dashboard
        </button>
      )}
    </div>
  )
}
