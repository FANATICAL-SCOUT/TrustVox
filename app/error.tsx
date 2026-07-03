"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, RotateCcw, Home } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.error("[TrustVox] Unhandled error boundary:", error)
    }
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6 text-ink">
      <div className="w-full max-w-lg space-y-4 rounded-2xl border border-white/[0.08] bg-surface p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl border border-destructive/30 bg-destructive/10">
          <AlertTriangle className="text-destructive" size={28} />
        </div>
        <h1 className="font-display text-2xl font-bold">Something went wrong</h1>
        <p className="text-sm text-ink-dim">
          This screen hit an unexpected error. Your data is stored locally and hasn&apos;t been affected — try again or head back home.
        </p>
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="outline"
            className="border-white/15 text-ink-dim hover:border-white/25 hover:text-ink"
            onClick={() => reset()}
          >
            <RotateCcw className="mr-2" size={14} /> Try again
          </Button>
          <Button
            className="bg-gradient-to-b from-[#f2c877] to-gold-deep font-semibold text-[#241a06] hover:brightness-105"
            onClick={() => router.push("/")}
          >
            <Home className="mr-2" size={14} /> Home
          </Button>
        </div>
      </div>
    </div>
  )
}
