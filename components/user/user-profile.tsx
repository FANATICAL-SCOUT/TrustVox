"use client"

import { useState, useEffect } from "react"
import { Label } from "@/components/ui/label"
import { User, Mail, Calendar, LogOut, Eye, Flame, ArrowLeft } from "lucide-react"
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime"
import { createClient } from "@/lib/supabase/client"
import { getFeedbackQuota, type FeedbackQuotaResult } from "@/lib/feedback-quota"
import type { FeedbackHandoff } from "@/lib/feedback-store"

interface UserProfileProps {
  router: AppRouterInstance
  savedFeedbacks: FeedbackHandoff[]
  onContinueEditing: (feedbackData: FeedbackHandoff) => void
}

const cardCls = "rounded-xl border border-white/[0.07] bg-white/[0.02] p-5"

type ProfileInfo = {
  name: string
  email: string
  joinedAt: string | null
}

export default function UserProfile({ router, savedFeedbacks, onContinueEditing }: UserProfileProps) {
  const [profile, setProfile] = useState<ProfileInfo | null>(null)
  const [quota, setQuota] = useState<FeedbackQuotaResult | null>(null)

  useEffect(() => {
    let active = true
    const supabase = createClient()

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user || !active) return

      const [{ data: row }, quotaResult] = await Promise.all([
        supabase.from("profiles").select("display_name, email, created_at").eq("id", user.id).maybeSingle(),
        getFeedbackQuota(),
      ])
      if (!active) return

      setProfile({
        name: row?.display_name || user.email || "User",
        email: row?.email || user.email || "",
        joinedAt: row?.created_at ?? null,
      })
      setQuota(quotaResult)
    }

    void load()
    return () => {
      active = false
    }
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
  }

  const initials = (profile?.name || "U")
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
            <p className="mt-1 text-ink-muted">Your account information</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: identity card */}
        <div data-reveal-card className={`${cardCls} h-fit lg:col-span-1`}>
          <div className="text-center">
            <div className="mx-auto mb-4 grid h-24 w-24 place-items-center rounded-full bg-gradient-to-br from-[#f2c877] to-gold-deep text-3xl font-bold text-[#241a06]">
              {initials}
            </div>
            <h2 className="font-display text-xl font-bold text-ink">{profile?.name ?? "…"}</h2>
            <p className="mt-0.5 text-sm text-ink-muted">Reviewer</p>
          </div>

          <div className="my-5 h-px bg-white/[0.07]" />

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-ink-dim">
              <Calendar className="h-4 w-4 flex-none text-gold" />
              {profile?.joinedAt ? `Joined ${new Date(profile.joinedAt).toLocaleDateString()}` : "—"}
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
          {/* Personal information */}
          <div data-reveal-card className={cardCls}>
            <h3 className="font-display text-lg font-bold text-ink">Personal information</h3>
            <p className="mt-0.5 text-sm text-ink-muted">Your account details</p>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label className="text-sm font-medium text-ink-dim">Full name</Label>
                <p className="mt-1 rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-2 text-sm font-medium text-ink">
                  {profile?.name ?? "—"}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-ink-dim">Email</Label>
                <p className="mt-1 rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-2 text-sm font-medium text-ink">
                  {profile?.email ?? "—"}
                </p>
              </div>
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
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="font-medium text-gold">Current: <span className="tvx-num">{quota?.streakCount ?? 0}</span> days</span>
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
