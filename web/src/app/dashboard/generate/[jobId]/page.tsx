import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { GenerationProgress } from "@/components/dashboard/generation-progress"
import { AppHeader } from "@/components/layout/app-header"

interface Props {
  params: Promise<{ jobId: string }>
}

export default async function GeneratePage({ params }: Props) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")

  const { jobId } = await params

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <AppHeader
        user={{
          name: session.user.name ?? session.user.email,
          email: session.user.email,
          image: session.user.image,
        }}
      />

      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <GenerationProgress
          jobId={jobId}
          username={session.user.name ?? session.user.id}
        />
      </div>
    </div>
  )
}
