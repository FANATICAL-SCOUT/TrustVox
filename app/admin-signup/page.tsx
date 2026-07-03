"use client"

import { useState } from "react"
import type { FormEvent } from "react"
import { useRouter } from "next/navigation"
import { ShieldCheck, UserPlus } from "lucide-react"
import AuthShell, { authFieldLabelClass, authInputClass } from "@/components/auth/auth-shell"

export default function AdminSignupPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [inviteCode, setInviteCode] = useState("")
  const [error, setError] = useState("")

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")

    if (!name || !email || !password || !confirmPassword || !inviteCode) {
      setError("Please fill all required fields including invite code.")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    localStorage.setItem(
      "currentAdmin",
      JSON.stringify({
        name,
        email,
        inviteCode,
        role: "admin",
      }),
    )
    router.push("/admin")
  }

  return (
    <AuthShell
      icon={ShieldCheck}
      title="Admin register"
      subtitle="Set up admin access for moderation and governance."
      backHref="/signin"
      backLabel="Back to role selection"
      footerText="Already have access?"
      footerLinkHref="/admin-login"
      footerLinkLabel="Admin login"
      error={error}
      onSubmit={handleSubmit}
      submitLabel="Register admin"
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
          placeholder="Admin Name"
        />
      </div>
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
          placeholder="Create password"
        />
      </div>
      <div>
        <label htmlFor="confirm" className={authFieldLabelClass}>
          Confirm password
        </label>
        <input
          id="confirm"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className={authInputClass}
          placeholder="Confirm password"
        />
      </div>
      <div>
        <label htmlFor="invite" className={authFieldLabelClass}>
          Invite code
        </label>
        <input
          id="invite"
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value)}
          className={authInputClass}
          placeholder="Required"
        />
      </div>
    </AuthShell>
  )
}
