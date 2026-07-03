"use client"

import { useState } from "react"
import type { FormEvent } from "react"
import { useRouter } from "next/navigation"
import { UserRound, LogIn } from "lucide-react"
import AuthShell, { authFieldLabelClass, authInputClass } from "@/components/auth/auth-shell"

export default function UserLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")

    if (!email || !password) {
      setError("Please enter both email and password.")
      return
    }

    const nameFromEmail = email.split("@")[0] || "User"
    const user = {
      name: nameFromEmail.charAt(0).toUpperCase() + nameFromEmail.slice(1),
      email,
      joinDate: new Date().toISOString().split("T")[0],
      role: "user",
    }

    localStorage.setItem("currentUser", JSON.stringify(user))
    router.push("/dashboard")
  }

  return (
    <AuthShell
      icon={UserRound}
      title="User login"
      subtitle="Sign in and continue to your user dashboard."
      backHref="/"
      backLabel="Back to home"
      footerText="New here?"
      footerLinkHref="/signup"
      footerLinkLabel="Create user account"
      error={error}
      onSubmit={handleSubmit}
      submitLabel="Sign in as user"
      submitIcon={LogIn}
    >
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
          placeholder="Enter password"
        />
      </div>
    </AuthShell>
  )
}
