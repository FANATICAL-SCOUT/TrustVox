"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import type { FormEvent } from "react"
import { Building2, UserPlus, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import BrandLogo from "@/components/brand-logo"
import { upsertApprovedCompanyFromRegistration, upsertManagedUserFromRegistration } from "@/lib/approved-company-store"

export default function ClientSignupPage() {
  const router = useRouter()
  const [companyName, setCompanyName] = useState("")
  const [contactName, setContactName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")

    if (!companyName || !contactName || !email || !password) {
      setError("Please fill all required fields.")
      return
    }

    const client = {
      companyName,
      contactName,
      contactEmail: email,
      role: "client",
      createdAt: new Date().toISOString(),
    }

    localStorage.setItem("currentClient", JSON.stringify(client))
    upsertManagedUserFromRegistration({
      name: contactName,
      email,
      role: "Client",
    })
    upsertApprovedCompanyFromRegistration({
      companyName,
      category: "Service",
    })
    router.push("/client/dashboard")
  }

  return (
    <main className="relative min-h-screen bg-[#050716] text-white">
      {/* Background gradients */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-12 top-16 h-72 w-72 rounded-full bg-indigo-500/15 blur-3xl" />
        <div className="absolute bottom-12 right-10 h-72 w-72 rounded-full bg-violet-500/15 blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative border-b border-white/10 bg-white/[0.02] backdrop-blur-sm">
        <div className="flex h-16 w-full items-center px-4 sm:px-6 lg:px-8">
          <Link href="/" className="inline-flex items-center">
            <BrandLogo width={138} height={40} className="h-10 w-auto" />
          </Link>
        </div>
      </header>

      {/* Main content */}
      <div className="relative flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-10 sm:px-6">
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
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl border border-violet-300/25 bg-violet-500/10">
              <Building2 className="h-5 w-5 text-violet-300" />
            </div>
            <h1 className="text-3xl font-semibold text-white">Client Register</h1>
            <p className="mt-2 text-slate-300">Create your company workspace in seconds.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="company" className="mb-2 block text-sm text-slate-300">
                Company name
              </label>
              <input
                id="company"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-slate-100 outline-none transition focus:border-violet-300/40"
                placeholder="TrustVox Labs"
              />
            </div>
            <div>
              <label htmlFor="contact" className="mb-2 block text-sm text-slate-300">
                Contact name
              </label>
              <input
                id="contact"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-slate-100 outline-none transition focus:border-violet-300/40"
                placeholder="John Doe"
              />
            </div>
            <div>
              <label htmlFor="email" className="mb-2 block text-sm text-slate-300">
                Business email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-slate-100 outline-none transition focus:border-violet-300/40"
                placeholder="name@company.com"
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
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-slate-100 outline-none transition focus:border-violet-300/40"
                placeholder="Create password"
              />
            </div>

            {error ? <p className="text-sm text-rose-300">{error}</p> : null}

            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-violet-300/20 bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-3 font-semibold text-white transition hover:brightness-110"
            >
              <UserPlus className="h-4 w-4" />
              Register company
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-slate-300">
            Already registered?{" "}
            <Link href="/client-login" className="font-medium text-violet-300 hover:text-violet-200">
              Client login
            </Link>
          </p>
          </section>
        </div>
      </div>
    </main>
  )
}
