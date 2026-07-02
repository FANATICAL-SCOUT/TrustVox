"use client"

import { useEffect, useMemo, useState } from "react"
import { Camera, Save, UserCircle2 } from "lucide-react"
import ClientNavbar from "@/components/client-navbar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
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

  return (
    <div className="min-h-screen app-page bg-[#090b14]">
      <ClientNavbar activeSection="profile" />

      <main className="max-w-3xl mx-auto px-4 py-8">
        <Card className="bg-[#121526] border-[#2b3150] text-[#f5f7ff]">
          <CardHeader>
            <CardTitle className="text-2xl">Client Profile</CardTitle>
            <p className="text-sm text-[#a5accb]">Manage your account and company details.</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 border border-[#2b3150]">
                {draft.avatarUrl ? <AvatarImage src={draft.avatarUrl} alt={draft.contactName} /> : null}
                <AvatarFallback className="bg-[#1a1f33] text-[#f5f7ff]">{initials || "C"}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-[#f5f7ff]">{draft.contactName || "Client User"}</p>
                <p className="text-sm text-[#a5accb]">{draft.companyName}</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-[#a5accb]">Client Name</Label>
                <Input
                  value={draft.contactName}
                  onChange={(e) => onChange("contactName", e.target.value)}
                  disabled={!editing}
                  className="bg-[#090b14] border-[#2b3150] text-[#f5f7ff]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#a5accb]">Company Name</Label>
                <Input
                  value={draft.companyName}
                  onChange={(e) => onChange("companyName", e.target.value)}
                  disabled={!editing}
                  className="bg-[#090b14] border-[#2b3150] text-[#f5f7ff]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#a5accb]">Email ID</Label>
                <Input
                  type="email"
                  value={draft.contactEmail}
                  onChange={(e) => onChange("contactEmail", e.target.value)}
                  disabled={!editing}
                  className="bg-[#090b14] border-[#2b3150] text-[#f5f7ff]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#a5accb]">Role</Label>
                <Input value="Client" disabled className="bg-[#090b14] border-[#2b3150] text-[#a5accb]" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label className="text-[#a5accb] flex items-center gap-2">
                  <Camera size={14} /> Profile Picture URL
                </Label>
                <Input
                  value={draft.avatarUrl || ""}
                  onChange={(e) => onChange("avatarUrl", e.target.value)}
                  disabled={!editing}
                  placeholder="https://..."
                  className="bg-[#090b14] border-[#2b3150] text-[#f5f7ff]"
                />
              </div>
            </div>

            {savedMessage ? <p className="text-sm text-[#a78bfa]">{savedMessage}</p> : null}

            <div className="flex items-center gap-2">
              {!editing ? (
                <Button onClick={() => setEditing(true)} className="bg-[#8b5cf6] hover:bg-[#7c3aed] text-[#090b14]">
                  <UserCircle2 className="w-4 h-4 mr-2" /> Edit Profile
                </Button>
              ) : (
                <>
                  <Button onClick={handleSave} className="bg-[#8b5cf6] hover:bg-[#7c3aed] text-[#090b14]">
                    <Save className="w-4 h-4 mr-2" /> Save/Update
                  </Button>
                  <Button variant="ghost" onClick={handleCancel} className="text-[#a5accb] hover:text-[#f5f7ff]">
                    Cancel
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

