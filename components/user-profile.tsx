"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { User, Mail, Calendar, LogOut, Edit, Save, X, Shield, Eye, Copy, Check, Flame, ArrowLeft } from "lucide-react"
import InterestSelector from "./interest-selector"
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime"
import { clearUserSession } from "@/lib/auth-utils"
import type { FeedbackHandoff } from "@/lib/feedback-store"

interface UserProfileProps {
  router: AppRouterInstance
  savedFeedbacks: FeedbackHandoff[]
  onContinueEditing: (feedbackData: FeedbackHandoff) => void
}

const cardCls = "rounded-xl border border-white/[0.07] bg-white/[0.02] p-5"
const displayBox = "mt-1 rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-2 text-sm font-medium text-ink"

export default function UserProfile({ router, savedFeedbacks, onContinueEditing }: UserProfileProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [identityIds, setIdentityIds] = useState({ walletId: "", userId: "" })
  const [copiedKey, setCopiedKey] = useState<"wallet" | "user" | null>(null)
  const [userInfo, setUserInfo] = useState({
    name: "John Doe",
    email: "john.doe@example.com",
    age: 28,
    address: "123 Main Street, New York, NY 10001",
    joinDate: "2023-06-15",
    bio: "Tech enthusiast and product reviewer. Love trying new apps and services.",
    interests: ["Technology", "Gaming", "Food & Beverage", "Travel"],
  })

  const toHex16 = (value: bigint) => value.toString(16).toUpperCase().padStart(16, "0").slice(-16)

  const hashToHex16 = (seed: string) => {
    let hash = 0xcbf29ce484222325n
    const prime = 0x100000001b3n
    const mask = 0xffffffffffffffffn
    for (const character of seed) {
      hash ^= BigInt(character.charCodeAt(0))
      hash = (hash * prime) & mask
    }
    return toHex16(hash)
  }

  const buildUserId = (seed: string) => `0x${hashToHex16(seed)}`

  const buildWalletId = (joinDate: string, userId: string) => {
    const parsed = new Date(joinDate)
    const year = Number.isNaN(parsed.getTime()) ? new Date().getFullYear() : parsed.getFullYear()
    const month = Number.isNaN(parsed.getTime()) ? new Date().getMonth() + 1 : parsed.getMonth() + 1
    const userPrefix = userId.replace(/^0x/i, "").toUpperCase().slice(0, 8).padEnd(8, "0")
    return `TVX-${year}-${String(month).padStart(2, "0")}-${userPrefix}`
  }

  useEffect(() => {
    const storedUserData = localStorage.getItem("currentUser")
    if (storedUserData) {
      let userData: Partial<typeof userInfo> = {}
      try {
        userData = JSON.parse(storedUserData)
      } catch {
        localStorage.removeItem("currentUser")
      }
      const resolvedJoinDate = userData.joinDate || "2023-06-15"
      const resolvedName = userData.name || "John Doe"
      const resolvedEmail = userData.email || "john.doe@example.com"
      const identitySeed = `${resolvedEmail.toLowerCase()}|${resolvedJoinDate}`
      const userId = buildUserId(identitySeed)
      const walletId = buildWalletId(resolvedJoinDate, userId)

      setUserInfo({
        name: resolvedName,
        email: resolvedEmail,
        age: userData.age || 28,
        address: userData.address || "123 Main Street, New York, NY 10001",
        joinDate: resolvedJoinDate,
        bio: userData.bio || "Tech enthusiast and product reviewer. Love trying new apps and services.",
        interests: userData.interests || ["Technology", "Gaming", "Food & Beverage", "Travel"],
      })
      setIdentityIds({ walletId, userId })

      localStorage.setItem("currentUser", JSON.stringify({ ...userData, joinDate: resolvedJoinDate, walletId, userId }))
      return
    }

    const fallbackJoinDate = "2023-06-15"
    const fallbackEmail = "john.doe@example.com"
    const fallbackSeed = `${fallbackEmail.toLowerCase()}|${fallbackJoinDate}`
    const fallbackUserId = buildUserId(fallbackSeed)

    setIdentityIds({ walletId: buildWalletId(fallbackJoinDate, fallbackUserId), userId: fallbackUserId })
    localStorage.setItem(
      "currentUser",
      JSON.stringify({
        name: "John Doe",
        email: fallbackEmail,
        age: 28,
        address: "123 Main Street, New York, NY 10001",
        joinDate: fallbackJoinDate,
        bio: "Tech enthusiast and product reviewer. Love trying new apps and services.",
        interests: ["Technology", "Gaming", "Food & Beverage", "Travel"],
        walletId: buildWalletId(fallbackJoinDate, fallbackUserId),
        userId: fallbackUserId,
      }),
    )
    // Intentionally run once on mount to seed identity IDs from localStorage;
    // buildUserId/buildWalletId are pure helpers redefined each render, adding them
    // would re-run this on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSave = () => {
    setIsEditing(false)
    const identitySeed = `${userInfo.email.toLowerCase()}|${userInfo.joinDate}`
    const userId = buildUserId(identitySeed)
    const walletId = buildWalletId(userInfo.joinDate, userId)
    setIdentityIds({ userId, walletId })
    localStorage.setItem("currentUser", JSON.stringify({ ...userInfo, userId, walletId }))
  }

  const handleLogout = () => {
    clearUserSession()
    router.push("/")
  }

  const copyIdentity = async (value: string, key: "wallet" | "user") => {
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      setCopiedKey(key)
      window.setTimeout(() => setCopiedKey((current) => (current === key ? null : current)), 1200)
    } catch {
      setCopiedKey(null)
    }
  }

  const streakStats = { currentStreak: 12, longestStreak: 18 }
  const streakDays = Array.from({ length: 14 }, (_, i) => ({ day: i + 1, hasActivity: i < streakStats.currentStreak }))
  const initials = userInfo.name.split(" ").map((n) => n[0]).join("")

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <button
        onClick={() => router.back()}
        className="mb-4 inline-flex items-center gap-2 text-sm text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {/* Header */}
      <div data-reveal-block className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <span className="grid h-11 w-11 flex-none place-items-center rounded-xl border border-gold/20 bg-gold/[0.08] text-gold">
            <User className="h-5 w-5" />
          </span>
          <div>
            <h1 className="font-display text-3xl font-extrabold tracking-[-0.03em] text-ink">User profile</h1>
            <p className="mt-1 text-ink-muted">Manage your account information and preferences</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {isEditing ? (
            <>
              <button onClick={handleSave} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-[#f2c877] to-gold-deep px-4 py-2 text-sm font-semibold text-[#241a06] transition-all hover:brightness-105">
                <Save className="h-4 w-4" /> Save changes
              </button>
              <button onClick={() => setIsEditing(false)} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-ink transition-all hover:bg-white/[0.06]">
                <X className="h-4 w-4" /> Cancel
              </button>
            </>
          ) : (
            <button onClick={() => setIsEditing(true)} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-ink transition-all hover:bg-white/[0.06]">
              <Edit className="h-4 w-4" /> Edit profile
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: identity card */}
        <div data-reveal-card className={`${cardCls} h-fit lg:col-span-1`}>
          <div className="text-center">
            <div className="mx-auto mb-4 grid h-24 w-24 place-items-center rounded-full bg-gradient-to-br from-[#f2c877] to-gold-deep text-3xl font-bold text-[#241a06]">
              {initials}
            </div>
            <h2 className="font-display text-xl font-bold text-ink">{userInfo.name}</h2>
            <p className="mt-0.5 text-sm text-ink-muted">Active reviewer</p>
            <div className="mt-3 flex items-center justify-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-mint/25 bg-mint/10 px-2.5 py-1 text-xs font-semibold text-mint">
                <Shield className="h-3 w-3" /> Verified
              </span>
              <span className="inline-flex items-center rounded-full border border-gold/25 bg-gold/10 px-2.5 py-1 text-xs font-semibold text-gold">Premium</span>
            </div>
          </div>

          <div className="my-5 h-px bg-white/[0.07]" />

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-ink-dim">
              <Calendar className="h-4 w-4 flex-none text-gold" /> Joined {new Date(userInfo.joinDate).toLocaleDateString()}
            </div>
            <div className="flex items-center gap-2 text-sm text-ink-dim">
              <Mail className="h-4 w-4 flex-none text-gold" /> <span className="truncate">{userInfo.email}</span>
            </div>

            {([
              { label: "Wallet ID", value: identityIds.walletId, key: "wallet" as const },
              { label: "User ID", value: identityIds.userId, key: "user" as const },
            ]).map((id) => (
              <div key={id.key} className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] uppercase tracking-wide text-ink-muted">{id.label}</p>
                  <button
                    type="button"
                    onClick={() => copyIdentity(id.value, id.key)}
                    className="inline-flex items-center gap-1 text-xs text-ink-muted transition-colors hover:text-gold"
                    aria-label={`Copy ${id.label}`}
                  >
                    {copiedKey === id.key ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copiedKey === id.key ? "Copied" : "Copy"}
                  </button>
                </div>
                <p className="tvx-num mt-1 break-all text-xs text-ink-dim">{id.value}</p>
              </div>
            ))}
          </div>

          <div className="my-5 h-px bg-white/[0.07]" />

          <button
            onClick={handleLogout}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-rose-400/30 bg-rose-500/[0.06] px-4 py-2 text-sm font-medium text-rose-300 transition-all hover:bg-rose-500/10"
          >
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>

        {/* Right column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Personal information */}
          <div data-reveal-card className={cardCls}>
            <h3 className="font-display text-lg font-bold text-ink">Personal information</h3>
            <p className="mt-0.5 text-sm text-ink-muted">Your basic profile information</p>
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="name" className="text-sm font-medium text-ink-dim">Full name</Label>
                  {isEditing ? (
                    <Input id="name" value={userInfo.name} onChange={(e) => setUserInfo({ ...userInfo, name: e.target.value })} placeholder="John Doe" className="mt-1" />
                  ) : (
                    <p className={displayBox}>{userInfo.name}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="age" className="text-sm font-medium text-ink-dim">Age</Label>
                  {isEditing ? (
                    <Input id="age" type="number" value={userInfo.age} onChange={(e) => setUserInfo({ ...userInfo, age: Number.parseInt(e.target.value) })} placeholder="28" className="mt-1" />
                  ) : (
                    <p className={displayBox}>{userInfo.age}</p>
                  )}
                </div>
              </div>
              <div>
                <Label htmlFor="address" className="text-sm font-medium text-ink-dim">Address</Label>
                {isEditing ? (
                  <Input id="address" value={userInfo.address} onChange={(e) => setUserInfo({ ...userInfo, address: e.target.value })} placeholder="123 Main Street, New York, NY 10001" className="mt-1" />
                ) : (
                  <p className={displayBox}>{userInfo.address}</p>
                )}
              </div>
              <div>
                <Label htmlFor="bio" className="text-sm font-medium text-ink-dim">Bio</Label>
                {isEditing ? (
                  <Textarea id="bio" value={userInfo.bio} onChange={(e) => setUserInfo({ ...userInfo, bio: e.target.value })} placeholder="Tell us about yourself…" rows={3} className="mt-1" />
                ) : (
                  <p className={displayBox}>{userInfo.bio}</p>
                )}
              </div>
            </div>
          </div>

          {/* Interests */}
          <div data-reveal-card className={cardCls}>
            <h3 className="font-display text-lg font-bold text-ink">Interests</h3>
            <p className="mt-0.5 text-sm text-ink-muted">Select or add topics you&apos;d like to give feedback on.</p>
            <div className="mt-4">
              <InterestSelector
                selectedInterests={userInfo.interests}
                onInterestsChange={(newInterests) => setUserInfo({ ...userInfo, interests: newInterests })}
                disabled={!isEditing}
              />
            </div>
          </div>

          {/* Daily streak */}
          <div data-reveal-card className={cardCls}>
            <h3 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
              <Flame className="h-5 w-5 text-gold" /> Daily streak
            </h3>
            <p className="mt-0.5 text-sm text-ink-muted">Keep your streak alive by staying active daily.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {streakDays.map((day) => (
                <div
                  key={day.day}
                  className={`grid h-8 w-8 place-items-center rounded-full text-xs font-medium ${
                    day.hasActivity ? "bg-gradient-to-br from-[#f2c877] to-gold-deep text-[#241a06]" : "border border-white/[0.07] bg-white/[0.02] text-ink-muted"
                  }`}
                >
                  {day.day}
                </div>
              ))}
            </div>
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
              <div className="h-2 rounded-full bg-gradient-to-r from-gold-deep to-gold" style={{ width: `${(streakStats.currentStreak / streakStats.longestStreak) * 100}%` }} />
            </div>
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="font-medium text-gold">Current: <span className="tvx-num">{streakStats.currentStreak}</span> days</span>
              <span className="text-ink-muted">Best: <span className="tvx-num">{streakStats.longestStreak}</span> days</span>
            </div>
          </div>

          {/* Saved drafts */}
          <div data-reveal-card className={cardCls}>
            <h3 className="font-display text-lg font-bold text-ink">Saved feedbacks (drafts)</h3>
            <p className="mt-0.5 text-sm text-ink-muted">Continue editing your saved feedback drafts.</p>
            {savedFeedbacks.length > 0 ? (
              <div className="mt-4 space-y-3">
                {savedFeedbacks.map((feedback) => (
                  <div key={feedback.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.07] bg-white/[0.02] p-4">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">{feedback.product} <span className="text-ink-muted">({feedback.company})</span></p>
                      <p className="text-sm text-ink-muted">Saved: {feedback.date}</p>
                    </div>
                    <button
                      onClick={() => onContinueEditing(feedback)}
                      className="inline-flex flex-none items-center gap-2 rounded-lg bg-gradient-to-b from-[#f2c877] to-gold-deep px-3 py-1.5 text-sm font-semibold text-[#241a06] hover:brightness-105"
                    >
                      <Eye className="h-4 w-4" /> Continue
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 rounded-lg border border-white/[0.07] bg-white/[0.02] py-6 text-center text-sm text-ink-muted">No saved drafts found.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
