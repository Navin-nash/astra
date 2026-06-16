import Link from "next/link"
import { AstraLogo } from "@/components/ui/astra-logo"
import { UserMenu } from "@/components/dashboard/user-menu"

interface AppHeaderUser {
  name: string
  email: string
  image?: string | null
}

interface AppHeaderProps {
  user?: AppHeaderUser
  children?: React.ReactNode
}

export function AppHeader({ user, children }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="max-w-2xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/dashboard" aria-label="Go to dashboard">
          <AstraLogo variant="full" height={72} />
        </Link>

        <div className="flex items-center gap-4">
          {children}
          {user && (
            <UserMenu
              name={user.name}
              email={user.email}
              image={user.image}
            />
          )}
        </div>
      </div>
    </header>
  )
}
