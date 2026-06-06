import Image from "next/image"
import { cn } from "@/lib/utils"

interface AstraLogoProps {
  /**
   * full   → icon + name  (/logo.svg)
   * icon   → icon only    (/favicon.svg)
   * name   → name only    (/name.svg)
   */
  variant?: "full" | "icon" | "name"
  className?: string
  height?: number
}

const SRCS: Record<NonNullable<AstraLogoProps["variant"]>, string> = {
  full: "/logo.svg",
  icon: "/favicon.svg",
  name: "/name.svg",
}

export function AstraLogo({ variant = "full", className, height = 32 }: AstraLogoProps) {
  return (
    <Image
      src={SRCS[variant]}
      alt="Astra"
      height={height}
      width={height * 4}
      className={cn("h-8 w-auto", className)}
      style={{ width: "auto", height: height }}
      priority
    />
  )
}
