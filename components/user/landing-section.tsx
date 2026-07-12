"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { MessageSquare, Coins, Flame, ArrowRight, Eye, CheckCircle2 } from "lucide-react"
import SearchWithAutocomplete from "./search-with-autocomplete"
import {
  getApprovedForms,
  getSubmittedFormIdsByUser,
  subscribeToFormsUpdates,
  type FeedbackForm,
  type FeedbackHandoff,
} from "@/lib/feedback-store"
import { getFeedbackQuota, subscribeToFeedbackQuotaUpdates } from "@/lib/feedback-quota"
import { getTVXWalletState, subscribeToTVXWalletUpdates } from "@/lib/tvx-wallet"
import { createClient, getCachedUser } from "@/lib/supabase/client"

interface LandingSectionProps {
  handleStartFeedbackFromSuggested: (feedbackData: FeedbackHandoff) => void
  setSelectedCompanyForModal: (company: FeedbackHandoff) => void
  setIsCompanyModalOpen: (isOpen: boolean) => void
  onSaveForLater: (feedbackData: FeedbackHandoff) => void
  dailyFeedbackRemaining: number
  dailyFeedbackLimit: number
  completedToday: number
}

// A real approved form paired with whether the current user already submitted it.
interface FormCardModel {
  form: FeedbackForm
  isSubmitted: boolean
}

function toHandoff(form: FeedbackForm): FeedbackHandoff {
  return {
    id: form.id,
    formId: form.id,
    company: form.clientName,
    product: form.product,
    category: form.category,
    description: form.description,
    reward: form.rewardTokens,
    totalFeedbacks: form.responseCount,
  }
}

async function resolveCurrentUserId(): Promise<string | null> {
  const supabase = createClient()
  const user = await getCachedUser(supabase)
  return user?.id ?? null
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/[0.1] bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium text-ink-muted">
      {children}
    </span>
  )
}

export default function LandingSection({
  handleStartFeedbackFromSuggested,
  setSelectedCompanyForModal,
  setIsCompanyModalOpen,
  onSaveForLater,
  dailyFeedbackRemaining,
  dailyFeedbackLimit,
  completedToday,
}: LandingSectionProps) {
  const router = useRouter()
  const [userName, setUserName] = useState("there")
  const [approvedForms, setApprovedForms] = useState<FeedbackForm[]>([])
  const [submittedIds, setSubmittedIds] = useState<Set<string>>(new Set())
  const [feedbacksGiven, setFeedbacksGiven] = useState(0)
  const [tokensEarned, setTokensEarned] = useState(0)
  const [streakDays, setStreakDays] = useState(0)

  useEffect(() => {
    let active = true
    const loadForms = async () => {
      // Forms + user id in parallel, then the user-scoped query.
      const [forms, userId] = await Promise.all([getApprovedForms(), resolveCurrentUserId()])
      const ids = new Set(userId ? await getSubmittedFormIdsByUser(userId) : [])
      if (!active) return
      setApprovedForms(forms)
      setSubmittedIds(ids)
    }
    void loadForms()
    const unsubscribe = subscribeToFormsUpdates(() => void loadForms())
    const handleFocus = () => void loadForms()
    window.addEventListener("focus", handleFocus)
    return () => {
      active = false
      unsubscribe()
      window.removeEventListener("focus", handleFocus)
    }
  }, [])

  useEffect(() => {
    let active = true
    const supabase = createClient()

    getCachedUser(supabase).then(async (user) => {
      if (!user || !active) return
      const { data } = await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle()
      if (!active) return
      const resolvedName = (data?.display_name || user.email || "there").toString().trim()
      if (resolvedName) setUserName(resolvedName)
    })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const loadStats = () => {
      void getFeedbackQuota().then((quota) => {
        setFeedbacksGiven(quota.completedTotal)
        setStreakDays(quota.streakCount)
      })
      void getTVXWalletState().then((wallet) => setTokensEarned(wallet.totalEarned))
    }

    loadStats()
    const unsubscribeQuota = subscribeToFeedbackQuotaUpdates(() => loadStats())
    const unsubscribeWallet = subscribeToTVXWalletUpdates(() => loadStats())

    return () => {
      unsubscribeQuota()
      unsubscribeWallet()
    }
  }, [])

  const cards = useMemo<FormCardModel[]>(
    () => approvedForms.map((form) => ({ form, isSubmitted: submittedIds.has(form.id) })),
    [approvedForms, submittedIds],
  )

  // Recommended shows only forms the user hasn't finished yet — completed
  // surveys live in History, not here. Newest first (approvedAt), capped at 6.
  const recommended = useMemo(
    () =>
      cards
        .filter((c) => !c.isSubmitted)
        .sort((a, b) => Date.parse(b.form.approvedAt || "") - Date.parse(a.form.approvedAt || ""))
        .slice(0, 6),
    [cards],
  )

  // Trending = real forms with the most responses (any state, incl. finished —
  // finished ones render a View button, never a start action).
  const trending = useMemo(
    () => [...cards].sort((a, b) => b.form.responseCount - a.form.responseCount).slice(0, 4),
    [cards],
  )

  const openForm = (formId: string) => router.push(`/user/feedback/${formId}`)

  const handleSearchSelect = (item: { type: string; name: string; id: string }) => {
    const selectedId = item?.id
    if (typeof selectedId === "string" && selectedId.length > 0) {
      // Already-submitted forms are read-only; send them to the read view.
      if (submittedIds.has(selectedId)) {
        openForm(selectedId)
        return
      }
      handleStartFeedbackFromSuggested({ formId: selectedId, id: selectedId })
      return
    }
    setSelectedCompanyForModal({
      id: item.id,
      company: item.type === "company" ? item.name : "Sample Company",
      product: item.type === "product" ? item.name : "Sample Product",
      category: "General",
      rating: 4.2,
      feedback: `A sample description for ${item.name}. Share your feedback and earn TVX.`,
    })
    setIsCompanyModalOpen(true)
  }

  const searchItems = useMemo(
    () =>
      approvedForms.map((form) => ({
        id: form.id,
        type: "product",
        name: form.product,
        subtitle: form.clientName,
        category: form.category,
      })),
    [approvedForms],
  )

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Hero */}
        <div data-reveal-block className="py-8 text-center">
          <h1 className="mx-auto max-w-3xl text-balance font-display text-4xl font-extrabold tracking-[-0.03em] sm:text-5xl">
            Welcome back, <span className="tvx-text-gold">{userName}</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-ink-dim">
            Your next reward is one decision away. Pick an opportunity, share your insight, and grow your balance.
          </p>
          <div className="mx-auto mt-5 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-1.5 text-sm text-ink-muted">
            <MessageSquare className="h-4 w-4" />
            Daily feedbacks left <span className="tvx-num font-semibold text-ink">{dailyFeedbackRemaining}/{dailyFeedbackLimit}</span>
            <span className="text-white/20">·</span> Submitted today <span className="tvx-num font-semibold text-ink">{completedToday}</span>
          </div>
          <div className="mx-auto mt-7 max-w-3xl">
            <SearchWithAutocomplete
              onSelect={handleSearchSelect}
              items={searchItems}
              placeholder="Search live feedback opportunities…"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="mb-14 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { label: "Feedbacks given", value: String(feedbacksGiven), suffix: undefined, icon: MessageSquare },
            { label: "Tokens earned", value: tokensEarned.toLocaleString(), suffix: "TVX", icon: Coins },
            { label: "Activity streak", value: String(streakDays), suffix: "days", icon: Flame },
          ].map((stat) => (
            <div key={stat.label} data-reveal-card className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 transition-all duration-200 hover:-translate-y-1 hover:border-white/15">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-ink-muted">{stat.label}</p>
                  <p className="mt-1.5 text-xl font-bold text-ink">
                    <span className="tvx-num">{stat.value}</span>
                    {stat.suffix ? <span className="ml-1 text-sm font-semibold text-gold">{stat.suffix}</span> : null}
                  </p>
                </div>
                <span className="grid h-9 w-9 place-items-center rounded-lg border border-gold/20 bg-gold/[0.08] text-gold">
                  <stat.icon className="h-4.5 w-4.5" />
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Recommended */}
        <section className="mb-14">
          <div className="mb-6 flex items-end justify-between gap-3">
            <div>
              <h2 data-reveal-block className="font-display text-2xl font-extrabold tracking-[-0.02em] text-ink sm:text-3xl">Recommended for you</h2>
              <p className="mt-1.5 text-ink-muted">Live feedback opportunities you haven&apos;t completed yet</p>
            </div>
            <Button
              variant="ghost"
              onClick={() => router.push("/user/dashboard?section=suggested")}
              className="text-ink-dim hover:text-ink"
            >
              View all <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </div>

          {recommended.length === 0 ? (
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-10 text-center">
              <p className="text-sm text-ink-muted">
                You&apos;re all caught up — no new opportunities right now. Check back soon or review your
                {" "}
                <button onClick={() => router.push("/user/dashboard?section=history")} className="text-gold underline-offset-2 hover:underline">history</button>.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {recommended.map(({ form }) => (
                <div key={form.id} data-reveal-card className="group flex flex-col rounded-xl border border-white/[0.07] bg-white/[0.02] p-5 transition-all duration-200 hover:-translate-y-1 hover:border-white/15">
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    <Pill>{form.category}</Pill>
                    <span className="inline-flex items-center gap-1 rounded-full border border-mint/25 bg-mint/10 px-2.5 py-1 text-[11px] font-medium text-mint">
                      <CheckCircle2 className="h-3 w-3" /> Live
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-display text-lg font-bold text-ink">{form.product}</h3>
                  </div>
                  <p className="mt-0.5 text-sm font-medium text-ink-muted">{form.clientName}</p>
                  <p className="mt-3 line-clamp-3 flex-1 text-sm leading-relaxed text-ink-muted">
                    {form.description || `Share your feedback on ${form.product}.`}
                  </p>
                  <div className="mt-5 flex items-center justify-between">
                    <span className="tvx-num text-sm font-bold text-gold">+{form.rewardTokens} TVX</span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onSaveForLater(toHandoff(form))}
                        className="border-white/10 bg-white/[0.03] text-ink-dim hover:bg-white/[0.06] hover:text-ink"
                      >
                        Bookmark
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleStartFeedbackFromSuggested(toHandoff(form))}
                        className="bg-gradient-to-b from-[#f2c877] to-gold-deep font-semibold text-[#241a06] hover:brightness-105"
                      >
                        Start now
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Trending */}
        {trending.length > 0 && (
          <section className="mb-14">
            <h2 data-reveal-block className="font-display text-xl font-extrabold tracking-[-0.02em] text-ink sm:text-2xl">Trending right now</h2>
            <p className="mt-1.5 text-ink-muted">The most-answered opportunities on the platform</p>
            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              {trending.map(({ form, isSubmitted }) => (
                <div key={form.id} data-reveal-card className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.07] bg-white/[0.02] p-5 transition-all duration-200 hover:border-white/15">
                  <div className="min-w-0">
                    <p className="truncate font-display text-base font-bold text-ink">{form.product}</p>
                    <p className="mt-0.5 truncate text-sm text-ink-muted">{form.clientName}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Pill>{form.category}</Pill>
                      <Pill>{form.responseCount} {form.responseCount === 1 ? "response" : "responses"}</Pill>
                    </div>
                  </div>
                  {isSubmitted ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openForm(form.id)}
                      className="flex-none border-white/10 bg-white/[0.03] text-ink-dim hover:bg-white/[0.06] hover:text-ink"
                    >
                      <Eye className="mr-1 h-4 w-4" /> View
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openForm(form.id)}
                      className="flex-none border-white/10 bg-white/[0.03] text-ink hover:bg-white/[0.06]"
                    >
                      Open
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* CTA */}
        <div data-reveal-block className="tvx-card-gold rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-10 text-center">
          <h2 className="text-balance font-display text-3xl font-extrabold tracking-[-0.03em] text-ink sm:text-4xl">Earn more tokens today</h2>
          <p className="mx-auto mt-4 max-w-2xl text-ink-dim">
            Browse every live opportunity, share your honest feedback, and unlock your next reward.
          </p>
          <Button
            onClick={() => router.push("/user/dashboard?section=suggested")}
            size="lg"
            className="mt-7 rounded-xl bg-gradient-to-b from-[#f2c877] to-gold-deep px-8 font-semibold text-[#241a06] shadow-[0_10px_26px_-12px_rgba(235,188,107,0.5)] transition-all hover:-translate-y-0.5 hover:brightness-105"
          >
            Browse all opportunities
          </Button>
        </div>
      </div>
    </div>
  )
}
