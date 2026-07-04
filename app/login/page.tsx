"use client"

import { useState } from "react"
import type { FormEvent } from "react"
import { useRouter } from "next/navigation"
import { UserRound, LogIn } from "lucide-react"
import AuthShell, { authFieldLabelClass, authInputClass } from "@/components/auth/auth-shell"
import { createClient } from "@/lib/supabase/client"
import { ROLE_HOME, GENERIC_AUTH_ERROR } from "@/lib/auth/roles"

export default function UserLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")

    if (!email || !password) {
      setError("Please enter both email and password.")
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

    // This door is for users only — verify the real role, don't trust the email.
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, status")
      .eq("id", data.user.id)
      .single()

    if (profile?.role !== "user" || profile?.status === "blocked") {
      await supabase.auth.signOut()
      setError(GENERIC_AUTH_ERROR)
      setIsSubmitting(false)
      return
    }

    router.replace(ROLE_HOME.user)
  }

  return (
    <AuthShell
      icon={UserRound}
      title="User login"
      subtitle="Sign in and continue to your user dashboard."
      backHref="/"
      backLabel="Back to home"
      footerText="New here?"
      footerLinkHref="/signup"
      footerLinkLabel="Create user account"
      error={error}
      onSubmit={handleSubmit}
      submitLabel={isSubmitting ? "Signing in…" : "Sign in as user"}
      submitIcon={LogIn}
      isSubmitting={isSubmitting}
    >
      <div>
        <label htmlFor="email" className={authFieldLabelClass}>
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={authInputClass}
          placeholder="you@example.com"
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
