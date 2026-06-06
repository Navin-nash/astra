"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { authClient } from "@/lib/auth-client"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface UserMenuProps {
  name: string
  email: string
  image?: string | null
}

export function UserMenu({ name, email, image }: UserMenuProps) {
  const [loggingOut, setLoggingOut] = useState(false)
  const router = useRouter()

  async function handleSignOut() {
    setLoggingOut(true)
    await authClient.signOut()
    router.push("/")
  }

  const initials = name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-2.5 rounded-full px-2 py-1 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          aria-label="User menu"
        >
          <Avatar className="h-7 w-7 border border-border">
            <AvatarImage src={image ?? undefined} alt={name} />
            <AvatarFallback className="text-[10px] font-semibold text-muted-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="hidden text-sm text-foreground sm:block">{name}</span>
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            className="text-muted-foreground"
          >
            <path
              d="M2 4L6 8L10 4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="px-4 py-3 font-normal">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8 border border-border">
              <AvatarImage src={image ?? undefined} alt={name} />
              <AvatarFallback className="text-xs font-semibold text-muted-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{name}</p>
              <p className="truncate text-xs text-muted-foreground">{email}</p>
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleSignOut}
          disabled={loggingOut}
          className="m-1 cursor-pointer gap-2.5 rounded-md"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            className="text-muted-foreground"
          >
            <path
              d="M5 12H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h2M9.5 9.5L12 7l-2.5-2.5M12 7H5"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {loggingOut ? "Signing out…" : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
