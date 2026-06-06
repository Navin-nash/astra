import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { nextCookies } from "better-auth/next-js"
import { db } from "./db"
import * as authSchema from "./auth-schema"

export const auth = betterAuth({
  appName: "Astra",
  // BETTER_AUTH_SECRET and BETTER_AUTH_URL are read from env automatically.
  // Generate a secret: openssl rand -base64 32

  // ─── Database ─────────────────────────────────────────────────────────────
  // Spread the entire auth-schema so adding new plugins (which regenerate
  // auth-schema.ts via `npm run auth:generate`) works without touching this file.
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: authSchema,
  }),

  plugins: [nextCookies()],

  // ─── Social providers ─────────────────────────────────────────────────────
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      // repo scope required to list private repositories
      scope: ["read:user", "user:email", "repo"],
    },
  },

  // ─── Session ──────────────────────────────────────────────────────────────
  session: {
    expiresIn: 60 * 60 * 24 * 30,  // 30 days
    updateAge: 60 * 60 * 24,        // refresh once per day
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,               // re-validate against DB every 5 min
      strategy: "jwe",              // AES-256-GCM encrypted cookie — most secure
    },
  },

  // ─── Account ──────────────────────────────────────────────────────────────
  account: {
    accountLinking: {
      enabled: true,
    },
    // NOTE: encryptOAuthTokens is intentionally disabled.
    // We query `account.accessToken` directly via Drizzle in github.ts.
    // Enabling encryption would return ciphertext from raw Drizzle queries.
    // To enable, migrate getGithubToken() to use auth.api.listAccounts() instead.
  },

  // ─── Rate limiting ────────────────────────────────────────────────────────
  // Uses "database" storage so limits persist across serverless restarts.
  // Sensitive auth endpoints get tighter per-endpoint windows.
  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 60,
    customRules: {
      "/api/auth/sign-in/social": { window: 60, max: 10 },
      "/api/auth/callback/github": { window: 60, max: 10 },
    },
  },

  // ─── Trusted origins ─────────────────────────────────────────────────────
  // BETTER_AUTH_URL origin is trusted automatically.
  // Add extra origins (staging, preview URLs) via BETTER_AUTH_TRUSTED_ORIGINS
  // env var (comma-separated) — Better Auth reads this natively.
  trustedOrigins: process.env.ALLOWED_ORIGINS?.split(",").filter(Boolean) ?? [],

  // ─── Security ─────────────────────────────────────────────────────────────
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    cookiePrefix: "astra",
    // disableCSRFCheck: false — NEVER change this
    // disableOriginCheck: false — NEVER change this
  },
})

export type Session = typeof auth.$Infer.Session
export type User = typeof auth.$Infer.Session.user
