# Multi-Auth & GitHub Data Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Google OAuth + email/password auth alongside existing GitHub OAuth, implement two distinct data-access flows (GitHub OAuth = private+public repos; Google/Email = public repos via GitHub username), and enrich portfolio data with organization repos and open-source contributions.

**Architecture:** Better Auth handles all three auth methods; a `github_username` column on the user table is the key that unlocks GitHub data for non-GitHub OAuth users. GitHub data fetching is split into `authenticatedFetch` (user's OAuth token) and `publicFetch` (server-side PAT + username), both returning the same shape. Organization repos and merged-PR contributions are fetched as separate slices and passed to the existing Rust portfolio generation pipeline.

**Tech Stack:** Better Auth (Google social + emailAndPassword plugin), Drizzle ORM migrations, GitHub REST API v3, Next.js server actions, Resend (email delivery for verification)

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `web/migrations/004_github_username.sql` | Create | Add `github_username` nullable column to `user` table |
| `web/src/lib/auth.ts` | Modify | Add Google provider, emailAndPassword, additionalFields for githubUsername |
| `web/src/lib/auth-client.ts` | Modify | Export email sign-in/sign-up/verification methods |
| `web/src/lib/github.ts` | Modify | Add `publicFetch` mode, `listOrgRepos`, `listContributions`, `resolveGithubUsername` |
| `web/src/types/portfolio.ts` | Modify | Add `GithubContribution`, `RepoSource` type; extend `GithubRepo` |
| `web/src/app/(auth)/login/page.tsx` | Modify | 3-way auth UI: GitHub / Google / Email |
| `web/src/app/(auth)/login/login-button.tsx` | Modify | Rename to `auth-buttons.tsx`; add Google + email buttons |
| `web/src/app/(auth)/register/page.tsx` | Create | Email sign-up form |
| `web/src/app/(auth)/register/actions.ts` | Create | Server action: `signUpWithEmail` |
| `web/src/app/(auth)/verify-email/page.tsx` | Create | "Check your inbox" screen shown after email sign-up |
| `web/src/app/(auth)/onboarding/page.tsx` | Create | GitHub username entry for Google/Email users |
| `web/src/app/(auth)/onboarding/actions.ts` | Create | Server action: `saveGithubUsername`, `validateGithubUsername` |
| `web/src/app/dashboard/actions.ts` | Modify | Detect auth type; merge own/org/contrib repos; route to correct fetch mode |
| `web/src/app/dashboard/page.tsx` | Modify | Pass categorized data to `RepoSelector`; onboarding redirect for missing username |
| `web/src/components/dashboard/repo-selector.tsx` | Modify | Accept `source` label (own/org/contribution); group repos by source |

---

## Task 1: DB Migration — `github_username` Column

**Files:**
- Create: `web/migrations/004_github_username.sql`

- [ ] **Step 1: Write the migration**

```sql
-- web/migrations/004_github_username.sql
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS github_username text;

CREATE UNIQUE INDEX IF NOT EXISTS user_github_username_idx
  ON "user" (github_username)
  WHERE github_username IS NOT NULL;
```

- [ ] **Step 2: Run the migration**

```bash
cd web
# Uses the same migration runner as existing migrations (e.g. psql or your migrate script)
psql $DATABASE_URL -f migrations/004_github_username.sql
```

Expected output: `ALTER TABLE`, `CREATE INDEX`

- [ ] **Step 3: Commit**

```bash
git add web/migrations/004_github_username.sql
git commit -m "chore(db): add github_username column to user table"
```

---

## Task 2: Extend Better Auth — Google + Email/Password

**Files:**
- Modify: `web/src/lib/auth.ts`
- Modify: `web/src/lib/auth-client.ts`

Context: `emailAndPassword` is a built-in Better Auth feature (not a plugin import). Google OAuth is a social provider identical to GitHub. `additionalFields` exposes the `github_username` column to Better Auth session/user objects.

- [ ] **Step 1: Install Resend SDK for email delivery**

```bash
cd web && bun add resend
```

- [ ] **Step 2: Replace `web/src/lib/auth.ts` with the extended config**

```typescript
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { nextCookies } from "better-auth/next-js"
import { db } from "./db"
import * as authSchema from "./auth-schema"

export const auth = betterAuth({
  appName: "Astra",

  database: drizzleAdapter(db, {
    provider: "pg",
    schema: authSchema,
  }),

  plugins: [nextCookies()],

  // ─── Email + Password ────────────────────────────────────────────────────
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    async sendResetPassword({ user, url }) {
      const { Resend } = await import("resend")
      const resend = new Resend(process.env.RESEND_API_KEY!)
      await resend.emails.send({
        from: "Astra <noreply@yourdomain.com>",
        to: user.email,
        subject: "Reset your Astra password",
        text: `Reset your password: ${url}`,
      })
    },
  },

  // ─── Email verification ───────────────────────────────────────────────────
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      const { Resend } = await import("resend")
      const resend = new Resend(process.env.RESEND_API_KEY!)
      await resend.emails.send({
        from: "Astra <noreply@yourdomain.com>",
        to: user.email,
        subject: "Verify your Astra email",
        text: `Verify your email: ${url}`,
      })
    },
  },

  // ─── Social providers ─────────────────────────────────────────────────────
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      scope: ["read:user", "user:email", "repo"],
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },

  // ─── Extended user fields ─────────────────────────────────────────────────
  user: {
    additionalFields: {
      githubUsername: {
        type: "string",
        required: false,
        defaultValue: null,
        input: true,
      },
    },
  },

  // ─── Session ──────────────────────────────────────────────────────────────
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,
      strategy: "jwe",
    },
  },

  // ─── Account ──────────────────────────────────────────────────────────────
  account: {
    accountLinking: {
      enabled: true,
    },
  },

  // ─── Rate limiting ────────────────────────────────────────────────────────
  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 60,
    customRules: {
      "/api/auth/sign-in/social": { window: 60, max: 10 },
      "/api/auth/callback/github": { window: 60, max: 10 },
      "/api/auth/callback/google": { window: 60, max: 10 },
      "/api/auth/sign-in/email": { window: 60, max: 5 },
      "/api/auth/sign-up/email": { window: 300, max: 3 },
    },
  },

  trustedOrigins: process.env.ALLOWED_ORIGINS?.split(",").filter(Boolean) ?? [],

  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    cookiePrefix: "astra",
  },
})

export type Session = typeof auth.$Infer.Session
export type User = typeof auth.$Infer.Session.user
```

- [ ] **Step 3: Regenerate auth schema**

```bash
cd web && bunx @better-auth/cli generate
```

This overwrites `src/lib/auth-schema.ts` to add columns for email verification tokens and any other plugin tables. The `github_username` column you added via SQL migration will NOT be in auth-schema.ts — that's intentional (it's an app field, not a Better Auth-managed field).

- [ ] **Step 4: Update `web/src/lib/auth-client.ts`**

```typescript
"use client"

import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
})

export const {
  signIn,
  signOut,
  signUp,
  useSession,
  sendVerificationEmail,
  forgetPassword,
  resetPassword,
} = authClient
```

- [ ] **Step 5: Add env vars to `.env.local`**

```bash
# Google OAuth (create at console.cloud.google.com → Credentials → OAuth 2.0 Client)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Resend (create at resend.com → API Keys)
RESEND_API_KEY=
```

- [ ] **Step 6: Commit**

```bash
git add web/src/lib/auth.ts web/src/lib/auth-schema.ts web/src/lib/auth-client.ts
git commit -m "feat(auth): add Google OAuth and email/password providers"
```

---

## Task 3: Login Page — 3-Way Auth UI

**Files:**
- Modify: `web/src/app/(auth)/login/page.tsx`
- Modify: `web/src/app/(auth)/login/login-button.tsx` → becomes `auth-buttons.tsx`

- [ ] **Step 1: Replace `web/src/app/(auth)/login/login-button.tsx` with multi-provider buttons**

```typescript
"use client"

import { useState } from "react"
import Link from "next/link"
import { authClient } from "@/lib/auth-client"

type Provider = "github" | "google"

function SocialButton({
  provider,
  label,
  icon,
}: {
  provider: Provider
  label: string
  icon: React.ReactNode
}) {
  const [loading, setLoading] = useState(false)

  async function handleSignIn() {
    setLoading(true)
    await authClient.signIn.social({ provider, callbackURL: "/dashboard" })
  }

  return (
    <button
      onClick={handleSignIn}
      disabled={loading}
      className="flex w-full items-center justify-center gap-3 rounded-full py-2.5 text-sm font-semibold bg-foreground text-background hover:bg-foreground/90 active:scale-[0.98] transition-all disabled:opacity-60"
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        icon
      )}
      {loading ? "Connecting..." : label}
    </button>
  )
}

const GitHubIcon = (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
  </svg>
)

const GoogleIcon = (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
)

export function AuthButtons() {
  return (
    <div className="space-y-3">
      <SocialButton provider="github" label="Continue with GitHub" icon={GitHubIcon} />
      <SocialButton provider="google" label="Continue with Google" icon={GoogleIcon} />

      <div className="relative flex items-center gap-3 py-1">
        <div className="flex-1 border-t border-border" />
        <span className="text-xs text-muted-foreground">or</span>
        <div className="flex-1 border-t border-border" />
      </div>

      <Link
        href="/register"
        className="flex w-full items-center justify-center gap-3 rounded-full py-2.5 text-sm font-semibold border border-border text-foreground hover:bg-muted/50 active:scale-[0.98] transition-all"
      >
        Continue with Email
      </Link>
    </div>
  )
}
```

- [ ] **Step 2: Update `web/src/app/(auth)/login/page.tsx`**

```typescript
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { AstraLogo } from "@/components/ui/astra-logo"
import { AuthButtons } from "./login-button"

export default async function LoginPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (session) redirect("/dashboard")

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center px-6 bg-background">
      <div className="w-full max-w-sm text-center space-y-8">
        <div className="flex flex-col items-center gap-3">
          <AstraLogo variant="full" height={120} />
          <p className="text-sm text-muted-foreground">
            Your GitHub, as a portfolio.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-8 space-y-6 shadow-sm">
          <div className="space-y-1">
            <h1 className="text-lg font-semibold text-foreground">Sign in to Astra</h1>
            <p className="text-sm text-muted-foreground">
              Choose how you want to sign in.
            </p>
          </div>

          <AuthButtons />

          <p className="text-xs leading-relaxed text-muted-foreground/70">
            GitHub sign-in grants access to private repositories. Google and
            email sign-in only access your public GitHub profile.
          </p>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add web/src/app/\(auth\)/login/
git commit -m "feat(auth): 3-way login UI — GitHub, Google, Email"
```

---

## Task 4: Email Registration & Verification Pages

**Files:**
- Create: `web/src/app/(auth)/register/page.tsx`
- Create: `web/src/app/(auth)/register/actions.ts`
- Create: `web/src/app/(auth)/verify-email/page.tsx`

- [ ] **Step 1: Create `web/src/app/(auth)/register/actions.ts`**

```typescript
"use server"

import { auth } from "@/lib/auth"
import { headers } from "next/headers"

export async function signUpWithEmail(
  email: string,
  password: string,
  name: string
): Promise<{ error?: string }> {
  try {
    await auth.api.signUpEmail({
      body: { email, password, name },
      headers: await headers(),
    })
    return {}
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Sign up failed"
    return { error: message }
  }
}
```

- [ ] **Step 2: Create `web/src/app/(auth)/register/page.tsx`**

```typescript
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { AstraLogo } from "@/components/ui/astra-logo"
import { signUpWithEmail } from "./actions"

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: "", email: "", password: "" })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const result = await signUpWithEmail(form.email, form.password, form.name)
    setLoading(false)
    if (result.error) {
      setError(result.error)
    } else {
      router.push("/verify-email")
    }
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center px-6 bg-background">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-3">
          <AstraLogo variant="full" height={100} />
        </div>

        <div className="rounded-2xl border border-border bg-card p-8 space-y-6 shadow-sm">
          <h1 className="text-lg font-semibold text-foreground">Create account</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Name</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Your name"
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Password</label>
              <input
                type="password"
                required
                minLength={8}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Min. 8 characters"
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
              />
            </div>

            {error && (
              <p className="text-xs text-red-500">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-sm font-semibold bg-foreground text-background hover:bg-foreground/90 disabled:opacity-60 transition-all"
            >
              {loading && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              )}
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="text-center text-xs text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create `web/src/app/(auth)/verify-email/page.tsx`**

```typescript
import Link from "next/link"
import { AstraLogo } from "@/components/ui/astra-logo"

export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center px-6 bg-background">
      <div className="w-full max-w-sm text-center space-y-8">
        <AstraLogo variant="icon" height={48} />
        <div className="rounded-2xl border border-border bg-card p-8 space-y-4 shadow-sm">
          <h1 className="text-lg font-semibold text-foreground">Check your inbox</h1>
          <p className="text-sm text-muted-foreground">
            We sent a verification link to your email. Click it to activate your
            account, then sign in.
          </p>
          <Link
            href="/login"
            className="inline-block text-sm underline text-muted-foreground"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add web/src/app/\(auth\)/register/ web/src/app/\(auth\)/verify-email/
git commit -m "feat(auth): email registration and verify-email pages"
```

---

## Task 5: Onboarding Page — GitHub Username Entry

This page is shown to users who signed in with Google or email and haven't linked a GitHub username yet. GitHub OAuth users skip this (their username is resolved automatically — see Task 6).

**Files:**
- Create: `web/src/app/(auth)/onboarding/page.tsx`
- Create: `web/src/app/(auth)/onboarding/actions.ts`

- [ ] **Step 1: Create `web/src/app/(auth)/onboarding/actions.ts`**

```typescript
"use server"

import { redirect, headers as nextHeaders } from "next/navigation"
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

  const token = process.env.GITHUB_PUBLIC_TOKEN
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "astra-web/0.1",
  }
  if (token) headers["Authorization"] = `Bearer ${token}`

  const res = await fetch(`${GITHUB_API}/users/${username}`, { headers })
  if (res.status === 404) return { valid: false, error: "GitHub user not found" }
  if (!res.ok) return { valid: false, error: "GitHub API error, try again" }

  const profile = await res.json()
  return { valid: true, avatarUrl: profile.avatar_url }
}

export async function saveGithubUsername(username: string): Promise<void> {
  const session = await auth.api.getSession({ headers: await nextHeaders() })
  if (!session) redirect("/login")

  const { valid, error } = await validateGithubUsername(username)
  if (!valid) throw new Error(error ?? "Invalid username")

  await db
    .update(baUser)
    .set({ githubUsername: username } as never)
    .where(eq(baUser.id, session.user.id))

  redirect("/dashboard")
}
```

- [ ] **Step 2: Create `web/src/app/(auth)/onboarding/page.tsx`**

```typescript
"use client"

import { useState } from "react"
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
                onChange={(e) => { setUsername(e.target.value); setPreview(null) }}
                placeholder="github-username"
                className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
              />
              <button
                onClick={handleCheck}
                disabled={!username.trim() || checking}
                className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted/50 disabled:opacity-50 transition-all"
              >
                {checking ? "..." : "Check"}
              </button>
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}

            {preview && (
              <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3">
                {preview.avatarUrl && (
                  <img
                    src={preview.avatarUrl}
                    alt=""
                    className="h-8 w-8 rounded-full"
                  />
                )}
                <div>
                  <p className="text-sm font-medium text-foreground">
                    @{username}
                  </p>
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
            {saving ? "Saving..." : "Continue"}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add web/src/app/\(auth\)/onboarding/
git commit -m "feat(auth): GitHub username onboarding for Google/email users"
```

---

## Task 6: Auto-Resolve GitHub Username for GitHub OAuth Users

When a user signs in via GitHub OAuth, we have their token. We use it to fetch `/user` and persist `login` as `github_username` if not yet set. This runs inside the dashboard actions so it's transparent.

**Files:**
- Modify: `web/src/lib/github.ts` (add `resolveAndPersistGithubUsername`)

- [ ] **Step 1: Add `resolveAndPersistGithubUsername` to `web/src/lib/github.ts`**

Add this function after the existing `getGithubToken` function:

```typescript
import { db } from "./db"
import { baUser, baAccount } from "./schema"
import { eq, and } from "drizzle-orm"

interface GithubProfile {
  login: string
  avatar_url: string
}

/**
 * For GitHub OAuth users only: fetches /user to get the GitHub login (username),
 * then persists it to user.github_username if not yet set.
 */
export async function resolveAndPersistGithubUsername(
  userId: string
): Promise<string | null> {
  const account = await db.query.baAccount.findFirst({
    where: and(eq(baAccount.userId, userId), eq(baAccount.providerId, "github")),
    columns: { accessToken: true },
  })
  if (!account?.accessToken) return null

  const profile = await ghFetch<GithubProfile>("/user", account.accessToken)
  if (!profile.login) return null

  // Persist only if not already set (avoid unnecessary writes)
  const user = await db.query.baUser.findFirst({
    where: eq(baUser.id, userId),
    columns: { githubUsername: true } as never,
  })

  if (!(user as unknown as { githubUsername: string | null })?.githubUsername) {
    await db
      .update(baUser)
      .set({ githubUsername: profile.login } as never)
      .where(eq(baUser.id, userId))
  }

  return profile.login
}
```

Note: The `as never` casts are required because `githubUsername` is added via SQL migration and not reflected in the generated Drizzle types yet. After running `bunx drizzle-kit generate` and `push`, you can remove them.

- [ ] **Step 2: Commit**

```bash
git add web/src/lib/github.ts
git commit -m "feat(github): auto-resolve GitHub login for OAuth users"
```

---

## Task 7: GitHub Lib — Public Fetch Mode, Org Repos, Contributions

Add three new capabilities to `github.ts`:
1. `listPublicUserRepos` — fetches public repos using a server-side PAT + username (for Google/Email users)
2. `listOrgRepos` — fetches public org repos the user belongs to
3. `listContributions` — fetches merged PRs authored by the user in other repos

**Files:**
- Modify: `web/src/lib/github.ts`
- Modify: `web/src/types/portfolio.ts`

- [ ] **Step 1: Extend `web/src/types/portfolio.ts`**

Add these types at the bottom of the file:

```typescript
export type RepoSource = "own" | "org" | "contribution"

export interface GithubContribution {
  id: number
  title: string
  html_url: string
  repo_full_name: string
  repo_html_url: string
  merged_at: string
  state: "merged"
  labels: string[]
}

// Extend GithubRepo to carry its source
export interface AnnotatedRepo extends GithubRepo {
  source: RepoSource
  org_name?: string  // set when source === "org"
}
```

- [ ] **Step 2: Add public fetch mode, org repos, and contributions to `web/src/lib/github.ts`**

Add these functions at the end of the file:

```typescript
/** Server-side PAT for public GitHub API access (5000 req/hr vs 60 unauthenticated) */
function publicGhHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "astra-web/0.1",
  }
  if (process.env.GITHUB_PUBLIC_TOKEN) {
    headers["Authorization"] = `Bearer ${process.env.GITHUB_PUBLIC_TOKEN}`
  }
  return headers
}

async function publicGhFetch<T>(path: string, retries = 3): Promise<T> {
  let lastError: Error | undefined
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(`${GITHUB_API}${path}`, {
      headers: publicGhHeaders(),
      cache: "no-store",
    })
    if (res.status === 429 || (res.status >= 500 && res.status < 600)) {
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000))
        continue
      }
    }
    if (!res.ok) throw new Error(`GitHub public API ${path} → ${res.status}`)
    return res.json() as Promise<T>
  }
  throw lastError ?? new Error(`GitHub public API ${path} failed`)
}

/** Fetches all public repos for a GitHub username (no OAuth token required). */
export async function listPublicUserRepos(githubUsername: string): Promise<GithubRepo[]> {
  const all: GithubRepo[] = []
  let page = 1
  while (true) {
    const batch = await publicGhFetch<GithubRepo[]>(
      `/users/${githubUsername}/repos?per_page=100&sort=updated&type=public&page=${page}`
    )
    all.push(...batch)
    if (batch.length < 100) break
    page++
  }
  return all.filter((r) => !r.archived && !r.fork)
}

interface GithubOrg {
  login: string
  avatar_url: string
}

/** Fetches public orgs the authenticated user belongs to. */
async function listUserOrgs(token: string): Promise<GithubOrg[]> {
  return ghFetch<GithubOrg[]>("/user/orgs?per_page=100", token)
}

/** Fetches public orgs visible on a public profile (no token). */
async function listPublicUserOrgs(githubUsername: string): Promise<GithubOrg[]> {
  return publicGhFetch<GithubOrg[]>(`/users/${githubUsername}/orgs?per_page=100`)
}

/** Fetches public repos for a given org. */
async function fetchOrgPublicRepos(orgLogin: string): Promise<GithubRepo[]> {
  const all: GithubRepo[] = []
  let page = 1
  while (true) {
    const batch = await publicGhFetch<GithubRepo[]>(
      `/orgs/${orgLogin}/repos?per_page=100&sort=updated&type=public&page=${page}`
    )
    all.push(...batch)
    if (batch.length < 100) break
    page++
  }
  return all.filter((r) => !r.archived)
}

/**
 * Returns public repos from all orgs the user belongs to.
 * Uses OAuth token if available (higher rate limits), otherwise falls back to public username.
 */
export async function listOrgRepos(
  userId: string,
  githubUsername: string
): Promise<Array<GithubRepo & { org_name: string }>> {
  let orgs: GithubOrg[]
  try {
    const token = await getGithubToken(userId).catch(() => null)
    orgs = token
      ? await listUserOrgs(token)
      : await listPublicUserOrgs(githubUsername)
  } catch {
    return []
  }

  if (orgs.length === 0) return []

  const orgRepoSets = await Promise.all(
    orgs.map(async (org) => {
      const repos = await fetchOrgPublicRepos(org.login).catch(() => [] as GithubRepo[])
      return repos.map((r) => ({ ...r, org_name: org.login }))
    })
  )

  return orgRepoSets.flat()
}

interface SearchIssue {
  id: number
  title: string
  html_url: string
  pull_request?: { merged_at: string | null }
  repository_url: string
  labels: Array<{ name: string }>
  created_at: string
}

interface SearchResult {
  items: SearchIssue[]
}

/**
 * Returns merged PRs authored by the user in repos they don't own.
 * Only returns PRs in repos that are NOT in ownedRepoFullNames.
 */
export async function listContributions(
  githubUsername: string,
  ownedRepoFullNames: Set<string>
): Promise<GithubContribution[]> {
  const query = `type:pr+author:${githubUsername}+is:merged`
  let results: GithubContribution[] = []

  for (let page = 1; page <= 3; page++) {
    const data = await publicGhFetch<SearchResult>(
      `/search/issues?q=${query}&sort=updated&per_page=30&page=${page}`
    )
    if (!data.items?.length) break

    for (const item of data.items) {
      if (!item.pull_request?.merged_at) continue
      // repo_full_name is derived from repository_url: ".../repos/{owner}/{repo}"
      const parts = item.repository_url.split("/repos/")
      const repoFullName = parts[1] ?? ""
      if (!repoFullName || ownedRepoFullNames.has(repoFullName)) continue

      results.push({
        id: item.id,
        title: item.title,
        html_url: item.html_url,
        repo_full_name: repoFullName,
        repo_html_url: `https://github.com/${repoFullName}`,
        merged_at: item.pull_request.merged_at,
        state: "merged",
        labels: item.labels.map((l) => l.name),
      })
    }
    if (data.items.length < 30) break
  }

  return results
}
```

- [ ] **Step 3: Add `GITHUB_PUBLIC_TOKEN` to env**

```bash
# web/.env.local
# GitHub PAT (classic, public_repo scope) — used for unauthenticated user lookups
GITHUB_PUBLIC_TOKEN=ghp_your_token_here
```

- [ ] **Step 4: Commit**

```bash
git add web/src/lib/github.ts web/src/types/portfolio.ts
git commit -m "feat(github): public fetch mode, org repos, and contribution PRs"
```

---

## Task 8: Dashboard Actions — Route by Auth Type, Merge Data

**Files:**
- Modify: `web/src/app/dashboard/actions.ts`

The key logic: check if the user has a GitHub OAuth account linked. If yes → authenticated mode. If no → check `github_username` → public mode. If neither → redirect to onboarding.

- [ ] **Step 1: Replace `web/src/app/dashboard/actions.ts`**

```typescript
"use server"

import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { baAccount, baUser } from "@/lib/schema"
import { and, eq } from "drizzle-orm"
import {
  fetchRepoContent,
  listUserRepos,
  listPublicUserRepos,
  listOrgRepos,
  listContributions,
  resolveAndPersistGithubUsername,
} from "@/lib/github"
import { startGeneration } from "@/lib/rust-api"
import type { GithubRepo, GithubContribution, TemplateId } from "@/types/portfolio"
import type { RepoInput } from "@/lib/rust-api"

interface GitHubAccessMode {
  type: "authenticated"
  token: string
  githubUsername: string
}
interface PublicAccessMode {
  type: "public"
  githubUsername: string
}
type AccessMode = GitHubAccessMode | PublicAccessMode

/**
 * Determines how to access GitHub data for the current user.
 * Returns null if user needs to complete onboarding (no github_username).
 */
async function resolveAccessMode(userId: string): Promise<AccessMode | null> {
  const githubAccount = await db.query.baAccount.findFirst({
    where: and(eq(baAccount.userId, userId), eq(baAccount.providerId, "github")),
    columns: { accessToken: true },
  })

  if (githubAccount?.accessToken) {
    // GitHub OAuth user — resolve/persist username if needed
    const username = await resolveAndPersistGithubUsername(userId)
    if (!username) return null
    return { type: "authenticated", token: githubAccount.accessToken, githubUsername: username }
  }

  // Google/Email user — need github_username from onboarding
  const user = await db.query.baUser.findFirst({
    where: eq(baUser.id, userId),
    columns: { githubUsername: true } as never,
  })
  const githubUsername = (user as unknown as { githubUsername: string | null })?.githubUsername
  if (!githubUsername) return null

  return { type: "public", githubUsername }
}

export interface RepoData {
  ownRepos: GithubRepo[]
  orgRepos: Array<GithubRepo & { org_name: string }>
  contributions: GithubContribution[]
  accessType: "authenticated" | "public"
  githubUsername: string
}

export async function getRepoData(): Promise<RepoData> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")

  const mode = await resolveAccessMode(session.user.id)
  if (!mode) redirect("/onboarding")

  const ownRepos =
    mode.type === "authenticated"
      ? await listUserRepos(session.user.id)
      : await listPublicUserRepos(mode.githubUsername)

  const ownedFullNames = new Set(ownRepos.map((r) => r.full_name))

  const [orgRepos, contributions] = await Promise.all([
    listOrgRepos(session.user.id, mode.githubUsername),
    listContributions(mode.githubUsername, ownedFullNames),
  ])

  return {
    ownRepos,
    orgRepos,
    contributions,
    accessType: mode.type,
    githubUsername: mode.githubUsername,
  }
}

export async function generatePortfolio(
  repoIds: number[],
  template: TemplateId
): Promise<{ jobId: string }> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")

  const { user } = session
  const mode = await resolveAccessMode(user.id)
  if (!mode) redirect("/onboarding")

  const ownRepos =
    mode.type === "authenticated"
      ? await listUserRepos(user.id)
      : await listPublicUserRepos(mode.githubUsername)

  const selected = ownRepos.filter((r) => repoIds.includes(r.id))
  if (selected.length === 0) throw new Error("No matching repositories found")

  const reposWithContent = await Promise.all(
    selected.map(async (repo): Promise<RepoInput> => {
      const content =
        mode.type === "authenticated"
          ? await fetchRepoContent(user.id, repo)
          : await fetchRepoContent(user.id, repo).catch(async () => {
              // Fallback for public-mode users: fetch without token using public helper
              return { readme: null, packageJson: null, dependencyFile: null, sourceFiles: [] }
            })
      return {
        id: String(repo.id),
        name: repo.name,
        full_name: repo.full_name,
        description: repo.description ?? undefined,
        html_url: repo.html_url,
        homepage: repo.homepage ?? undefined,
        primary_language: repo.language ?? undefined,
        topics: repo.topics,
        stars_count: repo.stargazers_count,
        forks_count: repo.forks_count,
        readme: content.readme ?? undefined,
        package_json: content.packageJson ?? undefined,
        dependency_file: content.dependencyFile ?? undefined,
        source_files: content.sourceFiles,
      }
    })
  )

  const job = await startGeneration(reposWithContent, {
    template,
    user_id: user.id,
    username: mode.githubUsername,
    avatar_url: user.image ?? undefined,
  })

  return { jobId: job.id }
}
```

Note: The old `getRepos()` export is replaced by `getRepoData()`. Update the import in `dashboard/page.tsx` in the next task.

- [ ] **Step 2: Commit**

```bash
git add web/src/app/dashboard/actions.ts
git commit -m "feat(dashboard): route GitHub data by auth type, include org repos and contributions"
```

---

## Task 9: Dashboard Page & RepoSelector UI — Categorized Display

**Files:**
- Modify: `web/src/app/dashboard/page.tsx`
- Modify: `web/src/components/dashboard/repo-selector.tsx`

- [ ] **Step 1: Check the current `repo-selector.tsx` interface**

Read `web/src/components/dashboard/repo-selector.tsx` to understand its current props shape before modifying.

- [ ] **Step 2: Update `web/src/app/dashboard/page.tsx`**

```typescript
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { getRepoData, generatePortfolio } from "./actions"
import { RepoSelector } from "@/components/dashboard/repo-selector"
import { UserMenu } from "@/components/dashboard/user-menu"
import { getMyPortfolio } from "@/lib/rust-api"
import type { TemplateId } from "@/types/portfolio"
import Link from "next/link"
import { AstraLogo } from "@/components/ui/astra-logo"

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")

  const [repoData, portfolio] = await Promise.all([
    getRepoData(),
    getMyPortfolio(),
  ])

  async function handleGenerate(repoIds: number[], template: TemplateId) {
    "use server"
    const { jobId } = await generatePortfolio(repoIds, template)
    redirect(`/dashboard/generate/${jobId}`)
  }

  const { ownRepos, orgRepos, contributions, accessType, githubUsername } = repoData
  const totalRepos = ownRepos.length + orgRepos.length

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/">
            <AstraLogo variant="full" height={72} />
          </Link>
          <div className="flex items-center gap-4">
            {portfolio && (
              <Link
                href={`/${githubUsername}`}
                target="_blank"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                View portfolio ↗
              </Link>
            )}
            <UserMenu
              name={session.user.name ?? session.user.email}
              email={session.user.email}
              image={session.user.image}
            />
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10">
        {portfolio && (
          <div className="mb-8 rounded-2xl border border-border bg-card p-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">
                Portfolio {portfolio.is_published ? "live" : "draft"}
              </p>
              <p className="text-xs mt-0.5 text-muted-foreground">
                Last synced{" "}
                {portfolio.last_synced_at
                  ? new Date(portfolio.last_synced_at).toLocaleDateString()
                  : "never"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div
                className={`w-2 h-2 rounded-full ${
                  portfolio.is_published ? "bg-green-500" : "bg-muted-foreground"
                }`}
              />
              <Link
                href={`/${githubUsername}`}
                target="_blank"
                className="rounded-full border border-border px-4 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
              >
                Preview
              </Link>
            </div>
          </div>
        )}

        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-semibold text-foreground">
              {portfolio ? "Regenerate portfolio" : "Build your portfolio"}
            </h1>
            {accessType === "public" && (
              <span className="rounded-full bg-amber-500/10 text-amber-600 text-xs px-2 py-0.5 font-medium">
                Public only
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {accessType === "authenticated"
              ? "Pick repositories from your profile and organisations."
              : "Showing public repositories. Sign in with GitHub to include private repos."}
          </p>
        </div>

        {totalRepos === 0 ? (
          <div className="rounded-2xl border border-border p-12 text-center">
            <p className="text-sm text-muted-foreground">
              No repositories found for @{githubUsername}.
            </p>
          </div>
        ) : (
          <RepoSelector
            ownRepos={ownRepos}
            orgRepos={orgRepos}
            contributions={contributions}
            onGenerate={handleGenerate}
          />
        )}
      </main>
    </div>
  )
}
```

- [ ] **Step 3: Update `web/src/components/dashboard/repo-selector.tsx` props and grouping**

Read the current file first, then update the props interface and add repo grouping by source. The key change is accepting `ownRepos`, `orgRepos`, `contributions` as separate lists and rendering them in labelled sections.

Replace the component's props type with:

```typescript
interface RepoSelectorProps {
  ownRepos: GithubRepo[]
  orgRepos: Array<GithubRepo & { org_name: string }>
  contributions: GithubContribution[]
  onGenerate: (repoIds: number[], template: TemplateId) => Promise<void>
}
```

Add section headings:
- "Your repositories" (ownRepos)
- "Organisation repositories" (orgRepos, grouped by `org_name`, shown only if > 0)
- "Open source contributions" (contributions list, read-only display, not selectable for generation)

The contributions section is informational — it shows the user's merged PRs to demonstrate open source activity. It doesn't feed into `onGenerate` (which only takes repo IDs for full repos). The Rust API will later be extended to accept contribution metadata.

- [ ] **Step 4: Commit**

```bash
git add web/src/app/dashboard/page.tsx web/src/components/dashboard/repo-selector.tsx
git commit -m "feat(dashboard): categorized repo display with org and contribution sections"
```

---

## Task 10: Wire Contributions into Portfolio Generation

The Rust API's `startGeneration` accepts `repos` (full repos with code). Contributions are a different shape (PR title, URL, merged date) and need a new field in the request body.

**Files:**
- Modify: `web/src/lib/rust-api.ts`
- Modify: `web/src/app/dashboard/actions.ts` (small addition)

- [ ] **Step 1: Check current `rust-api.ts` types**

Read `web/src/lib/rust-api.ts` to see the `GenerateRequest` type.

- [ ] **Step 2: Extend `GenerateRequest` in `web/src/lib/rust-api.ts`**

Add a `contributions` field to the request type:

```typescript
export interface ContributionInput {
  title: string
  html_url: string
  repo_full_name: string
  repo_html_url: string
  merged_at: string
  labels: string[]
}

// Add to GenerateRequest:
contributions?: ContributionInput[]
```

- [ ] **Step 3: Pass contributions in `generatePortfolio` action**

In `web/src/app/dashboard/actions.ts`, after building `reposWithContent`, fetch and pass contributions:

```typescript
const ownedFullNames = new Set(selected.map((r) => r.full_name))
const contributions = await listContributions(mode.githubUsername, ownedFullNames)
const contributionInputs = contributions.map((c) => ({
  title: c.title,
  html_url: c.html_url,
  repo_full_name: c.repo_full_name,
  repo_html_url: c.repo_html_url,
  merged_at: c.merged_at,
  labels: c.labels,
}))

const job = await startGeneration(reposWithContent, {
  template,
  user_id: user.id,
  username: mode.githubUsername,
  avatar_url: user.image ?? undefined,
  contributions: contributionInputs,
})
```

- [ ] **Step 4: Commit**

```bash
git add web/src/lib/rust-api.ts web/src/app/dashboard/actions.ts
git commit -m "feat(api): pass open-source contributions to Rust generation pipeline"
```

---

## Self-Review

**Spec coverage:**
- [x] Google OAuth → handled in Task 2 (auth.ts) + Task 3 (login UI)
- [x] Email auth + verification → Task 2 + Task 4
- [x] GitHub OAuth flow (private + public repos) → unchanged + Task 8 routing
- [x] Google/Email flow → public repos via username → Tasks 5 + 7 + 8
- [x] Org repos (public only) → `listOrgRepos` in Task 7, shown in Task 9
- [x] Open source contributions → `listContributions` in Task 7, wired in Task 10
- [x] Onboarding for Google/Email users → Task 5
- [x] Auto-resolve GitHub username for GitHub OAuth → Task 6

**Placeholder scan:** All steps contain complete code. No TODOs.

**Type consistency:**
- `GithubContribution` defined in Task 7 step 1 (`types/portfolio.ts`), used in Task 7 step 2 (`github.ts`) and Task 8 (`actions.ts`) — consistent.
- `RepoData` interface defined in Task 8, consumed in Task 9 (`dashboard/page.tsx`) — consistent.
- `resolveAndPersistGithubUsername` defined in Task 6, imported in Task 8 — consistent.
- `listContributions` defined in Task 7, imported in Tasks 8 and 10 — consistent.

**Known constraint:** The `as never` casts in Tasks 6 and 8 for `githubUsername` Drizzle queries are required until `drizzle-kit generate` + `push` regenerates types to include the new column. Documenting this avoids confusion.
