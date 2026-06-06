"use server"

import { z } from "zod"
import { sql } from "drizzle-orm"

const emailSchema = z.string().email("Please enter a valid email address")

type WaitlistResult = { success: true } | { success: false; error: string }

export async function joinWaitlist(email: string): Promise<WaitlistResult> {
  const parsed = emailSchema.safeParse(email.trim().toLowerCase())
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid email" }
  }

  try {
    const { db } = await import("@/lib/db")
    await db.execute(
      sql`INSERT INTO waitlist (email) VALUES (${parsed.data}) ON CONFLICT (email) DO NOTHING`
    )
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Database error"
    if (message.includes("DATABASE_URL")) {
      return { success: false, error: "Database not configured yet." }
    }
    return { success: false, error: "Could not save your email. Try again." }
  }
}
