"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import type { FormEvent } from "react"
import { UserRound, UserPlus } from "lucide-react"
import { upsertManagedUserFromRegistration } from "@/lib/approved-company-store"

export default function UserSignupPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")

    if (!name || !email || !password || !confirmPassword) {
      setError("Please complete all fields.")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    const user = {
      name,
      email,
      joinDate: new Date().toISOString().split("T")[0],
      role: "user",
    }

    localStorage.setItem("currentUser", JSON.stringify(user))
    upsertManagedUserFromRegistration({ name, email, role: "User" })
    router.push("/dashboard")
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050716] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-12 top-24 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute bottom-10 right-12 h-72 w-72 rounded-full bg-blue-500/15 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-10 sm:px-6">
        <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.03] p-7 sm:p-8">
          <Link href="/signin" className="text-sm text-slate-300 hover:text-white">
            &larr; Back to role selection
          </Link>
          <div className="mt-5 mb-8 text-center">
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl border border-cyan-300/25 bg-cyan-500/10">
              <UserRound className="h-5 w-5 text-cyan-300" />
            </div>
            <h1 className="text-3xl font-semibold text-white">User Register</h1>
            <p className="mt-2 text-slate-300">Create your contributor account and start earning rewards.</p>
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
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-300/40"
                placeholder="Jane Doe"
              />
            </div>
            <div>
              <label htmlFor="email" className="mb-2 block text-sm text-slate-300">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-300/40"
                placeholder="you@example.com"
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
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-300/40"
                placeholder="Create password"
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="mb-2 block text-sm text-slate-300">
                Confirm password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-300/40"
                placeholder="Confirm password"
              />
            </div>

            {error ? <p className="text-sm text-rose-300">{error}</p> : null}

            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-300/20 bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-3 font-semibold text-white transition hover:brightness-110"
            >
              <UserPlus className="h-4 w-4" />
              Register user
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-slate-300">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-cyan-300 hover:text-cyan-200">
              User login
            </Link>
          </p>
        </section>
      </div>
    </main>
  )
}
