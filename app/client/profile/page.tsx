"use client"

import { useEffect, useMemo, useState } from "react"
import { UserCircle2, Save } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { createClient } from "@/lib/supabase/client"

type ProfileFields = {
  contactName: string
  companyName: string
  email: string
}

const DEFAULT_PROFILE: ProfileFields = {
  contactName: "Client User",
  companyName: "Trustvox Client",
  email: "",
}

export default function ClientProfilePage() {
  const [profile, setProfile] = useState(DEFAULT_PROFILE)
  const [draft, setDraft] = useState(DEFAULT_PROFILE)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedMessage, setSavedMessage] = useState("")

  useEffect(() => {
    let active = true
    const supabase = createClient()

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user || !active) return
      const { data } = await supabase
        .from("profiles")
        .select("contact_name, company_name, email")
        .eq("id", user.id)
        .maybeSingle()
      if (!active) return

      const loaded: ProfileFields = {
        contactName: data?.contact_name || DEFAULT_PROFILE.contactName,
        companyName: data?.company_name || DEFAULT_PROFILE.companyName,
        email: data?.email || user.email || "",
      }
      setProfile(loaded)
      setDraft(loaded)
    })

    return () => {
      active = false
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

  const onChange = (field: keyof ProfileFields, value: string) => {
    setDraft((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    setSaving(true)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setSaving(false)
      return
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        contact_name: draft.contactName,
        company_name: draft.companyName,
      })
      .eq("id", user.id)

    setSaving(false)
    if (error) {
      setSavedMessage("Could not save changes. Please try again.")
      window.setTimeout(() => setSavedMessage(""), 2500)
      return
    }

    setProfile(draft)
    setEditing(false)
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
                <input type="email" value={draft.email} disabled className={inputClass} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-ink-muted">Role</label>
                <input value="Client" disabled className={inputClass} />
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
                    disabled={saving}
                    className="inline-flex items-center rounded-lg bg-gradient-to-b from-[#f2c877] to-gold-deep px-4 py-2 text-sm font-semibold text-[#241a06] transition hover:brightness-105 disabled:opacity-60"
                  >
                    <Save className="w-4 h-4 mr-2" /> {saving ? "Saving…" : "Save/Update"}
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={saving}
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
