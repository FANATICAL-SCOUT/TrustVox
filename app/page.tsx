import Link from "next/link"
import BrandLogo from "@/components/brand-logo"

const UsersIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
)
const ActivityIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
)
const ClockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" /></svg>
)
const MonitorIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>
)
const ShieldIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
)
const CoinIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M14.5 9.5a2.5 2.5 0 0 0-2.5-1.5c-1.4 0-2.5.8-2.5 2s1.1 2 2.5 2 2.5.8 2.5 2-1.1 2-2.5 2a2.5 2.5 0 0 1-2.5-1.5" /><path d="M12 6.5v11" /></svg>
)

const FEATURES = [
  { icon: <UsersIcon />, name: "Verified contributors", desc: "Every respondent is a real, identity-checked user — so the feedback comes from people who actually match your audience." },
  { icon: <ActivityIcon />, name: "Real-time analytics", desc: "Watch responses roll in live with sentiment, trends, and exportable dashboards built for decisions, not vanity." },
  { icon: <ClockIcon />, name: "Fast turnaround", desc: "Launch a campaign and start getting quality responses in hours — no lengthy recruitment or panel setup." },
  { icon: <MonitorIcon />, name: "Multi-format surveys", desc: "Ratings, open text, multiple choice, voice — mix formats to capture the depth of insight your team needs." },
  { icon: <ShieldIcon />, name: "Privacy first", desc: "Privacy by design. Respondent data is anonymised by default, and every action runs through role-based access controls." },
  { icon: <CoinIcon />, name: "TVX rewards", desc: "Set the reward, we handle the rest. Contributors earn TVX tokens and redeem them for real coupons — paid on accepted responses." },
]

const STEPS = [
  { num: "01", title: "Create a campaign", desc: "Define your audience, craft your questions, and set the TVX reward. Takes under ten minutes." },
  { num: "02", title: "Collect responses", desc: "Verified contributors answer on their own time. Every response is quality-checked before it reaches you." },
  { num: "03", title: "Act on insights", desc: "Explore your dashboard, export to your tools, and ship what your users actually asked for." },
]

const LOOP = [
  { t: "Give feedback", d: "Answer a short, structured survey", v: "+45", tone: "mint" as const },
  { t: "Get accepted", d: "Reward credits after review", v: "+45", tone: "mint" as const },
  { t: "Redeem a coupon", d: "Amazon, Spotify, and more", v: "−250", tone: "gold" as const },
]

const navLink = "rounded-lg px-3 py-2 text-sm font-medium text-ink-dim transition-colors hover:bg-white/5 hover:text-ink"
const ctaPrimary = "inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-[#f2c877] to-gold-deep px-5 py-3 font-semibold text-[#241a06] shadow-[0_10px_26px_-12px_rgba(235,188,107,0.5)] transition-all hover:-translate-y-0.5 hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background"
const ctaGhost = "inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3 font-semibold text-ink transition-all hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
const cardBase = "rounded-xl border border-white/[0.07] bg-white/[0.02] p-6 transition-all duration-200 hover:-translate-y-1 hover:border-white/15"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-ink">
      {/* NAV */}
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-6">
          <Link href="/" className="inline-flex items-center" aria-label="TrustVox home">
            <BrandLogo width={132} height={38} priority className="h-9 w-auto" />
          </Link>
          <nav className="ml-2 hidden items-center gap-1 md:flex">
            <Link href="#features" className={navLink}>Features</Link>
            <Link href="#how" className={navLink}>How it works</Link>
            <Link href="/contact" className={navLink}>Contact</Link>
          </nav>
          <div className="ml-auto">
            <Link href="/signin" className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-ink transition-all hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.06]">Sign in</Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-20">
        <div className="grid items-center gap-14 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p data-reveal-block className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">Feedback &middot; Rewards &middot; Trust</p>
            <h1 className="mt-4 text-balance font-display text-5xl font-extrabold leading-[1.04] tracking-[-0.03em] sm:text-6xl md:text-7xl">
              Feedback that<br /><span className="tvx-text-gold">pays you back.</span>
            </h1>
            <p data-reveal-block className="mt-5 max-w-[46ch] text-lg leading-relaxed text-ink-dim">
              Share honest feedback on the products you use, earn <span className="text-ink">TVX tokens</span> for every accepted response, and redeem them for real coupons. Built for people whose opinions are worth something.
            </p>
            <div data-reveal-block className="mt-8 flex flex-wrap gap-3">
              <Link href="/signin" className={ctaPrimary}>Start earning</Link>
              <Link href="/signup" className={ctaGhost}>I&apos;m a contributor &rarr;</Link>
            </div>
            <div data-reveal-block className="mt-9 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm text-ink-muted">
              <span><b className="tvx-num text-ink">3-step</b> loop</span>
              <span className="hidden h-6 w-px bg-white/10 sm:inline-block" />
              <span><b className="tvx-num text-ink">~2 min</b> per survey</span>
              <span className="hidden h-6 w-px bg-white/10 sm:inline-block" />
              <span>Redeem for <b className="text-ink">real coupons</b></span>
            </div>
          </div>

          {/* reward loop card */}
          <div data-reveal-card className="tvx-card-gold rounded-2xl border border-white/[0.08] bg-gradient-to-b from-surface to-[#0e1017] p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">Your wallet</p>
                <div className="tvx-num mt-1 text-3xl font-bold">1,240 <span className="text-base font-bold text-gold">TVX</span></div>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-mint/25 bg-mint/10 px-2.5 py-1 text-xs font-semibold text-mint">+80 this week</span>
            </div>
            <div className="grid gap-2.5">
              {LOOP.map((s) => (
                <div key={s.t} className="flex items-center gap-3 rounded-[10px] border border-white/[0.07] bg-white/[0.025] px-3.5 py-3">
                  <span className={`grid h-8 w-8 flex-none place-items-center rounded-lg border border-white/10 ${s.tone === "mint" ? "text-mint" : "text-gold"}`}>
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-ink">{s.t}</div>
                    <div className="text-xs text-ink-muted">{s.d}</div>
                  </div>
                  <div className={`tvx-num ml-auto text-sm font-bold ${s.tone === "mint" ? "text-mint" : "text-gold"}`}>{s.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="border-t border-white/[0.06] py-20">
        <div className="mx-auto max-w-6xl px-6">
          <p data-reveal-block className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">Why TrustVox</p>
          <h2 data-reveal-block className="mt-3 max-w-[22ch] text-balance font-display text-3xl font-extrabold tracking-[-0.03em] sm:text-4xl">Everything you need to capture real feedback</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.name} data-reveal-card className={cardBase}>
                <div className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-gold [&_svg]:h-5 [&_svg]:w-5">{f.icon}</div>
                <div className="mt-4 font-display text-lg font-bold text-ink">{f.name}</div>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="border-t border-white/[0.06] py-20">
        <div className="mx-auto max-w-6xl px-6">
          <p data-reveal-block className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">The process</p>
          <h2 data-reveal-block className="mt-3 max-w-[22ch] text-balance font-display text-3xl font-extrabold tracking-[-0.03em] sm:text-4xl">Three steps to better decisions</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.num} data-reveal-card className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-6">
                <div className="tvx-num text-sm font-bold text-gold">{s.num}</div>
                <div className="mt-3 font-display text-lg font-bold text-ink">{s.title}</div>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER CTA */}
      <section className="border-t border-white/[0.06] py-20">
        <div data-reveal-block className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-balance font-display text-3xl font-extrabold tracking-[-0.03em] sm:text-4xl">Ready to make your feedback count?</h2>
          <p className="mx-auto mt-4 max-w-[48ch] text-ink-dim">Join TrustVox, share what you think, and turn your opinions into rewards.</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href="/signin" className={ctaPrimary}>Start for free</Link>
            <Link href="/contact" className={ctaGhost}>Talk to us</Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer id="contact" className="border-t border-white/[0.06] py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 text-sm text-ink-muted sm:flex-row">
          <div>&copy; 2026 TrustVox. All rights reserved.</div>
          <div className="flex gap-5">
            <Link href="/" className="transition-colors hover:text-ink">Privacy</Link>
            <Link href="/" className="transition-colors hover:text-ink">Terms</Link>
            <Link href="/contact" className="transition-colors hover:text-ink">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
