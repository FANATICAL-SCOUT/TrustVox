"use client"

import { useState } from "react"
import type { FormEvent } from "react"
import { useRouter } from "next/navigation"
import { ShieldCheck, LogIn } from "lucide-react"
import AuthShell, { authFieldLabelClass, authInputClass } from "@/components/auth/auth-shell"

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")

    if (!email || !password) {
      setError("Please enter admin email and password.")
      return
    }

    localStorage.setItem("currentAdmin", JSON.stringify({ email, role: "admin" }))
    router.push("/admin")
  }

  return (
    <AuthShell
      icon={ShieldCheck}
      title="Admin login"
      subtitle="Secure sign-in for platform administration."
      backHref="/"
      backLabel="Back to home"
      footerText="Need admin access?"
      footerLinkHref="/admin-signup"
      footerLinkLabel="Register admin"
      error={error}
      onSubmit={handleSubmit}
      submitLabel="Sign in as admin"
      submitIcon={LogIn}
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
