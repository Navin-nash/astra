import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { getJobStatus } from "@/lib/rust-api"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { jobId } = await params

  try {
    const job = await getJobStatus(jobId)
    return NextResponse.json(job)
  } catch {
    return NextResponse.json({ error: "Job not found" }, { status: 404 })
  }
}
