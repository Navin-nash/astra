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
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },

  // ─── Extended user fields ─────────────────────────────────────────────────
  // github_username is added via migration 004_github_username.sql.
  // Declared here so Better Auth includes it in session/user inference.
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
    expiresIn: 60 * 60 * 24 * 30,  // 30 days
    updateAge: 60 * 60 * 24,        // refresh once per day
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
    // NOTE: encryptOAuthTokens intentionally disabled.
    // We query account.accessToken directly via Drizzle in github.ts.
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
    },
  },

  // ─── Trusted origins ─────────────────────────────────────────────────────
  trustedOrigins: process.env.ALLOWED_ORIGINS?.split(",").filter(Boolean) ?? [],

  // ─── Security ─────────────────────────────────────────────────────────────
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    cookiePrefix: "astra",
  },
})

export type Session = typeof auth.$Infer.Session
export type User = typeof auth.$Infer.Session.user
