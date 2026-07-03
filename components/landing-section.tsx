"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { MessageSquare, Star, Save, Coins, Trophy, Flame, Clock3, ArrowRight } from "lucide-react"
import SearchWithAutocomplete from "./search-with-autocomplete"
import { getApprovedForms, subscribeToFormsUpdates, type FeedbackForm } from "@/lib/feedback-store"

interface LandingSectionProps {
  handleStartFeedbackFromSuggested: (feedbackData: any) => void
  setSelectedCompanyForModal: (company: any) => void
  setIsCompanyModalOpen: (isOpen: boolean) => void
  onSaveForLater: (feedbackData: any) => void
  dailyFeedbackRemaining: number
  dailyFeedbackLimit: number
  completedToday: number
}

interface FeedbackOpportunity {
  id: string
  formId: string
  company: string
  product: string
  category: string
  rating: number
  reward: number
  totalFeedbacks: number
  description: string
  tags: string[]
}

// Sample opportunities so the dashboard reads as populated in the demo.
// When real approved forms exist they take over the same slots.
const RECOMMENDED_SEED: FeedbackOpportunity[] = [
  { id: "rec1", formId: "", company: "Tech Innovations Inc.", product: "Quantum Leap Software", category: "Productivity", rating: 4.7, reward: 42, totalFeedbacks: 1200, description: "Users are loving the new AI features. Share your thoughts on its impact on your workflow.", tags: ["High reward", "Ending soon"] },
  { id: "rec2", formId: "", company: "Global Foods Co.", product: "Spicy Mango Salsa", category: "Food & Beverage", rating: 4.5, reward: 28, totalFeedbacks: 850, description: "The new salsa is a hit. Tell us your serving ideas and how the flavour lands.", tags: ["Limited slots", "Popular"] },
  { id: "rec3", formId: "", company: "Urban Style Apparel", product: "Sustainable Denim Line", category: "Fashion", rating: 4.8, reward: 36, totalFeedbacks: 980, description: "Review our eco-friendly denim. How does it feel, and what do you think of the designs?", tags: ["High reward", "Popular"] },
]

const CONTINUE_SEED: FeedbackOpportunity[] = [
  { id: "cont1", formId: "", company: "Health & Wellness Hub", product: "Smart Fitness Tracker", category: "Wearable Tech", rating: 4.0, reward: 20, totalFeedbacks: 410, description: "Resume your draft and finish this feedback in about 3 minutes.", tags: ["Draft", "Limited slots"] },
  { id: "cont2", formId: "", company: "Travel Adventures Ltd.", product: "VR Travel Experience", category: "Entertainment", rating: 4.2, reward: 33, totalFeedbacks: 267, description: "You viewed this recently. Finish it today to unlock a bonus reward.", tags: ["Recently viewed", "Ending soon"] },
]

const TRENDING_SEED: FeedbackOpportunity[] = [
  { id: "trend1", formId: "", company: "FinEdge Payments", product: "Neo Wallet App", category: "Fintech", rating: 4.6, reward: 24, totalFeedbacks: 1460, description: "Help evaluate onboarding speed and card management flows.", tags: ["Popular"] },
  { id: "trend2", formId: "", company: "HomeGrid", product: "Smart Air Purifier", category: "Home Tech", rating: 4.4, reward: 18, totalFeedbacks: 1080, description: "Give quick feedback on setup and app controls.", tags: ["Limited slots"] },
]

function mergeWithForms(seed: FeedbackOpportunity[], forms: FeedbackForm[], offset = 0): FeedbackOpportunity[] {
  return seed.map((entry, index) => {
    const form = forms[index + offset]
    if (!form) return entry
    return {
      ...entry,
      formId: form.id,
      company: form.clientName,
      product: form.product,
      category: form.category,
      reward: form.rewardTokens,
      description: form.description || entry.description,
      totalFeedbacks: form.responseCount,
    }
  })
}

const STATS = [
  { label: "Feedbacks given", value: "18", icon: MessageSquare },
  { label: "Tokens earned", value: "1,240", suffix: "TVX", icon: Coins },
  { label: "User rank", value: "Top 12%", icon: Trophy },
  { label: "Activity streak", value: "7", suffix: "days", icon: Flame },
]

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
    try {
      const currentUserRaw = localStorage.getItem("currentUser")
      if (!currentUserRaw) return
      const currentUser = JSON.parse(currentUserRaw)
      const resolvedName = (currentUser?.name || "there").toString().trim()
      if (resolvedName) setUserName(resolvedName)
    } catch {
      // keep default
    }
  }, [])

  // Staggered offsets so Recommended/Continue/Trending never merge in the same
  // approved form twice across the three dashboard-home lists.
  const recommended = useMemo(() => mergeWithForms(RECOMMENDED_SEED, approvedForms, 0), [approvedForms])
  const continueItems = useMemo(
    () => mergeWithForms(CONTINUE_SEED, approvedForms, RECOMMENDED_SEED.length),
    [approvedForms],
  )
  const trending = useMemo(
    () => mergeWithForms(TRENDING_SEED, approvedForms, RECOMMENDED_SEED.length + CONTINUE_SEED.length),
    [approvedForms],
  )

  const handleSearchSelect = (item: any) => {
    const selectedId = item?.id
    if (typeof selectedId === "string" && selectedId.length > 0) {
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

  const start = (feedback: FeedbackOpportunity) => {
    if (feedback.formId) {
      handleStartFeedbackFromSuggested(feedback)
    } else {
      router.push("/user/feedbacks")
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Hero */}
        <div data-reveal-block className="py-8 text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-gold/20 bg-gold/[0.08] px-4 py-1.5 text-sm text-gold">
            <Clock3 className="h-4 w-4" />
            {recommended.length} new opportunities waiting
          </p>
          <h1 className="mx-auto mt-5 max-w-3xl text-balance font-display text-4xl font-extrabold tracking-[-0.03em] sm:text-5xl">
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
            <SearchWithAutocomplete onSelect={handleSearchSelect} />
          </div>
        </div>

        {/* Stats */}
        <div className="mb-14 grid grid-cols-2 gap-3 xl:grid-cols-4">
          {STATS.map((stat) => (
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
              <p className="mt-1.5 text-ink-muted">Based on your activity and saved interests</p>
            </div>
            <Button variant="ghost" onClick={() => router.push("/user/feedbacks")} className="text-ink-dim hover:text-ink">
              View all <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {recommended.map((f) => (
              <div key={f.id} data-reveal-card className="group flex flex-col rounded-xl border border-white/[0.07] bg-white/[0.02] p-5 transition-all duration-200 hover:-translate-y-1 hover:border-white/15">
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {f.tags.map((tag) => <Pill key={tag}>{tag}</Pill>)}
                </div>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-display text-lg font-bold text-ink">{f.product}</h3>
                  <div className="flex flex-none items-center gap-1 text-sm text-ink-dim">
                    <Star className="h-4 w-4 fill-gold text-gold" />
                    <span className="tvx-num">{f.rating.toFixed(1)}</span>
                  </div>
                </div>
                <p className="mt-0.5 text-sm font-medium text-ink-muted">{f.company}</p>
                <p className="mt-3 line-clamp-3 flex-1 text-sm leading-relaxed text-ink-muted">{f.description}</p>
                <div className="mt-5 flex items-center justify-between">
                  <span className="tvx-num text-sm font-bold text-gold">+{f.reward} TVX</span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => onSaveForLater(f)} className="border-white/10 bg-white/[0.03] text-ink-dim hover:bg-white/[0.06] hover:text-ink">
                      <Save className="mr-1 h-4 w-4" /> Save
                    </Button>
                    <Button size="sm" onClick={() => start(f)} className="bg-gradient-to-b from-[#f2c877] to-gold-deep font-semibold text-[#241a06] hover:brightness-105">
                      Start now
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Continue */}
        <section className="mb-14">
          <h2 data-reveal-block className="font-display text-2xl font-extrabold tracking-[-0.02em] text-ink sm:text-3xl">Continue where you left off</h2>
          <p className="mt-1.5 text-ink-muted">Pick up recent drafts and viewed items in one tap</p>
          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {continueItems.map((item) => (
              <div key={item.id} data-reveal-card className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5 transition-all duration-200 hover:-translate-y-1 hover:border-white/15">
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {item.tags.map((tag) => <Pill key={tag}>{tag}</Pill>)}
                </div>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-display text-lg font-bold text-ink">{item.product}</h3>
                    <p className="mt-0.5 text-sm text-ink-muted">{item.company}</p>
                  </div>
                  <span className="tvx-num flex-none text-sm font-bold text-gold">+{item.reward} TVX</span>
                </div>
                <p className="mt-3 text-sm text-ink-muted">{item.description}</p>
                <div className="mt-5 flex justify-end">
                  <Button size="sm" onClick={() => start(item)} className="bg-gradient-to-b from-[#f2c877] to-gold-deep font-semibold text-[#241a06] hover:brightness-105">
                    Resume
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Trending */}
        <section className="mb-14">
          <h2 data-reveal-block className="font-display text-xl font-extrabold tracking-[-0.02em] text-ink sm:text-2xl">Trending right now</h2>
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            {trending.map((item) => (
              <div key={item.id} data-reveal-card className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.07] bg-white/[0.02] p-5 transition-all duration-200 hover:border-white/15">
                <div>
                  <p className="font-display text-base font-bold text-ink">{item.product}</p>
                  <p className="mt-0.5 text-sm text-ink-muted">{item.company}</p>
                  <div className="mt-2 flex gap-1.5">
                    {item.tags.map((tag) => <Pill key={tag}>{tag}</Pill>)}
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => start(item)} className="flex-none border-white/10 bg-white/[0.03] text-ink hover:bg-white/[0.06]">
                  Open
                </Button>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div data-reveal-block className="tvx-card-gold rounded-2xl border border-white/[0.08] bg-gradient-to-b from-surface to-[#0e1017] p-10 text-center">
          <h2 className="text-balance font-display text-3xl font-extrabold tracking-[-0.03em] text-ink sm:text-4xl">Earn more tokens today</h2>
          <p className="mx-auto mt-4 max-w-2xl text-ink-dim">
            Complete two feedbacks from your recommended list and unlock your next reward boost.
          </p>
          <Button
            onClick={() => router.push("/user/feedbacks")}
            size="lg"
            className="mt-7 rounded-xl bg-gradient-to-b from-[#f2c877] to-gold-deep px-8 font-semibold text-[#241a06] shadow-[0_10px_26px_-12px_rgba(235,188,107,0.5)] transition-all hover:-translate-y-0.5 hover:brightness-105"
          >
            Start earning now
          </Button>
        </div>
      </div>
    </div>
  )
}
