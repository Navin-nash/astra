"use client"

import { useState } from "react"
import Image from "next/image"
import { AstraLogo } from "@/components/ui/astra-logo"
import { validateGithubUsername, saveGithubUsername } from "./actions"

export default function OnboardingPage() {
  const [username, setUsername] = useState("")
  const [preview, setPreview] = useState<{ avatarUrl?: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleCheck() {
    setError(null)
    setChecking(true)
    const result = await validateGithubUsername(username.trim())
    setChecking(false)
    if (result.valid) {
      setPreview({ avatarUrl: result.avatarUrl })
    } else {
      setPreview(null)
      setError(result.error ?? "Not found")
    }
  }

  async function handleSave() {
    setSaving(true)
    await saveGithubUsername(username.trim())
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center px-6 bg-background">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-3">
          <AstraLogo variant="full" height={100} />
        </div>

        <div className="rounded-2xl border border-border bg-card p-8 space-y-6 shadow-sm">
          <div className="space-y-1">
            <h1 className="text-lg font-semibold text-foreground">
              Link your GitHub profile
            </h1>
            <p className="text-sm text-muted-foreground">
              Enter your GitHub username to import your public repositories and
              contributions.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value)
                  setPreview(null)
                }}
                onKeyDown={(e) => e.key === "Enter" && !checking && username.trim() && handleCheck()}
                placeholder="your-github-username"
                className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
              />
              <button
                onClick={handleCheck}
                disabled={!username.trim() || checking}
                className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted/50 disabled:opacity-50 transition-all"
              >
                {checking ? "…" : "Check"}
              </button>
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}

            {preview && (
              <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3">
                {preview.avatarUrl && (
                  <Image
                    src={preview.avatarUrl}
                    alt=""
                    width={32}
                    height={32}
                    className="rounded-full"
                  />
                )}
                <div>
                  <p className="text-sm font-medium text-foreground">@{username}</p>
                  <p className="text-xs text-muted-foreground">Found on GitHub</p>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleSave}
            disabled={!preview || saving}
            className="flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-sm font-semibold bg-foreground text-background hover:bg-foreground/90 disabled:opacity-60 transition-all"
          >
            {saving && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            )}
            {saving ? "Saving…" : "Continue"}
          </button>
        </div>
      </div>
    </div>
  )
}
