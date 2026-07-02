"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import type { FormEvent } from "react"
import { ShieldCheck, UserPlus } from "lucide-react"

export default function AdminSignupPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [inviteCode, setInviteCode] = useState("")
  const [error, setError] = useState("")

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")

    if (!name || !email || !password || !confirmPassword || !inviteCode) {
      setError("Please fill all required fields including invite code.")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    localStorage.setItem(
      "currentAdmin",
      JSON.stringify({
        name,
        email,
        inviteCode,
        role: "admin",
      }),
    )
    router.push("/admin")
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050716] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-12 top-16 h-72 w-72 rounded-full bg-rose-500/10 blur-3xl" />
        <div className="absolute bottom-12 right-10 h-72 w-72 rounded-full bg-orange-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-10 sm:px-6">
        <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.03] p-7 sm:p-8">
          <Link href="/signin" className="text-sm text-slate-300 hover:text-white">
            &larr; Back to role selection
          </Link>
          <div className="mt-5 mb-8 text-center">
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl border border-rose-300/25 bg-rose-500/10">
              <ShieldCheck className="h-5 w-5 text-rose-300" />
            </div>
            <h1 className="text-3xl font-semibold text-white">Admin Register</h1>
            <p className="mt-2 text-slate-300">Set up admin access for moderation and governance.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="mb-2 block text-sm text-slate-300">
                Full name
              </label>
              <input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-slate-100 outline-none transition focus:border-rose-300/40"
                placeholder="Admin Name"
              />
            </div>
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
                placeholder="Create password"
              />
            </div>
            <div>
              <label htmlFor="confirm" className="mb-2 block text-sm text-slate-300">
                Confirm password
              </label>
              <input
                id="confirm"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-slate-100 outline-none transition focus:border-rose-300/40"
                placeholder="Confirm password"
              />
            </div>
            <div>
              <label htmlFor="invite" className="mb-2 block text-sm text-slate-300">
                Invite code
              </label>
              <input
                id="invite"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-slate-100 outline-none transition focus:border-rose-300/40"
                placeholder="Required"
              />
            </div>

            {error ? <p className="text-sm text-rose-300">{error}</p> : null}

            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-rose-300/20 bg-gradient-to-r from-rose-500 to-orange-500 px-4 py-3 font-semibold text-white transition hover:brightness-110"
            >
              <UserPlus className="h-4 w-4" />
              Register admin
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-slate-300">
            Already have access?{" "}
            <Link href="/admin-login" className="font-medium text-rose-300 hover:text-rose-200">
              Admin login
            </Link>
          </p>
        </section>
      </div>
    </main>
  )
}
