import type { Metadata } from "next"
import Link from "next/link"
import BrandLogo from "@/components/brand-logo"
import { ShieldCheck, FileText } from "lucide-react"

export const metadata: Metadata = {
  title: "Privacy & Terms — TrustVox",
  description: "How TrustVox handles your data, and the terms of using the platform.",
}

const navLink =
  "rounded-lg px-3 py-2 text-sm font-medium text-ink-dim transition-colors hover:bg-white/5 hover:text-ink"

// One combined legal page with a Privacy section and a Terms section, both
// linkable via #privacy / #terms anchors. Honest placeholder policy content for
// a portfolio project — plain-language, no fabricated certifications or claims.
const PRIVACY_POINTS = [
  {
    heading: "What we collect",
    body: "When you register we store your name, email, date of birth (to confirm you're 16 or older), and gender. As you use TrustVox we store the feedback you submit, the TVX you earn and spend, and the rewards you redeem.",
  },
  {
    heading: "How we use it",
    body: "Your data is used to run your account: to show your dashboard, credit rewards for accepted feedback, and let clients see anonymised, aggregated responses to their forms. Respondent identities are not shown to clients.",
  },
  {
    heading: "Who can see it",
    body: "Access is controlled by role. Users see only their own data, clients see only aggregated responses to their own forms, and admins manage the platform. These boundaries are enforced at the database level, not just in the interface.",
  },
  {
    heading: "Your choices",
    body: "You can edit most of your profile at any time. Your email is fixed once you register. If you'd like your account removed, contact us and we'll take care of it.",
  },
]

const TERMS_POINTS = [
  {
    heading: "Using TrustVox",
    body: "You must be at least 16 to create an account. Keep your login details to yourself — you're responsible for activity on your account.",
  },
  {
    heading: "Feedback & rewards",
    body: "Submit honest, genuine feedback. TVX tokens are in-app reward points with no cash value — they are not currency, crypto, or a financial instrument. Rewards for accepted feedback are credited automatically through the platform; you cannot create tokens yourself.",
  },
  {
    heading: "Coupons",
    body: "Coupons redeemed with TVX are subject to their own validity period. Once redeemed, a coupon's code and expiry are shown in your profile.",
  },
  {
    heading: "Fair use",
    body: "Don't submit duplicate or fake feedback, attempt to game the reward system, or misuse another person's account. Accounts that do may be blocked.",
  },
  {
    heading: "This is a demonstration project",
    body: "TrustVox is a portfolio / showcase project, not a live commercial service. This page describes how the platform is designed to work; it is not a binding legal contract.",
  },
]

export default function LegalPage() {
  return (
    <div className="min-h-screen bg-background text-ink">
      {/* NAV */}
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-6">
          <Link href="/" className="inline-flex items-center" aria-label="TrustVox home">
            <BrandLogo width={132} height={38} priority className="h-9 w-auto" />
          </Link>
          <nav className="ml-2 hidden items-center gap-1 md:flex">
            <Link href="/#features" className={navLink}>Features</Link>
            <Link href="/#how" className={navLink}>How it works</Link>
            <Link href="/contact" className={navLink}>Contact</Link>
          </nav>
          <div className="ml-auto">
            <Link
              href="/signin"
              className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-ink transition-all hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.06]"
            >
              Sign in
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="mx-auto max-w-4xl px-6 pb-4 pt-16 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">Privacy &amp; Terms</p>
        <h1 className="mt-3 text-balance font-display text-4xl font-extrabold leading-[1.08] tracking-[-0.03em] sm:text-5xl">
          The short, plain-language version.
        </h1>
        <p className="mx-auto mt-4 max-w-[54ch] text-lg leading-relaxed text-ink-dim">
          No dense boilerplate — here&apos;s how TrustVox handles your data and what we ask of you in return.
        </p>
        <div className="mt-6 flex justify-center gap-3 text-sm">
          <a href="#privacy" className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2 font-medium text-ink-dim transition-colors hover:text-ink">
            Privacy
          </a>
          <a href="#terms" className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2 font-medium text-ink-dim transition-colors hover:text-ink">
            Terms
          </a>
        </div>
      </section>

      {/* CONTENT */}
      <section className="mx-auto max-w-4xl px-6 pb-24 pt-10">
        <div className="space-y-6">
          {/* Privacy */}
          <div id="privacy" className="scroll-mt-24 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 sm:p-8">
            <div className="mb-6 flex items-center gap-3">
              <div className="grid h-11 w-11 flex-none place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-gold">
                <ShieldCheck size={20} />
              </div>
              <h2 className="font-display text-2xl font-bold text-ink">Privacy</h2>
            </div>
            <dl className="space-y-5">
              {PRIVACY_POINTS.map((p) => (
                <div key={p.heading}>
                  <dt className="text-sm font-semibold text-ink">{p.heading}</dt>
                  <dd className="mt-1 text-sm leading-relaxed text-ink-muted">{p.body}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Terms */}
          <div id="terms" className="scroll-mt-24 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 sm:p-8">
            <div className="mb-6 flex items-center gap-3">
              <div className="grid h-11 w-11 flex-none place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-gold">
                <FileText size={20} />
              </div>
              <h2 className="font-display text-2xl font-bold text-ink">Terms of use</h2>
            </div>
            <dl className="space-y-5">
              {TERMS_POINTS.map((p) => (
                <div key={p.heading}>
                  <dt className="text-sm font-semibold text-ink">{p.heading}</dt>
                  <dd className="mt-1 text-sm leading-relaxed text-ink-muted">{p.body}</dd>
                </div>
              ))}
            </dl>
          </div>

          <p className="text-center text-xs text-ink-muted">
            Questions about any of this?{" "}
            <Link href="/contact" className="text-gold hover:text-gold-deep">
              Get in touch
            </Link>
            .
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/[0.06] py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 text-sm text-ink-muted sm:flex-row">
          <div>&copy; 2026 TrustVox. All rights reserved.</div>
          <div className="flex gap-5">
            <Link href="/legal#privacy" className="transition-colors hover:text-ink">Privacy</Link>
            <Link href="/legal#terms" className="transition-colors hover:text-ink">Terms</Link>
            <Link href="/contact" className="transition-colors hover:text-ink">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
