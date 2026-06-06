import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { AstraLogo } from "@/components/ui/astra-logo"
import { AuthButtons } from "./login-button"

export default async function LoginPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (session) redirect("/dashboard")

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center px-6 bg-background">
      <div className="w-full max-w-sm text-center space-y-8">

        {/* Brand */}
        <div className="flex flex-col items-center gap-3">
          <AstraLogo variant="full" height={120} />
          <p className="text-sm text-muted-foreground">
            Your GitHub, as a portfolio.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card p-8 space-y-6 shadow-sm">
          <div className="space-y-1">
            <h1 className="text-lg font-semibold text-foreground">
              Sign in to Astra
            </h1>
            <p className="text-sm text-muted-foreground">
              Choose how you want to sign in.
            </p>
          </div>

          <AuthButtons />

          <p className="text-xs leading-relaxed text-muted-foreground/70">
            GitHub sign-in grants access to private repositories. Google
            sign-in only accesses your public GitHub profile.
          </p>
        </div>
      </div>
    </div>
  )
}
