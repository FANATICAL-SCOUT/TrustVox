"use client"

import { useState } from "react"
import type { FormEvent } from "react"
import { useRouter } from "next/navigation"
import { LogIn, UserRound } from "lucide-react"
import AuthShell, { authFieldLabelClass, authInputClass } from "@/components/auth/auth-shell"
import PasswordField from "@/components/auth/password-field"
import { createClient } from "@/lib/supabase/client"
import { ROLE_HOME, GENERIC_AUTH_ERROR } from "@/lib/auth/roles"
import {
  checkLockout,
  recordFailedLogin,
  clearLoginAttempts,
  lockoutMessage,
} from "@/lib/auth/login-guard-client"

/**
 * Single login door for User and Client. No role picker — the account's role
 * comes from `profiles.role` after auth, and that decides where to land.
 * Admin keeps its own separate, unadvertised door (/admin-login).
 */
export default function LoginPage() {
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

    // Brute-force guard: refuse before even trying if this email is locked out.
    const gate = await checkLockout(email)
    if (gate.locked) {
      setError(lockoutMessage(gate.minutesLeft))
      setIsSubmitting(false)
      return
    }

    const supabase = createClient()

    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError || !data.user) {
      const after = await recordFailedLogin(email)
      setError(after.locked ? lockoutMessage(after.minutesLeft) : GENERIC_AUTH_ERROR)
      setIsSubmitting(false)
      return
    }

    // Resolve the real role from profiles — never trust client-held state.
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, status")
      .eq("id", data.user.id)
      .single()

    // Admin doesn't self-serve through this door.
    if (!profile || profile.role === "admin" || profile.status === "blocked") {
      await supabase.auth.signOut()
      const after = await recordFailedLogin(email)
      setError(after.locked ? lockoutMessage(after.minutesLeft) : GENERIC_AUTH_ERROR)
      setIsSubmitting(false)
      return
    }

    await clearLoginAttempts(email)
    router.replace(ROLE_HOME[profile.role])
  }

  return (
    <AuthShell
      icon={UserRound}
      title="Sign in"
      subtitle="Sign in to continue to your dashboard."
      backHref="/"
      backLabel="Back to home"
      footerText="New here?"
      footerLinkHref="/signup"
      footerLinkLabel="Create an account"
      error={error}
      onSubmit={handleSubmit}
      submitLabel={isSubmitting ? "Signing in…" : "Sign in"}
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
          autoComplete="email"
        />
      </div>
      <PasswordField
        id="password"
        label="Password"
        value={password}
        onChange={setPassword}
        placeholder="Enter password"
        disabled={isSubmitting}
        autoComplete="current-password"
      />
    </AuthShell>
  )
}
