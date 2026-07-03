"use client"

import { useState } from "react"
import type { FormEvent } from "react"
import { useRouter } from "next/navigation"
import { UserRound, UserPlus } from "lucide-react"
import AuthShell, { authFieldLabelClass, authInputClass } from "@/components/auth/auth-shell"
import { upsertManagedUserFromRegistration } from "@/lib/approved-company-store"

export default function UserSignupPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")

    if (!name || !email || !password || !confirmPassword) {
      setError("Please complete all fields.")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    const user = {
      name,
      email,
      joinDate: new Date().toISOString().split("T")[0],
      role: "user",
    }

    localStorage.setItem("currentUser", JSON.stringify(user))
    upsertManagedUserFromRegistration({ name, email, role: "User" })
    router.push("/dashboard")
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
      submitLabel="Register user"
      submitIcon={UserPlus}
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
        />
      </div>
    </AuthShell>
  )
}
