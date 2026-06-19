import { NextResponse } from "next/server"
import { fetchGithubProfile } from "@/lib/github"

export const dynamic = "force-dynamic"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params
  if (!username) return NextResponse.json(null, { status: 400 })

  const profile = await fetchGithubProfile(username)
  if (!profile) return NextResponse.json(null, { status: 404 })

  return NextResponse.json(profile, {
    headers: { "Cache-Control": "no-store" },
  })
}
