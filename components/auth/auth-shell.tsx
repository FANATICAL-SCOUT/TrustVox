import type { FormEvent, ReactNode } from "react"
import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { ArrowLeft, Loader2 } from "lucide-react"
import BrandLogo from "@/components/brand-logo"

export const authInputClass =
  "w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-ink outline-none transition placeholder:text-ink-muted focus:border-gold/40 focus:ring-2 focus:ring-gold/20"

export const authFieldLabelClass = "mb-2 block text-sm text-ink-dim"

const authSubmitClass =
  "inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#f2c877] to-gold-deep px-4 py-3 font-semibold text-[#241a06] shadow-[0_10px_26px_-12px_rgba(235,188,107,0.5)] transition-all hover:-translate-y-0.5 hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:brightness-100"

interface AuthShellProps {
  icon: LucideIcon
  title: string
  subtitle: string
  backHref: string
  backLabel: string
  footerText: string
  footerLinkHref: string
  footerLinkLabel: string
  error?: string
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
  submitLabel: string
  submitIcon: LucideIcon
  isSubmitting?: boolean
  children: ReactNode
}

export default function AuthShell({
  icon: Icon,
  title,
  subtitle,
  backHref,
  backLabel,
  footerText,
  footerLinkHref,
  footerLinkLabel,
  error,
  onSubmit,
  submitLabel,
  submitIcon: SubmitIcon,
  isSubmitting = false,
  children,
}: AuthShellProps) {
  return (
    <main className="relative min-h-screen bg-background text-ink">
      <header className="relative border-b border-white/[0.06] bg-background/70 backdrop-blur-xl">
        <div className="flex h-16 w-full items-center px-4 sm:px-6 lg:px-8">
          <Link href="/" className="inline-flex items-center" aria-label="TrustVox home">
            <BrandLogo width={132} height={38} priority className="h-9 w-auto" />
          </Link>
        </div>
      </header>

      <div className="relative flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-md">
          <div className="mb-5">
            <Link
              href={backHref}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-ink-dim transition-all hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.06] hover:text-ink"
            >
              <ArrowLeft className="h-4 w-4" />
              {backLabel}
            </Link>
          </div>

          <section className="w-full rounded-2xl border border-white/[0.07] bg-white/[0.02] p-7 sm:p-8">
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-gold">
                <Icon className="h-5 w-5" />
              </div>
              <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">{title}</h1>
              <p className="mt-2 text-ink-dim">{subtitle}</p>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              {children}

              {error ? <p className="text-sm text-rose">{error}</p> : null}

              <button
                type="submit"
                className={authSubmitClass}
                disabled={isSubmitting}
                aria-busy={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <SubmitIcon className="h-4 w-4" />
                )}
                {submitLabel}
              </button>
            </form>

            <p className="mt-5 text-center text-sm text-ink-dim">
              {footerText}{" "}
              <Link href={footerLinkHref} className="font-medium text-gold hover:text-gold-deep">
                {footerLinkLabel}
              </Link>
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}
