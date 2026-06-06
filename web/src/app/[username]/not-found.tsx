import Link from "next/link"
import { AstraLogo } from "@/components/ui/astra-logo"

export default function PortfolioNotFound() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center px-6 bg-background text-center">
      <p className="text-xs font-medium uppercase tracking-widest text-brand mb-4">
        404
      </p>
      <h1 className="text-2xl font-bold text-foreground mb-2">Portfolio not found</h1>
      <p className="text-sm text-muted-foreground mb-8">
        This portfolio doesn&apos;t exist or hasn&apos;t been published yet.
      </p>
      <Link
        href="/"
        className="rounded-full px-6 py-2.5 text-sm font-semibold bg-foreground text-background hover:bg-foreground/90 transition-colors"
      >
        Back to Astra
      </Link>
      <div className="mt-12">
        <AstraLogo variant="full" height={20} className="opacity-40" />
      </div>
    </div>
  )
}
