"use client"

import { useEffect, useMemo, useState } from "react"
import { Camera, Save, UserCircle2 } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const DEFAULT_PROFILE = {
  contactName: "Client User",
  companyName: "Trustvox Client",
  contactEmail: "client@trustvox.com",
  role: "Client",
  avatarUrl: "",
}

export default function ClientProfilePage() {
  const [profile, setProfile] = useState(DEFAULT_PROFILE)
  const [draft, setDraft] = useState(DEFAULT_PROFILE)
  const [editing, setEditing] = useState(false)
  const [savedMessage, setSavedMessage] = useState("")

  useEffect(() => {
    if (typeof window === "undefined") return
    const raw = localStorage.getItem("currentClient")
    if (!raw) return

    try {
      const parsed = JSON.parse(raw)
      const merged = {
        contactName: parsed.contactName || parsed.name || DEFAULT_PROFILE.contactName,
        companyName: parsed.companyName || DEFAULT_PROFILE.companyName,
        contactEmail: parsed.contactEmail || parsed.email || DEFAULT_PROFILE.contactEmail,
        role: parsed.role || "Client",
        avatarUrl: parsed.avatarUrl || "",
      }
      setProfile(merged)
      setDraft(merged)
    } catch {
      setProfile(DEFAULT_PROFILE)
      setDraft(DEFAULT_PROFILE)
    }
  }, [])

  const initials = useMemo(() => {
    const source = draft.contactName || draft.companyName || "C"
    return source
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("")
  }, [draft.companyName, draft.contactName])

  const onChange = (field, value) => {
    setDraft((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = () => {
    const nextProfile = {
      ...draft,
      role: "Client",
    }

    setProfile(nextProfile)
    setDraft(nextProfile)
    setEditing(false)

    if (typeof window !== "undefined") {
      const existingRaw = localStorage.getItem("currentClient")
      const existing = existingRaw ? JSON.parse(existingRaw) : {}
      localStorage.setItem(
        "currentClient",
        JSON.stringify({
          ...existing,
          contactName: nextProfile.contactName,
          companyName: nextProfile.companyName,
          contactEmail: nextProfile.contactEmail,
          email: nextProfile.contactEmail,
          role: "Client",
          avatarUrl: nextProfile.avatarUrl || "",
        }),
      )
    }

    setSavedMessage("Profile updated successfully.")
    window.setTimeout(() => setSavedMessage(""), 2500)
  }

  const handleCancel = () => {
    setDraft(profile)
    setEditing(false)
  }

  const inputClass =
    "w-full rounded-lg border border-white/15 bg-white/[0.03] px-3 py-2 text-sm text-ink outline-none transition focus:border-gold/40 focus:ring-2 focus:ring-gold/20 disabled:text-ink-muted disabled:opacity-70"

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-6">
          <h1 className="font-display text-2xl font-bold text-ink">Client Profile</h1>
          <p className="mt-1 text-sm text-ink-dim">Manage your account and company details.</p>

          <div className="mt-6 space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 border border-white/10">
                {draft.avatarUrl ? <AvatarImage src={draft.avatarUrl} alt={draft.contactName} /> : null}
                <AvatarFallback className="bg-surface-raised text-ink">{initials || "C"}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-ink">{draft.contactName || "Client User"}</p>
                <p className="text-sm text-ink-dim">{draft.companyName}</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-medium text-ink-muted">Client Name</label>
                <input
                  value={draft.contactName}
                  onChange={(e) => onChange("contactName", e.target.value)}
                  disabled={!editing}
                  className={inputClass}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-ink-muted">Company Name</label>
                <input
                  value={draft.companyName}
                  onChange={(e) => onChange("companyName", e.target.value)}
                  disabled={!editing}
                  className={inputClass}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-ink-muted">Email ID</label>
                <input
                  type="email"
                  value={draft.contactEmail}
                  onChange={(e) => onChange("contactEmail", e.target.value)}
                  disabled={!editing}
                  className={inputClass}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-ink-muted">Role</label>
                <input value="Client" disabled className={inputClass} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className="flex items-center gap-2 text-xs font-medium text-ink-muted">
                  <Camera size={14} /> Profile Picture URL
                </label>
                <input
                  value={draft.avatarUrl || ""}
                  onChange={(e) => onChange("avatarUrl", e.target.value)}
                  disabled={!editing}
                  placeholder="https://..."
                  className={inputClass}
                />
              </div>
            </div>

            {savedMessage ? <p className="text-sm text-mint">{savedMessage}</p> : null}

            <div className="flex items-center gap-2">
              {!editing ? (
                <button
                  onClick={() => setEditing(true)}
                  className="inline-flex items-center rounded-lg bg-gradient-to-b from-[#f2c877] to-gold-deep px-4 py-2 text-sm font-semibold text-[#241a06] transition hover:brightness-105"
                >
                  <UserCircle2 className="w-4 h-4 mr-2" /> Edit Profile
                </button>
              ) : (
                <>
                  <button
                    onClick={handleSave}
                    className="inline-flex items-center rounded-lg bg-gradient-to-b from-[#f2c877] to-gold-deep px-4 py-2 text-sm font-semibold text-[#241a06] transition hover:brightness-105"
                  >
                    <Save className="w-4 h-4 mr-2" /> Save/Update
                  </button>
                  <button
                    onClick={handleCancel}
                    className="inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium text-ink-dim transition hover:bg-white/[0.06] hover:text-ink"
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
