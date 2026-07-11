"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Building2,
  Mail,
  LogOut,
  Save,
  Lock,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"

type ProfileFields = {
  contactName: string
  companyName: string
  email: string
}

const EMPTY_PROFILE: ProfileFields = {
  contactName: "",
  companyName: "",
  email: "",
}

const cardCls = "rounded-xl border border-white/[0.07] bg-white/[0.02] p-5"

export default function ClientProfilePage() {
  const router = useRouter()
  const [loaded, setLoaded] = useState(false)
  const [profile, setProfile] = useState<ProfileFields>(EMPTY_PROFILE)
  const [draft, setDraft] = useState<ProfileFields>(EMPTY_PROFILE)
  const [saving, setSaving] = useState(false)
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null)

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

      const loadedProfile: ProfileFields = {
        contactName: data?.contact_name || "",
        companyName: data?.company_name || "",
        email: data?.email || user.email || "",
      }
      setProfile(loadedProfile)
      setDraft(loadedProfile)
      setLoaded(true)
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

  const dirty =
    loaded && (draft.contactName !== profile.contactName || draft.companyName !== profile.companyName)

  const canSave = dirty && draft.contactName.trim().length > 0 && !saving

  const onChange = (field: keyof ProfileFields, value: string) => {
    setDraft((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    setBanner(null)
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
        contact_name: draft.contactName.trim(),
        company_name: draft.companyName.trim(),
      })
      .eq("id", user.id)

    setSaving(false)
    if (error) {
      setBanner({ type: "error", text: "Could not save changes. Please try again." })
      return
    }

    setProfile(draft)
    setBanner({ type: "success", text: "Profile updated successfully." })
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
  }

  return (
    <div className={`mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 ${dirty ? "pb-28" : ""}`}>
      <button
        onClick={() => router.back()}
        className="mb-4 inline-flex items-center gap-2 text-sm text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {/* Header */}
      <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <span className="grid h-11 w-11 flex-none place-items-center rounded-xl border border-gold/20 bg-gold/[0.08] text-gold">
            <Building2 className="h-5 w-5" />
          </span>
          <div>
            <h1 className="font-display text-3xl font-extrabold tracking-[-0.03em] text-ink">Client profile</h1>
            <p className="mt-1 text-ink-muted">Manage your account and company details</p>
          </div>
        </div>
      </div>

      {/* Save result banner */}
      {banner ? (
        <div
          role="status"
          className={`mb-6 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${
            banner.type === "success"
              ? "border-mint/25 bg-mint/10 text-mint"
              : "border-destructive/30 bg-destructive/10 text-destructive"
          }`}
        >
          {banner.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 flex-none" />
          ) : (
            <AlertCircle className="h-4 w-4 flex-none" />
          )}
          {banner.text}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: identity card */}
        <div className={`${cardCls} h-fit lg:col-span-1`}>
          <div className="text-center">
            <div className="mx-auto mb-4 grid h-24 w-24 place-items-center rounded-full bg-gradient-to-br from-[#f2c877] to-gold-deep text-3xl font-bold text-[#241a06]">
              {initials || "C"}
            </div>
            <h2 className="font-display text-xl font-bold text-ink">{loaded ? draft.contactName || "—" : "…"}</h2>
            <p className="mt-0.5 text-sm text-ink-muted">{loaded ? draft.companyName || "Client" : "…"}</p>
          </div>

          <div className="my-5 h-px bg-white/[0.07]" />

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-ink-dim">
              <Mail className="h-4 w-4 flex-none text-gold" /> <span className="truncate">{profile.email || "—"}</span>
            </div>
          </div>

          <div className="my-5 h-px bg-white/[0.07]" />

          <button
            onClick={handleLogout}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-rose-400/30 bg-rose-500/[0.06] px-4 py-2 text-sm font-medium text-rose-300 transition-all hover:bg-rose-500/10"
          >
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>

        {/* Right: edit fields */}
        <div className="space-y-6 lg:col-span-2">
          <div className={cardCls}>
            <h3 className="font-display text-lg font-bold text-ink">Edit profile</h3>
            <p className="mt-0.5 text-sm text-ink-muted">Update your contact name and company name.</p>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="profile-contact-name" className="text-sm font-medium text-ink-dim">
                  Client name
                </Label>
                <Input
                  id="profile-contact-name"
                  value={draft.contactName}
                  onChange={(e) => onChange("contactName", e.target.value)}
                  maxLength={120}
                  className="mt-1 border-white/[0.07] bg-white/[0.02] text-ink"
                />
              </div>
              <div>
                <Label htmlFor="profile-company-name" className="text-sm font-medium text-ink-dim">
                  Company name
                </Label>
                <Input
                  id="profile-company-name"
                  value={draft.companyName}
                  onChange={(e) => onChange("companyName", e.target.value)}
                  maxLength={120}
                  className="mt-1 border-white/[0.07] bg-white/[0.02] text-ink"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-ink-dim">Email</Label>
                <div className="mt-1 flex items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-2 text-sm font-medium text-ink-dim">
                  <Lock className="h-3.5 w-3.5 flex-none text-ink-muted" />
                  <span className="truncate">{profile.email || "—"}</span>
                </div>
                <p className="mt-1.5 text-xs text-ink-muted">Email is permanent and can&apos;t be changed.</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-ink-dim">Role</Label>
                <div className="mt-1 flex items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-2 text-sm font-medium text-ink-dim">
                  Client
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Save bar — appears only when there are unsaved changes (matches the user profile pattern). */}
      {dirty ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-4 sm:pb-6">
          <div className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl border border-white/[0.1] bg-surface-raised/95 px-4 py-3 shadow-2xl backdrop-blur-xl">
            <span className="flex min-w-0 flex-1 items-center gap-2 text-sm">
              {draft.contactName.trim().length === 0 ? (
                <>
                  <AlertCircle className="h-4 w-4 flex-none text-destructive" />
                  <span className="truncate text-destructive">Client name can&apos;t be empty</span>
                </>
              ) : (
                <>
                  <span className="h-2 w-2 flex-none rounded-full bg-gold" />
                  <span className="truncate text-ink-dim">You have unsaved changes</span>
                </>
              )}
            </span>
            <Button
              onClick={handleSave}
              disabled={!canSave}
              className="flex-none bg-gradient-to-b from-[#f2c877] to-gold-deep font-semibold text-[#241a06] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save className="mr-1.5 h-4 w-4" />
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
