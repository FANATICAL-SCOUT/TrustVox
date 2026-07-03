"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Lightbulb, Save, MessageSquare, Star, Clock3, Users } from "lucide-react"
import SearchWithAutocomplete from "@/components/search-with-autocomplete"
import { getApprovedForms, subscribeToFormsUpdates, type FeedbackForm } from "@/lib/feedback-store"
import { getTVXWalletState, subscribeToTVXWalletUpdates } from "@/lib/tvx-wallet"

interface SuggestedFeedbackProps {
  handleStartFeedbackFromSuggested: (feedback: any) => void
  onSaveForLater: (feedback: any) => void
}

type FilterKey = "all" | "high-reward" | "ending-soon" | "easy"

interface SuggestedOpportunity {
  id: string
  formId: string
  company: string
  product: string
  category: string
  description: string
  reward: number
  rating: number
  participants: number
  estimatedTime: string
  badges: string[]
}

// Sample opportunities so the section reads as populated in the demo.
// When real approved forms exist they take over the same slots.
const SUGGESTED_SEED: SuggestedOpportunity[] = [
  { id: "sugg1", formId: "", company: "GlobalTech Innovations", product: "Quantum Leap Software", category: "Productivity", description: "Share feedback on the new UI/UX of Quantum Leap's latest update — focus on navigation and feature accessibility.", reward: 25, rating: 4.5, participants: 1200, estimatedTime: "2–3 min", badges: ["Ending soon"] },
  { id: "sugg2", formId: "", company: "Eco-Friendly Foods", product: "Organic Protein Bar", category: "Food & Beverage", description: "Taste-test and review the new Organic Protein Bar. Comment on flavour, texture, and packaging.", reward: 15, rating: 4.3, participants: 850, estimatedTime: "2 min", badges: ["Easy"] },
  { id: "sugg3", formId: "", company: "Fashion Forward Group", product: "Winter Collection 2024", category: "Apparel", description: "Review the new Winter Collection — focus on material quality, design, and overall appeal.", reward: 30, rating: 4.6, participants: 980, estimatedTime: "3–4 min", badges: ["High reward", "Premium"] },
  { id: "sugg4", formId: "", company: "Health & Wellness Hub", product: "Smart Fitness Tracker", category: "Wearable Tech", description: "Test the heart-rate monitor and step counter, and share insights on battery life and accuracy.", reward: 20, rating: 4.0, participants: 410, estimatedTime: "2–3 min", badges: ["Easy"] },
  { id: "sugg5", formId: "", company: "Travel Adventures Ltd.", product: "VR Travel Experience", category: "Entertainment", description: "Experience the VR travel demo and give feedback on immersion, realism, and potential improvements.", reward: 40, rating: 4.4, participants: 1267, estimatedTime: "3–5 min", badges: ["High reward", "Ending soon"] },
  { id: "sugg6", formId: "", company: "FinEdge Payments", product: "Neo Wallet App", category: "Fintech", description: "Help evaluate onboarding speed and card-management flows on the Neo Wallet app.", reward: 24, rating: 4.6, participants: 1460, estimatedTime: "2–3 min", badges: ["Popular"] },
]

function mergeWithForms(seed: SuggestedOpportunity[], forms: FeedbackForm[]): SuggestedOpportunity[] {
  return seed.map((entry, index) => {
    const form = forms[index]
    if (!form) return entry
    return {
      ...entry,
      formId: form.id,
      company: form.clientName,
      product: form.product,
      category: form.category,
      description: form.description || entry.description,
      reward: form.rewardTokens,
      participants: form.responseCount > 0 ? form.responseCount : entry.participants,
    }
  })
}

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "high-reward", label: "High reward" },
  { key: "ending-soon", label: "Ending soon" },
  { key: "easy", label: "Easy" },
]

const REWARD_GOALS = [100, 200, 300, 500]

function Tag({ label }: { label: string }) {
  const gold = label === "High reward"
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${
        gold ? "border-gold/25 bg-gold/[0.08] text-gold" : "border-white/[0.1] bg-white/[0.03] text-ink-muted"
      }`}
    >
      {label}
    </span>
  )
}

const SuggestedFeedbacks = ({ handleStartFeedbackFromSuggested, onSaveForLater }: SuggestedFeedbackProps) => {
  const router = useRouter()
  const [approvedForms, setApprovedForms] = useState<FeedbackForm[]>([])
  const [walletBalance, setWalletBalance] = useState(() => getTVXWalletState().balance)
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all")

  useEffect(() => {
    const loadForms = () => setApprovedForms(getApprovedForms())
    loadForms()
    const unsubscribe = subscribeToFormsUpdates(loadForms)
    window.addEventListener("focus", loadForms)
    return () => {
      unsubscribe()
      window.removeEventListener("focus", loadForms)
    }
  }, [])

  useEffect(() => {
    const syncWallet = () => setWalletBalance(getTVXWalletState().balance)
    syncWallet()
    const unsubscribe = subscribeToTVXWalletUpdates(syncWallet)
    window.addEventListener("focus", syncWallet)
    return () => {
      unsubscribe()
      window.removeEventListener("focus", syncWallet)
    }
  }, [])

  const suggested = useMemo(() => mergeWithForms(SUGGESTED_SEED, approvedForms), [approvedForms])

  const nextGoal = REWARD_GOALS.find((goal) => goal > walletBalance)
  const progressMessage = nextGoal
    ? `${(nextGoal - walletBalance).toLocaleString()} TVX to your next reward`
    : "You have enough TVX to redeem now"

  const filteredFeedbacks = useMemo(() => {
    if (activeFilter === "all") return suggested
    if (activeFilter === "high-reward") return suggested.filter((f) => f.badges.includes("High reward"))
    if (activeFilter === "ending-soon") return suggested.filter((f) => f.badges.includes("Ending soon"))
    return suggested.filter((f) => f.badges.includes("Easy") || f.estimatedTime.includes("2"))
  }, [activeFilter, suggested])

  const searchItems = useMemo(
    () =>
      suggested.map((f) => ({
        id: f.formId || f.id,
        type: "product",
        name: f.product,
        subtitle: f.company,
        category: f.category,
      })),
    [suggested],
  )

  const start = (feedback: SuggestedOpportunity) => {
    if (feedback.formId) {
      handleStartFeedbackFromSuggested(feedback)
    } else {
      router.push("/user/feedbacks")
    }
  }

  const handleSearchSelect = (item: { id: string }) => {
    const match = suggested.find((f) => (f.formId || f.id) === item?.id)
    if (match) {
      start(match)
      return
    }
    router.push("/user/feedbacks")
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div data-reveal-block className="text-center">
        <p className="inline-flex items-center gap-2 rounded-full border border-gold/20 bg-gold/[0.08] px-4 py-1.5 text-sm font-semibold text-gold">
          <Lightbulb className="h-4 w-4" /> Recommended
        </p>
        <h1 className="mt-4 font-display text-4xl font-extrabold tracking-[-0.03em] text-ink">Suggested for you</h1>
        <p className="mx-auto mt-3 max-w-xl text-ink-dim">Opportunities matched to your activity and interests.</p>
        <span className="mt-4 inline-flex items-center rounded-full border border-mint/25 bg-mint/10 px-3 py-1 text-xs font-semibold text-mint">
          {progressMessage}
        </span>

        <div className="mx-auto mt-6 max-w-xl">
          <SearchWithAutocomplete
            onSelect={handleSearchSelect}
            items={searchItems}
            placeholder="Search suggested products, companies, or categories…"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
        {FILTERS.map((filter) => {
          const active = activeFilter === filter.key
          return (
            <button
              key={filter.key}
              onClick={() => setActiveFilter(filter.key)}
              aria-pressed={active}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 ${
                active
                  ? "border-gold/40 bg-gold/10 text-gold"
                  : "border-white/[0.08] bg-white/[0.03] text-ink-dim hover:border-white/15 hover:text-ink"
              }`}
            >
              {filter.label}
            </button>
          )
        })}
      </div>

      {/* Cards */}
      {filteredFeedbacks.length === 0 ? (
        <p className="mt-10 rounded-xl border border-white/[0.07] bg-white/[0.02] p-8 text-center text-sm text-ink-muted">
          No opportunities match this filter right now. Try another filter.
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredFeedbacks.map((feedback) => (
            <div
              key={feedback.id}
              data-reveal-card
              className="group flex flex-col rounded-xl border border-white/[0.07] bg-white/[0.02] p-5 transition-all duration-200 hover:-translate-y-1 hover:border-white/15"
            >
              <div className="mb-3 flex flex-wrap gap-1.5">
                {feedback.badges.map((badge) => (
                  <Tag key={badge} label={badge} />
                ))}
              </div>

              <div className="flex items-start justify-between gap-3">
                <h3 className="font-display text-lg font-bold text-ink">{feedback.product}</h3>
                {feedback.rating > 0 ? (
                  <div className="flex flex-none items-center gap-1 text-sm text-ink-dim">
                    <Star className="h-4 w-4 fill-gold text-gold" />
                    <span className="tvx-num">{feedback.rating.toFixed(1)}</span>
                  </div>
                ) : null}
              </div>
              <p className="mt-0.5 text-sm font-medium text-ink-muted">{feedback.company}</p>
              <span className="mt-2 inline-flex w-fit items-center rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-0.5 text-[11px] text-ink-muted">
                {feedback.category}
              </span>

              <p className="mt-3 line-clamp-3 flex-1 text-sm leading-relaxed text-ink-muted">{feedback.description}</p>

              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
                <span className="inline-flex items-center gap-1">
                  <Clock3 className="h-3.5 w-3.5" /> {feedback.estimatedTime}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" /> {feedback.participants.toLocaleString()} participated
                </span>
              </div>

              <div className="mt-5 flex items-center justify-between">
                <span className="tvx-num text-sm font-bold text-gold">+{feedback.reward} TVX</span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onSaveForLater(feedback)}
                    className="border-white/10 bg-white/[0.03] text-ink-dim hover:bg-white/[0.06] hover:text-ink"
                  >
                    <Save className="mr-1 h-4 w-4" /> Save
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => start(feedback)}
                    className="bg-gradient-to-b from-[#f2c877] to-gold-deep font-semibold text-[#241a06] hover:brightness-105"
                  >
                    <MessageSquare className="mr-1 h-4 w-4" /> Start
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default SuggestedFeedbacks
