"use client"

import { useState } from "react"
import type { FormEvent } from "react"
import { useRouter } from "next/navigation"
import { UserRound, Building2, UserPlus } from "lucide-react"
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

type SignupRole = "user" | "client"

// Latest date that still satisfies the 16+ gate — caps the native date picker.
const MAX_DOB = (() => {
  const d = new Date()
  d.setFullYear(d.getFullYear() - 16)
  return d.toISOString().slice(0, 10)
})()

const roleToggleBase =
  "flex-1 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all"
const roleToggleActive = "border-gold/40 bg-gold/10 text-gold"
const roleToggleInactive = "border-white/10 bg-white/[0.03] text-ink-dim hover:border-white/20 hover:text-ink"

export default function SignupPage() {
  const router = useRouter()
  const [role, setRole] = useState<SignupRole>("user")

  // Shared fields
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  // User-only fields
  const [name, setName] = useState("")
  const [dob, setDob] = useState("")
  const [gender, setGender] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  // Client-only fields
  const [companyName, setCompanyName] = useState("")
  const [contactName, setContactName] = useState("")

  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleUserSubmit = async () => {
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

    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) {
      setError("Account created. Please sign in to continue.")
      setIsSubmitting(false)
      router.replace("/login")
      return
    }

    router.replace(ROLE_HOME.user)
  }

  const handleClientSubmit = async () => {
    if (!companyName || !contactName || !email || !password) {
      setError("Please fill all required fields.")
      return
    }
    if (!isPasswordValid(password)) {
      setError(PASSWORD_POLICY_MESSAGE)
      return
    }

    setIsSubmitting(true)

    const response = await fetch("/api/register-client", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyName, contactName, email, password }),
    })

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null
      setError(payload?.error ?? "Could not create your account. Please try again.")
      setIsSubmitting(false)
      return
    }

    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) {
      setError("Account created. Please sign in to continue.")
      setIsSubmitting(false)
      router.replace("/login")
      return
    }

    router.replace(ROLE_HOME.client)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    void (role === "user" ? handleUserSubmit() : handleClientSubmit())
  }

  return (
    <AuthShell
      icon={role === "user" ? UserRound : Building2}
      title="Create your account"
      subtitle="Choose your account type to get started."
      backHref="/"
      backLabel="Back to home"
      footerText="Already have an account?"
      footerLinkHref="/login"
      footerLinkLabel="Sign in"
      error={error}
      onSubmit={handleSubmit}
      submitLabel={isSubmitting ? "Creating account…" : "Create account"}
      submitIcon={UserPlus}
      isSubmitting={isSubmitting}
    >
      <div className="flex gap-2.5">
        <button
          type="button"
          onClick={() => setRole("user")}
          disabled={isSubmitting}
          className={`${roleToggleBase} ${role === "user" ? roleToggleActive : roleToggleInactive}`}
        >
          User
        </button>
        <button
          type="button"
          onClick={() => setRole("client")}
          disabled={isSubmitting}
          className={`${roleToggleBase} ${role === "client" ? roleToggleActive : roleToggleInactive}`}
        >
          Client
        </button>
      </div>

      {role === "user" ? (
        <>
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
        </>
      ) : (
        <>
          <div>
            <label htmlFor="company" className={authFieldLabelClass}>
              Company name
            </label>
            <input
              id="company"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className={authInputClass}
              placeholder="TrustVox Labs"
              disabled={isSubmitting}
            />
          </div>
          <div>
            <label htmlFor="contact" className={authFieldLabelClass}>
              Contact name
            </label>
            <input
              id="contact"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              className={authInputClass}
              placeholder="John Doe"
              disabled={isSubmitting}
            />
          </div>
          <div>
            <label htmlFor="clientEmail" className={authFieldLabelClass}>
              Business email
            </label>
            <input
              id="clientEmail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={authInputClass}
              placeholder="name@company.com"
              disabled={isSubmitting}
              autoComplete="email"
            />
          </div>
          <PasswordField
            id="clientPassword"
            label="Password"
            value={password}
            onChange={setPassword}
            placeholder="Create a password"
            disabled={isSubmitting}
            autoComplete="new-password"
            showStrength
          />
        </>
      )}
    </AuthShell>
  )
}
