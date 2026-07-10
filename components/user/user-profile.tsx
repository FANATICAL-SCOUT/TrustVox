"use client"

import { useEffect, useState } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import {
  User,
  Mail,
  Calendar,
  LogOut,
  Flame,
  ArrowLeft,
  Coins,
  Ticket,
  Tag,
  Lock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
} from "lucide-react"
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime"
import { createClient } from "@/lib/supabase/client"
import { getFeedbackQuota, type FeedbackQuotaResult } from "@/lib/feedback-quota"
import {
  getUserProfile,
  updateUserProfile,
  getNameChangeStatus,
  wordCount,
  INTEREST_OPTIONS,
  MAX_BIO_WORDS,
  MAX_INTERESTS,
  type UserProfile as UserProfileData,
} from "@/lib/profile-store"
import {
  getTVXWalletState,
  getRedemptions,
  deriveEarnHistory,
  subscribeToTVXWalletUpdates,
  type TVXEarnEntry,
  type Redemption,
} from "@/lib/tvx-wallet"

interface UserProfileProps {
  router: AppRouterInstance
}

const cardCls = "rounded-xl border border-white/[0.07] bg-white/[0.02] p-5"

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
}

export default function UserProfile({ router }: UserProfileProps) {
  const [profile, setProfile] = useState<UserProfileData | null>(null)
  const [quota, setQuota] = useState<FeedbackQuotaResult | null>(null)
  const [earnHistory, setEarnHistory] = useState<TVXEarnEntry[]>([])
  const [redemptions, setRedemptions] = useState<Redemption[]>([])

  // Editable form state (seeded from the loaded profile).
  const [nameInput, setNameInput] = useState("")
  const [bioInput, setBioInput] = useState("")
  const [interests, setInterests] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const loadProfile = async () => {
    const data = await getUserProfile()
    if (!data) return
    setProfile(data)
    setNameInput(data.displayName)
    setBioInput(data.bio)
    setInterests(data.interests)
  }

  useEffect(() => {
    let active = true

    async function load() {
      const [data, quotaResult, wallet, coupons] = await Promise.all([
        getUserProfile(),
        getFeedbackQuota(),
        getTVXWalletState(),
        getRedemptions(),
      ])
      if (!active) return
      if (data) {
        setProfile(data)
        setNameInput(data.displayName)
        setBioInput(data.bio)
        setInterests(data.interests)
      }
      setQuota(quotaResult)
      setEarnHistory(deriveEarnHistory(wallet.transactions))
      setRedemptions(coupons)
    }

    void load()

    // Keep the TVX-earned list + coupon history live when the wallet changes.
    const unsubscribe = subscribeToTVXWalletUpdates(() => {
      void Promise.all([getTVXWalletState(), getRedemptions()]).then(([wallet, coupons]) => {
        if (!active) return
        setEarnHistory(deriveEarnHistory(wallet.transactions))
        setRedemptions(coupons)
      })
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
  }

  const toggleInterest = (tag: string) => {
    setInterests((prev) => {
      if (prev.includes(tag)) return prev.filter((t) => t !== tag)
      if (prev.length >= MAX_INTERESTS) return prev
      return [...prev, tag]
    })
  }

  const nameStatus = getNameChangeStatus(profile?.lastNameChangeAt ?? null)
  const nameChanged = profile ? nameInput.trim() !== profile.displayName : false
  const bioWords = wordCount(bioInput)
  const bioOverLimit = bioWords > MAX_BIO_WORDS
  // Block a name change while on cooldown; everything else stays editable.
  const nameLocked = nameChanged && !nameStatus.canChange

  const dirty =
    profile !== null &&
    (nameChanged ||
      bioInput !== profile.bio ||
      interests.length !== profile.interests.length ||
      interests.some((t) => !profile.interests.includes(t)))

  const canSave = dirty && !bioOverLimit && !nameLocked && nameInput.trim().length > 0 && !isSaving

  const handleSave = async () => {
    if (!canSave) return
    setIsSaving(true)
    setBanner(null)
    const result = await updateUserProfile({
      displayName: nameInput.trim(),
      bio: bioInput,
      interests,
    })
    setIsSaving(false)

    if (result.ok) {
      await loadProfile()
      setBanner({ type: "success", text: "Profile saved." })
      return
    }
    setBanner({ type: "error", text: result.message ?? "Could not save your profile." })
  }

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedCode(code)
      window.setTimeout(() => setCopiedCode((c) => (c === code ? null : c)), 1500)
    } catch {
      /* clipboard unavailable — the code is visible to copy manually */
    }
  }

  const initials = (profile?.displayName || "U")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")

  const streakDays = Array.from({ length: 14 }, (_, i) => ({
    day: i + 1,
    hasActivity: quota ? i < quota.streakCount : false,
  }))

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
            <p className="mt-1 text-ink-muted">Manage your account, interests, and rewards</p>
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
        <div data-reveal-card className={`${cardCls} h-fit lg:col-span-1`}>
          <div className="text-center">
            <div className="mx-auto mb-4 grid h-24 w-24 place-items-center rounded-full bg-gradient-to-br from-[#f2c877] to-gold-deep text-3xl font-bold text-[#241a06]">
              {initials}
            </div>
            <h2 className="font-display text-xl font-bold text-ink">{profile?.displayName ?? "…"}</h2>
            <p className="mt-0.5 text-sm text-ink-muted">Reviewer</p>
          </div>

          <div className="my-5 h-px bg-white/[0.07]" />

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-ink-dim">
              <Calendar className="h-4 w-4 flex-none text-gold" />
              {profile?.joinedAt ? `Joined ${formatDate(profile.joinedAt)}` : "—"}
            </div>
            <div className="flex items-center gap-2 text-sm text-ink-dim">
              <Mail className="h-4 w-4 flex-none text-gold" /> <span className="truncate">{profile?.email ?? "—"}</span>
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

        {/* Right column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Edit profile: name (cooldown) + frozen email + bio */}
          <div data-reveal-card className={cardCls}>
            <h3 className="font-display text-lg font-bold text-ink">Edit profile</h3>
            <p className="mt-0.5 text-sm text-ink-muted">Update your display name and bio.</p>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="profile-name" className="text-sm font-medium text-ink-dim">
                  Full name
                </Label>
                <Input
                  id="profile-name"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  maxLength={120}
                  className="mt-1 border-white/[0.07] bg-white/[0.02] text-ink"
                />
                {nameChanged && !nameStatus.canChange ? (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-destructive">
                    <Lock className="h-3.5 w-3.5 flex-none" />
                    Name can change again in {nameStatus.daysRemaining} day
                    {nameStatus.daysRemaining === 1 ? "" : "s"}.
                  </p>
                ) : (
                  <p className="mt-1.5 text-xs text-ink-muted">
                    You can change your name once every 90 days.
                  </p>
                )}
              </div>
              <div>
                <Label className="text-sm font-medium text-ink-dim">Email</Label>
                <div className="mt-1 flex items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-2 text-sm font-medium text-ink-dim">
                  <Lock className="h-3.5 w-3.5 flex-none text-ink-muted" />
                  <span className="truncate">{profile?.email ?? "—"}</span>
                </div>
                <p className="mt-1.5 text-xs text-ink-muted">Email is permanent and can&apos;t be changed.</p>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="profile-bio" className="text-sm font-medium text-ink-dim">
                  Bio
                </Label>
                <span className={`text-xs ${bioOverLimit ? "text-destructive" : "text-ink-muted"}`}>
                  {bioWords}/{MAX_BIO_WORDS} words
                </span>
              </div>
              <Textarea
                id="profile-bio"
                value={bioInput}
                onChange={(e) => setBioInput(e.target.value)}
                rows={4}
                placeholder="Tell others a little about yourself…"
                className="mt-1 resize-none border-white/[0.07] bg-white/[0.02] text-ink"
              />
            </div>

            <div className="mt-4 flex justify-end">
              <Button
                onClick={handleSave}
                disabled={!canSave}
                className="bg-gradient-to-b from-[#f2c877] to-gold-deep font-semibold text-[#241a06] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </div>

          {/* Interests — separate section (Session 3 item 3) */}
          <div data-reveal-card className={cardCls}>
            <h3 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
              <Tag className="h-5 w-5 text-gold" /> Interests
            </h3>
            <p className="mt-0.5 text-sm text-ink-muted">
              Pick up to {MAX_INTERESTS} categories you want to give feedback on. Saved with your profile.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {INTEREST_OPTIONS.map((tag) => {
                const selected = interests.includes(tag)
                const atLimit = interests.length >= MAX_INTERESTS
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleInterest(tag)}
                    disabled={!selected && atLimit}
                    aria-pressed={selected}
                    className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 ${
                      selected
                        ? "border-gold/40 bg-gold/10 text-gold"
                        : atLimit
                          ? "cursor-not-allowed border-white/[0.06] bg-white/[0.02] text-ink-muted opacity-50"
                          : "border-white/[0.08] bg-white/[0.03] text-ink-dim hover:border-white/15 hover:text-ink"
                    }`}
                  >
                    {tag}
                  </button>
                )
              })}
            </div>
            <p className="mt-3 text-xs text-ink-muted">
              {interests.length}/{MAX_INTERESTS} selected · changes save with the button above.
            </p>
          </div>

          {/* TVX earned — per feedback (Session 3 item 4) */}
          <div data-reveal-card className={cardCls}>
            <h3 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
              <Coins className="h-5 w-5 text-gold" /> TVX earned
            </h3>
            <p className="mt-0.5 text-sm text-ink-muted">Which feedback earned your tokens, and when.</p>
            {earnHistory.length > 0 ? (
              <div className="mt-4 space-y-2.5">
                {earnHistory.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.07] bg-white/[0.02] px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">{entry.feedbackTitle}</p>
                      <p className="text-xs text-ink-muted">{formatDate(entry.createdAt)}</p>
                    </div>
                    <span className="tvx-num flex-none text-sm font-bold text-mint">
                      +{entry.amount.toLocaleString()} TVX
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 rounded-lg border border-white/[0.07] bg-white/[0.02] py-6 text-center text-sm text-ink-muted">
                No TVX earned yet. Submit feedback to start earning.
              </p>
            )}
          </div>

          {/* Redeemed rewards — coupon history (Session 3 items 5–6) */}
          <div data-reveal-card className={cardCls}>
            <h3 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
              <Ticket className="h-5 w-5 text-gold" /> Redeemed rewards
            </h3>
            <p className="mt-0.5 text-sm text-ink-muted">
              Your coupon history — code and expiry for every redemption.
            </p>
            {redemptions.length > 0 ? (
              <div className="mt-4 space-y-3">
                {redemptions.map((r) => (
                  <div
                    key={r.id}
                    className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink">{r.itemTitle}</p>
                        <p className="text-xs text-ink-muted">
                          Redeemed {formatDate(r.redeemedAt)} · {r.cost.toLocaleString()} TVX
                        </p>
                      </div>
                      <span
                        className={`flex-none rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                          r.isExpired
                            ? "border-white/[0.1] bg-white/[0.03] text-ink-muted"
                            : "border-mint/25 bg-mint/10 text-mint"
                        }`}
                      >
                        {r.isExpired ? "Expired" : "Active"}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3 rounded-md border border-dashed border-white/[0.1] bg-white/[0.02] px-3 py-2">
                      <code className={`font-mono text-sm tracking-wider ${r.isExpired ? "text-ink-muted line-through" : "text-gold"}`}>
                        {r.couponCode}
                      </code>
                      <div className="flex items-center gap-3">
                        <span className="hidden text-xs text-ink-muted sm:inline">
                          {r.isExpired ? "Expired" : "Expires"} {formatDate(r.expiresAt)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyCode(r.couponCode)}
                          className="inline-flex items-center gap-1 rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-xs text-ink-dim transition-colors hover:text-ink"
                          aria-label="Copy coupon code"
                        >
                          {copiedCode === r.couponCode ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-mint" /> Copied
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5" /> Copy
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 rounded-lg border border-white/[0.07] bg-white/[0.02] py-6 text-center text-sm text-ink-muted">
                No rewards redeemed yet. Visit the store to spend your TVX.
              </p>
            )}
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
                    day.hasActivity
                      ? "bg-gradient-to-br from-[#f2c877] to-gold-deep text-[#241a06]"
                      : "border border-white/[0.07] bg-white/[0.02] text-ink-muted"
                  }`}
                >
                  {day.day}
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="font-medium text-gold">
                Current: <span className="tvx-num">{quota?.streakCount ?? 0}</span> days
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
