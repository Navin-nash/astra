import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core"

// ─── Better Auth tables ────────────────────────────────────────────────────
// Defined in auth-schema.ts (Better Auth CLI-managed).
// Re-exported here so the rest of the app can import from a single path.
export {
  user as baUser,
  session as baSession,
  account as baAccount,
  verification as baVerification,
  rateLimit as baRateLimit,
} from "./auth-schema"

// ─── Astra app tables ──────────────────────────────────────────────────────

export const waitlist = pgTable("waitlist", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  source: text("source").notNull().default("landing"),
})

export const portfolios = pgTable("portfolios", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().unique(),
  username: text("username").notNull().unique(),
  avatarUrl: text("avatar_url"),
  mdxContent: text("mdx_content").notNull().default(""),
  themeConfig: jsonb("theme_config").notNull().$type<Record<string, unknown>>().default({}),
  isPublished: boolean("is_published").notNull().default(false),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

export const repositories = pgTable(
  "repositories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    portfolioId: uuid("portfolio_id")
      .notNull()
      .references(() => portfolios.id, { onDelete: "cascade" }),
    githubRepoId: text("github_repo_id").notNull(),
    name: text("name").notNull(),
    fullName: text("full_name").notNull(),
    description: text("description"),
    htmlUrl: text("html_url"),
    homepage: text("homepage"),
    primaryLanguage: text("primary_language"),
    topics: jsonb("topics").notNull().$type<string[]>().default([]),
    starsCount: integer("stars_count").notNull().default(0),
    forksCount: integer("forks_count").notNull().default(0),
    astMetadata: jsonb("ast_metadata").$type<Record<string, unknown>>(),
    aiSummary: text("ai_summary"),
    readmeContent: text("readme_content"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.portfolioId, t.githubRepoId)]
)
