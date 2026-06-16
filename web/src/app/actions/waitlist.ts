"use server"

import { z } from "zod"
import { sql } from "drizzle-orm"
import { sendWaitlistConfirmationEmail } from "@/lib/email"

const emailSchema = z.string().email("Please enter a valid email address")

type WaitlistResult = { success: true } | { success: false; error: string }

export async function joinWaitlist(email: string): Promise<WaitlistResult> {
  const parsed = emailSchema.safeParse(email.trim().toLowerCase())
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid email" }
  }

  try {
    const { db } = await import("@/lib/db")
    const result = await db.execute(
      sql`INSERT INTO waitlist (email) VALUES (${parsed.data}) ON CONFLICT (email) DO NOTHING`
    )

    // Only send confirmation for new signups (not duplicates)
    const inserted = (result.rowCount ?? 0) > 0
    if (inserted) {
      await sendWaitlistConfirmationEmail(parsed.data).catch(() => {
        // Email failure is non-fatal — signup still succeeded
      })
    }

    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Database error"
    if (message.includes("DATABASE_URL")) {
      return { success: false, error: "Database not configured yet." }
    }
    return { success: false, error: "Could not save your email. Try again." }
  }
}
