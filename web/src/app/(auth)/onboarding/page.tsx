import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { AppHeader } from "@/components/layout/app-header"
import { OnboardingForm } from "./onboarding-form"

export default async function OnboardingPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")

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
        <div className="w-full max-w-sm">
          <OnboardingForm />
        </div>
      </div>
    </div>
  )
}
