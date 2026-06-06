"use client"

import { useTheme } from "next-themes"
import { AnimatedThemeToggler } from "./animated-theme-toggler"

export function FloatingThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <AnimatedThemeToggler
      theme={resolvedTheme as "light" | "dark"}
      onThemeChange={setTheme}
      variant="circle"
      duration={500}
      className="fixed bottom-5 right-5 z-50 w-9 h-9 rounded-full flex items-center justify-center bg-background/80 border border-border shadow-sm backdrop-blur-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors [&_svg]:size-4 [&_svg]:stroke-[1.5]"
    />
  )
}
