"use server"

import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { baUser } from "@/lib/schema"
import { eq } from "drizzle-orm"

const GITHUB_API = "https://api.github.com"

export async function validateGithubUsername(
  username: string
): Promise<{ valid: boolean; avatarUrl?: string; error?: string }> {
  if (!username || !/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/.test(username)) {
    return { valid: false, error: "Invalid GitHub username format" }
  }

  const reqHeaders: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "astra-web/0.1",
  }
  if (process.env.GITHUB_PUBLIC_TOKEN) {
    reqHeaders["Authorization"] = `Bearer ${process.env.GITHUB_PUBLIC_TOKEN}`
  }

  const res = await fetch(`${GITHUB_API}/users/${username}`, { headers: reqHeaders })
  if (res.status === 404) return { valid: false, error: "GitHub user not found" }
  if (!res.ok) return { valid: false, error: "GitHub API error, try again" }

  const profile = await res.json()
  return { valid: true, avatarUrl: profile.avatar_url }
}

export async function saveGithubUsername(username: string): Promise<void> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")

  const { valid, error } = await validateGithubUsername(username)
  if (!valid) throw new Error(error ?? "Invalid username")

  await db
    .update(baUser)
    .set({ githubUsername: username } as never)
    .where(eq(baUser.id, session.user.id))

  redirect("/dashboard")
}
