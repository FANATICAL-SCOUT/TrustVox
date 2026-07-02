"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import type { FormEvent } from "react"
import { ShieldCheck, LogIn, ArrowLeft } from "lucide-react"
import BrandLogo from "@/components/brand-logo"
import { Button } from "@/components/ui/button"

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")

    if (!email || !password) {
      setError("Please enter admin email and password.")
      return
    }

    localStorage.setItem("currentAdmin", JSON.stringify({ email, role: "admin" }))
    router.push("/admin")
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#020617] via-[#060816] to-[#0a0618] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-12 top-16 h-72 w-72 rounded-full bg-fuchsia-500/14 blur-3xl float-animation" style={{ animationDuration: "18s" }} />
        <div className="absolute bottom-12 right-10 h-72 w-72 rounded-full bg-violet-500/14 blur-3xl float-animation" style={{ animationDuration: "24s" }} />
      </div>

      <header className="relative border-b border-violet-300/10 bg-[#070916]/55 backdrop-blur-md">
        <div className="flex h-16 w-full items-center px-4 sm:px-6 lg:px-8">
          <Link href="/" className="inline-flex items-center">
            <BrandLogo width={120} height={34} className="h-8 w-auto" />
          </Link>
        </div>
      </header>

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-md">
          <div className="mb-5">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white gap-2 border border-violet-300/20 bg-violet-500/10 hover:bg-violet-500/20">
                <ArrowLeft className="h-4 w-4" />
                Back to home
              </Button>
            </Link>
          </div>

          <section className="w-full rounded-3xl border border-white/10 bg-white/[0.03] p-7 sm:p-8">
          <div className="mt-5 mb-8 text-center">
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl border border-violet-300/25 bg-violet-500/10 shadow-[0_0_20px_rgba(139,92,246,0.2)]">
              <ShieldCheck className="h-5 w-5 text-violet-200" />
            </div>
            <h1 className="text-3xl font-semibold text-white">Admin Login</h1>
            <p className="mt-2 text-slate-300">Secure sign-in for platform administration.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm text-slate-300">
                Admin email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-slate-100 outline-none transition focus:border-rose-300/40"
                placeholder="admin@trustvox.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-2 block text-sm text-slate-300">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-slate-100 outline-none transition focus:border-rose-300/40"
                placeholder="Enter password"
              />
            </div>

            {error ? <p className="text-sm text-rose-300">{error}</p> : null}

            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-violet-300/20 bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-3 font-semibold text-white transition-all duration-200 hover:scale-[1.02] hover:brightness-110 hover:shadow-[0_14px_34px_rgba(139,92,246,0.38)]"
            >
              <LogIn className="h-4 w-4" />
              Sign in as admin
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-slate-300">
            Need admin access?{" "}
            <Link href="/admin-signup" className="font-medium text-violet-300 hover:text-violet-200">
              Register admin
            </Link>
          </p>
          </section>
        </div>
      </div>
    </main>
  )
}
