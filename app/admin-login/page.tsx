"use client"

import { useState } from "react"
import type { FormEvent } from "react"
import { useRouter } from "next/navigation"
import { ShieldCheck, LogIn } from "lucide-react"
import AuthShell, { authFieldLabelClass, authInputClass } from "@/components/auth/auth-shell"
import { createClient } from "@/lib/supabase/client"
import { ROLE_HOME, GENERIC_AUTH_ERROR } from "@/lib/auth/roles"

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")

    if (!email || !password) {
      setError("Please enter admin email and password.")
      return
    }

    setIsSubmitting(true)
    const supabase = createClient()

    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError || !data.user) {
      setError(GENERIC_AUTH_ERROR)
      setIsSubmitting(false)
      return
    }

    // Admin door — admins are provisioned by hand and never self-serve, so the
    // role check here is the same generic gate as every other door.
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, status")
      .eq("id", data.user.id)
      .single()

    if (profile?.role !== "admin" || profile?.status === "blocked") {
      await supabase.auth.signOut()
      setError(GENERIC_AUTH_ERROR)
      setIsSubmitting(false)
      return
    }

    router.replace(ROLE_HOME.admin)
  }

  return (
    <AuthShell
      icon={ShieldCheck}
      title="Admin login"
      subtitle="Secure sign-in for platform administration."
      backHref="/"
      backLabel="Back to home"
      footerText="Administrator access only."
      footerLinkHref="/"
      footerLinkLabel="Return home"
      error={error}
      onSubmit={handleSubmit}
      submitLabel={isSubmitting ? "Signing in…" : "Sign in as admin"}
      submitIcon={LogIn}
      isSubmitting={isSubmitting}
    >
      <div>
        <label htmlFor="email" className={authFieldLabelClass}>
          Admin email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={authInputClass}
          placeholder="admin@trustvox.com"
          disabled={isSubmitting}
        />
      </div>
      <div>
        <label htmlFor="password" className={authFieldLabelClass}>
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={authInputClass}
          placeholder="Enter password"
          disabled={isSubmitting}
        />
      </div>
    </AuthShell>
  )
}
