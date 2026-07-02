import Link from "next/link"
import { Building2, ShieldCheck, UserRound } from "lucide-react"
import BrandLogo from "@/components/brand-logo"

const roles = [
  {
    title: "User",
    description: "Submit feedback, track rewards, and manage your contributor profile.",
    highlight: "Earn rewards and share insights",
    loginHref: "/login",
    registerHref: "/signup",
    icon: UserRound,
    glow: "from-violet-500/30 to-purple-500/20",
    iconTint: "text-violet-200",
    badgeGlow: "shadow-[0_0_24px_rgba(139,92,246,0.28)]",
  },
  {
    title: "Client",
    description: "Launch campaigns, review insights, and scale decision-making.",
    highlight: "Launch campaigns and gather insights",
    loginHref: "/client-login",
    registerHref: "/client-signup",
    icon: Building2,
    glow: "from-fuchsia-500/25 to-violet-500/25",
    iconTint: "text-fuchsia-200",
    badgeGlow: "shadow-[0_0_24px_rgba(192,132,252,0.28)]",
  },
  {
    title: "Admin",
    description: "Moderate quality, manage approvals, and control platform operations.",
    highlight: "Manage platform and ensure quality",
    loginHref: "/admin-login",
    registerHref: "/admin-signup",
    icon: ShieldCheck,
    glow: "from-purple-500/28 to-fuchsia-500/24",
    iconTint: "text-purple-200",
    badgeGlow: "shadow-[0_0_24px_rgba(168,85,247,0.28)]",
  },
]

export default function SignInPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#020617] via-[#060816] to-[#0a0618] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-28 -left-20 h-[420px] w-[420px] rounded-full bg-purple-600/18 blur-3xl float-animation" style={{ animationDuration: "18s" }} />
        <div className="absolute -bottom-24 -right-16 h-[440px] w-[440px] rounded-full bg-violet-600/16 blur-3xl float-animation" style={{ animationDuration: "22s" }} />
        <div className="absolute left-1/2 top-1/3 h-[280px] w-[280px] -translate-x-1/2 rounded-full bg-fuchsia-500/10 blur-3xl float-animation" style={{ animationDuration: "26s" }} />
      </div>

      <header className="relative border-b border-violet-300/10 bg-[#070916]/55 backdrop-blur-md">
        <div className="flex h-16 w-full items-center px-4 sm:px-6 lg:px-8">
          <Link href="/" className="inline-flex items-center">
            <BrandLogo width={120} height={34} className="h-8 w-auto" />
          </Link>
        </div>
      </header>

      <div className="relative mx-auto flex min-h-[calc(100vh-64px)] w-full max-w-6xl flex-col px-4 py-10 sm:px-6">
        <section className="mx-auto my-auto w-full py-10">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-4 w-full text-left">
              <Link
                href="/"
                className="inline-flex items-center rounded-xl border border-violet-300/30 bg-violet-500/15 px-4 py-2 text-sm font-medium text-violet-100 transition-all duration-200 hover:-translate-x-0.5 hover:bg-violet-500/25 hover:text-white hover:shadow-[0_12px_28px_rgba(124,58,237,0.3)]"
              >
                &larr; Back to home
              </Link>
            </div>
            <p className="inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-violet-500/10 px-4 py-2 text-sm text-violet-200">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-300" />
              Choose your access type
            </p>
            <h1 className="mt-8 text-balance text-4xl font-semibold leading-tight text-slate-100 sm:text-6xl">
              Sign in to the right workspace
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-300">
              Separate login and registration for User, Client, and Admin. Same clean experience, role-specific routing.
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {roles.map((role) => {
              const Icon = role.icon
              return (
                <article
                  key={role.title}
                  className="group rounded-3xl border border-white/10 bg-white/[0.04] p-7 transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] hover:border-violet-300/35 hover:shadow-[0_22px_56px_rgba(124,58,237,0.28)] focus-within:-translate-y-1 focus-within:scale-[1.02] focus-within:border-violet-300/50 focus-within:shadow-[0_24px_62px_rgba(139,92,246,0.32)]"
                >
                  <div className={`mb-5 grid h-12 w-12 place-items-center rounded-2xl border border-white/15 bg-gradient-to-br ${role.glow} ${role.badgeGlow} transition-all duration-300 group-hover:scale-105`}>
                    <Icon className={`h-5 w-5 ${role.iconTint}`} />
                  </div>
                  <h2 className="text-2xl font-semibold text-white">{role.title}</h2>
                  <p className="mt-3 min-h-16 text-slate-300">{role.description}</p>
                  <p className="mt-2 text-sm text-violet-200/90">{role.highlight}</p>
                  <div className="mt-6 flex gap-3">
                    <Link
                      href={role.loginHref}
                      className="inline-flex flex-1 items-center justify-center rounded-xl border border-violet-300/20 bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-2.5 font-medium text-white shadow-[0_12px_30px_rgba(124,58,237,0.35)] transition-all duration-200 hover:scale-[1.02] hover:brightness-110 hover:shadow-[0_16px_36px_rgba(139,92,246,0.42)]"
                    >
                      Login
                    </Link>
                    <Link
                      href={role.registerHref}
                      className="inline-flex flex-1 items-center justify-center rounded-xl border border-violet-300/15 bg-white/[0.06] px-4 py-2.5 font-medium text-slate-200 transition-all duration-200 hover:scale-[1.02] hover:border-violet-300/35 hover:bg-violet-500/10 hover:text-white hover:shadow-[0_14px_32px_rgba(124,58,237,0.22)]"
                    >
                      Register
                    </Link>
                  </div>
                </article>
              )
            })}
          </div>

        </section>
      </div>
    </main>
  )
}
