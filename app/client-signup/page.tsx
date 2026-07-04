"use client"

import { useState } from "react"
import type { FormEvent } from "react"
import { useRouter } from "next/navigation"
import { Building2, UserPlus } from "lucide-react"
import AuthShell, { authFieldLabelClass, authInputClass } from "@/components/auth/auth-shell"
import { createClient } from "@/lib/supabase/client"
import { ROLE_HOME } from "@/lib/auth/roles"

export default function ClientSignupPage() {
  const router = useRouter()
  const [companyName, setCompanyName] = useState("")
  const [contactName, setContactName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")

    if (!companyName || !contactName || !email || !password) {
      setError("Please fill all required fields.")
      return
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }

    setIsSubmitting(true)

    // Account created + elevated to role='client' server-side (secret key).
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

    // Establish the session in the browser.
    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) {
      setError("Account created. Please sign in to continue.")
      setIsSubmitting(false)
      router.replace("/client-login")
      return
    }

    router.replace(ROLE_HOME.client)
  }

  return (
    <AuthShell
      icon={Building2}
      title="Client register"
      subtitle="Create your company workspace in seconds."
      backHref="/signin"
      backLabel="Back to role selection"
      footerText="Already registered?"
      footerLinkHref="/client-login"
      footerLinkLabel="Client login"
      error={error}
      onSubmit={handleSubmit}
      submitLabel={isSubmitting ? "Creating account…" : "Register company"}
      submitIcon={UserPlus}
      isSubmitting={isSubmitting}
    >
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
    </AuthShell>
  )
}
