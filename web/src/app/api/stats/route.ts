import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { portfolios, waitlist } from "@/lib/schema"
import { count, eq } from "drizzle-orm"

export const revalidate = 300 // revalidate every 5 minutes

export async function GET() {
  try {
    const [[{ total: totalPortfolios }], [{ total: publishedPortfolios }], [{ total: waitlistCount }]] =
      await Promise.all([
        db.select({ total: count() }).from(portfolios),
        db.select({ total: count() }).from(portfolios).where(eq(portfolios.isPublished, true)),
        db.select({ total: count() }).from(waitlist),
      ])

    return NextResponse.json({
      portfolios: Number(totalPortfolios),
      published: Number(publishedPortfolios),
      waitlist: Number(waitlistCount),
    })
  } catch {
    return NextResponse.json({ portfolios: 0, published: 0, waitlist: 0 })
  }
}
