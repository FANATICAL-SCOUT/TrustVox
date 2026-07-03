"use client"

import { useRouter } from "next/navigation"
import { Compass, ArrowLeft, Home } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  const router = useRouter()

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6 text-ink">
      <div className="w-full max-w-lg space-y-4 rounded-2xl border border-white/[0.08] bg-surface p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl border border-gold/25 bg-gold/10">
          <Compass className="text-gold" size={28} />
        </div>
        <h1 className="font-display text-2xl font-bold">Page not found</h1>
        <p className="text-sm text-ink-dim">The route you&apos;re looking for doesn&apos;t exist. Try heading back or returning home.</p>
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="outline"
            className="border-white/15 text-ink-dim hover:border-white/25 hover:text-ink"
            onClick={() => router.back()}
          >
            <ArrowLeft className="mr-2" size={14} /> Go back
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
