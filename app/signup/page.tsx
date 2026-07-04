"use client"

import { useState } from "react"
import type { FormEvent } from "react"
import { useRouter } from "next/navigation"
import { UserRound, UserPlus } from "lucide-react"
import AuthShell, { authFieldLabelClass, authInputClass } from "@/components/auth/auth-shell"
import { createClient } from "@/lib/supabase/client"
import { ROLE_HOME } from "@/lib/auth/roles"

export default function UserSignupPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")

    if (!name || !email || !password || !confirmPassword) {
      setError("Please complete all fields.")
      return
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    setIsSubmitting(true)

    // Account is created server-side (secret key, pre-confirmed, role='user').
    const response = await fetch("/api/register-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    })

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null
      setError(payload?.error ?? "Could not create your account. Please try again.")
      setIsSubmitting(false)
      return
    }

    // Establish the session in the browser.
    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) {
      // Account exists but sign-in failed — send them to the login door.
      setError("Account created. Please sign in to continue.")
      setIsSubmitting(false)
      router.replace("/login")
      return
    }

    router.replace(ROLE_HOME.user)
  }

  return (
    <AuthShell
      icon={UserRound}
      title="User register"
      subtitle="Create your contributor account and start earning rewards."
      backHref="/signin"
      backLabel="Back to role selection"
      footerText="Already have an account?"
      footerLinkHref="/login"
      footerLinkLabel="User login"
      error={error}
      onSubmit={handleSubmit}
      submitLabel={isSubmitting ? "Creating account…" : "Register user"}
      submitIcon={UserPlus}
      isSubmitting={isSubmitting}
    >
      <div>
        <label htmlFor="name" className={authFieldLabelClass}>
          Full name
        </label>
        <input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={authInputClass}
          placeholder="Jane Doe"
          disabled={isSubmitting}
        />
      </div>
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
          placeholder="Create password (min 8 characters)"
          disabled={isSubmitting}
        />
      </div>
      <div>
        <label htmlFor="confirmPassword" className={authFieldLabelClass}>
          Confirm password
        </label>
        <input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className={authInputClass}
          placeholder="Confirm password"
          disabled={isSubmitting}
        />
      </div>
    </AuthShell>
  )
}
