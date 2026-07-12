"use client"

import { useState } from "react"
import type { FormEvent } from "react"
import { useRouter } from "next/navigation"
import { Building2, LogIn } from "lucide-react"
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

export default function ClientLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")

    if (!email || !password) {
      setError("Please enter both business email and password.")
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

    // Client door — enforce the real role before letting them in.
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, status")
      .eq("id", data.user.id)
      .single()

    if (profile?.role !== "client" || profile?.status === "blocked") {
      // Wrong door / blocked also counts as a failed attempt for this email.
      await supabase.auth.signOut()
      const after = await recordFailedLogin(email)
      setError(after.locked ? lockoutMessage(after.minutesLeft) : GENERIC_AUTH_ERROR)
      setIsSubmitting(false)
      return
    }

    // Clean login — clear the failed-attempt slate for this email.
    await clearLoginAttempts(email)
    router.replace(ROLE_HOME.client)
  }

  return (
    <AuthShell
      icon={Building2}
      title="Client login"
      subtitle="Sign in to your campaign workspace."
      backHref="/"
      backLabel="Back to home"
      footerText="Need an account?"
      footerLinkHref="/client-signup"
      footerLinkLabel="Register company"
      error={error}
      onSubmit={handleSubmit}
      submitLabel={isSubmitting ? "Signing in…" : "Sign in as client"}
      submitIcon={LogIn}
      isSubmitting={isSubmitting}
    >
      <div>
        <label htmlFor="email" className={authFieldLabelClass}>
          Business email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={authInputClass}
          placeholder="name@company.com"
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
