"use client"

import { useState } from "react"
import type { FormEvent } from "react"
import { useRouter } from "next/navigation"
import { ShieldCheck, LogIn } from "lucide-react"
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

    // Brute-force guard: the admin door is the highest-value target, so protect
    // it the same way as the user/client doors.
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

    // Admin door — admins are provisioned by hand and never self-serve, so the
    // role check here is the same generic gate as every other door.
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, status")
      .eq("id", data.user.id)
      .single()

    if (profile?.role !== "admin" || profile?.status === "blocked") {
      await supabase.auth.signOut()
      const after = await recordFailedLogin(email)
      setError(after.locked ? lockoutMessage(after.minutesLeft) : GENERIC_AUTH_ERROR)
      setIsSubmitting(false)
      return
    }

    // Clean login — clear the failed-attempt slate for this email.
    await clearLoginAttempts(email)
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
