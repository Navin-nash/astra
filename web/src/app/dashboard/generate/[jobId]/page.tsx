import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { GenerationProgress } from "@/components/dashboard/generation-progress"
import Link from "next/link"
import { AstraLogo } from "@/components/ui/astra-logo"

interface Props {
  params: Promise<{ jobId: string }>
}

export default async function GeneratePage({ params }: Props) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")

  const { jobId } = await params

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      {/* Nav */}
      <header className="border-b border-border px-6 h-14 flex items-center">
        <Link href="/dashboard">
          <AstraLogo variant="full" height={24} />
        </Link>
      </header>

      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <GenerationProgress
          jobId={jobId}
          username={session.user.name ?? session.user.id}
        />
      </div>
    </div>
  )
}
