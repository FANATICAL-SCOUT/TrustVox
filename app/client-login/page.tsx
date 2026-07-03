"use client"

import { useState } from "react"
import type { FormEvent } from "react"
import { useRouter } from "next/navigation"
import { Building2, LogIn } from "lucide-react"
import AuthShell, { authFieldLabelClass, authInputClass } from "@/components/auth/auth-shell"

export default function ClientLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")

    if (!email || !password) {
      setError("Please enter both business email and password.")
      return
    }

    const storedClient = localStorage.getItem("currentClient")
    if (storedClient) {
      try {
        const parsed = JSON.parse(storedClient)
        if (parsed.contactEmail && parsed.contactEmail !== email) {
          setError("This email does not match the registered client account.")
          return
        }
      } catch {
        localStorage.removeItem("currentClient")
      }
    }

    const companyName = email.split("@")[1]?.split(".")[0] ?? "company"
    const currentClient = {
      contactName: "Client Owner",
      companyName: companyName.charAt(0).toUpperCase() + companyName.slice(1),
      contactEmail: email,
      role: "client",
    }
    localStorage.setItem("currentClient", JSON.stringify(currentClient))
    router.push("/client/dashboard")
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
      submitLabel="Sign in as client"
      submitIcon={LogIn}
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
        />
      </div>
    </AuthShell>
  )
}
