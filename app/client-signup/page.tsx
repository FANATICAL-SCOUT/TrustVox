"use client"

import { useState } from "react"
import type { FormEvent } from "react"
import { useRouter } from "next/navigation"
import { Building2, UserPlus } from "lucide-react"
import AuthShell, { authFieldLabelClass, authInputClass } from "@/components/auth/auth-shell"
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
      submitLabel="Register company"
      submitIcon={UserPlus}
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
          placeholder="Create password"
        />
      </div>
    </AuthShell>
  )
}
