import Link from "next/link"
import { Building2, UserRound } from "lucide-react"
import BrandLogo from "@/components/brand-logo"

// Only User and Client self-serve. Admin is sign-in only and unadvertised —
// there is no admin card here and no admin signup anywhere (ARCHITECTURE §5.1/§5.3).
const roles = [
  {
    title: "User",
    description: "Submit feedback, track rewards, and manage your contributor profile.",
    highlight: "Earn rewards and share insights",
    loginHref: "/login",
    registerHref: "/signup",
    icon: UserRound,
  },
  {
    title: "Client",
    description: "Launch campaigns, review insights, and scale decision-making.",
    highlight: "Launch campaigns and gather insights",
    loginHref: "/client-login",
    registerHref: "/client-signup",
    icon: Building2,
  },
]

const ctaPrimary =
  "inline-flex flex-1 items-center justify-center rounded-xl bg-gradient-to-b from-[#f2c877] to-gold-deep px-4 py-2.5 font-semibold text-[#241a06] shadow-[0_10px_26px_-12px_rgba(235,188,107,0.5)] transition-all hover:-translate-y-0.5 hover:brightness-105"
const ctaGhost =
  "inline-flex flex-1 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 font-medium text-ink transition-all hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.06]"

export default function SignInPage() {
  return (
    <main className="min-h-screen bg-background text-ink">
      <header className="border-b border-white/[0.06] bg-background/70 backdrop-blur-xl">
        <div className="flex h-16 w-full items-center px-4 sm:px-6 lg:px-8">
          <Link href="/" className="inline-flex items-center" aria-label="TrustVox home">
            <BrandLogo width={132} height={38} priority className="h-9 w-auto" />
          </Link>
        </div>
      </header>

      <div className="mx-auto flex min-h-[calc(100vh-64px)] w-full max-w-5xl flex-col justify-center px-6 py-16">
        <div className="mb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-ink-dim transition-all hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.06] hover:text-ink"
          >
            &larr; Back to home
          </Link>
        </div>

        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">Choose your access type</p>
          <h1 className="mt-3 text-balance font-display text-4xl font-extrabold tracking-[-0.03em] sm:text-5xl">
            Sign in to the right workspace
          </h1>
          <p className="mx-auto mt-4 max-w-[46ch] text-lg text-ink-dim">
            Separate login and registration for User and Client. Same clean experience, role-specific
            routing.
          </p>
        </div>

        <div className="mx-auto mt-12 grid w-full max-w-3xl gap-4 md:grid-cols-2">
          {roles.map((role) => {
            const Icon = role.icon
            return (
              <article
                key={role.title}
                className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-6 transition-all duration-200 hover:-translate-y-1 hover:border-white/15"
              >
                <div className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-gold">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="mt-4 font-display text-xl font-bold text-ink">{role.title}</h2>
                <p className="mt-2 min-h-[3.5rem] text-sm leading-relaxed text-ink-muted">{role.description}</p>
                <p className="mt-1 text-xs font-medium text-gold">{role.highlight}</p>
                <div className="mt-5 flex gap-2.5">
                  <Link href={role.loginHref} className={ctaPrimary}>
                    Login
                  </Link>
                  <Link href={role.registerHref} className={ctaGhost}>
                    Register
                  </Link>
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </main>
  )
}
