"use client"

import { useState } from "react"
import type { FormEvent } from "react"
import { useRouter } from "next/navigation"
import { UserRound, UserPlus } from "lucide-react"
import AuthShell, { authFieldLabelClass, authInputClass } from "@/components/auth/auth-shell"
import PasswordField from "@/components/auth/password-field"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { createClient } from "@/lib/supabase/client"
import { ROLE_HOME } from "@/lib/auth/roles"
import {
  isPasswordValid,
  isOldEnough,
  ageFromDob,
  PASSWORD_POLICY_MESSAGE,
  UNDERAGE_MESSAGE,
  INVALID_DOB_MESSAGE,
  GENDER_OPTIONS,
} from "@/lib/auth/validation"

// Latest date that still satisfies the 16+ gate — caps the native date picker.
const MAX_DOB = (() => {
  const d = new Date()
  d.setFullYear(d.getFullYear() - 16)
  return d.toISOString().slice(0, 10)
})()

export default function UserSignupPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [dob, setDob] = useState("")
  const [gender, setGender] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")

    if (!name || !email || !dob || !gender || !password || !confirmPassword) {
      setError("Please complete all fields.")
      return
    }

    if (ageFromDob(dob) === null) {
      setError(INVALID_DOB_MESSAGE)
      return
    }

    if (!isOldEnough(dob)) {
      setError(UNDERAGE_MESSAGE)
      return
    }

    if (!isPasswordValid(password)) {
      setError(PASSWORD_POLICY_MESSAGE)
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
      body: JSON.stringify({ name, email, password, dob, gender }),
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
          autoComplete="name"
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
          autoComplete="email"
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="dob" className={authFieldLabelClass}>
            Date of birth
          </label>
          <input
            id="dob"
            type="date"
            value={dob}
            max={MAX_DOB}
            onChange={(e) => setDob(e.target.value)}
            className={`${authInputClass} [color-scheme:dark]`}
            disabled={isSubmitting}
            autoComplete="bday"
          />
          <p className="mt-1.5 text-xs text-ink-muted">You must be 16 or older.</p>
        </div>
        <div>
          <label htmlFor="gender" className={authFieldLabelClass}>
            Gender
          </label>
          <SearchableSelect
            id="gender"
            aria-label="Gender"
            options={GENDER_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label }))}
            value={gender}
            onChange={setGender}
            placeholder="Select…"
            searchPlaceholder="Type to search…"
            disabled={isSubmitting}
          />
        </div>
      </div>
      <PasswordField
        id="password"
        label="Password"
        value={password}
        onChange={setPassword}
        placeholder="Create a password"
        disabled={isSubmitting}
        autoComplete="new-password"
        showStrength
      />
      <PasswordField
        id="confirmPassword"
        label="Confirm password"
        value={confirmPassword}
        onChange={setConfirmPassword}
        placeholder="Confirm password"
        disabled={isSubmitting}
        autoComplete="new-password"
      />
    </AuthShell>
  )
}
