"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Lightbulb, Save, MessageSquare, Search, Filter, Ban, Eye, CheckCircle2, Coins, ArrowUpDown,
} from "lucide-react"
import {
  getApprovedForms,
  getSubmittedFormIdsByUser,
  subscribeToFormsUpdates,
  type FeedbackForm,
  type FeedbackHandoff,
} from "@/lib/feedback-store"
import { getTVXWalletState, subscribeToTVXWalletUpdates } from "@/lib/tvx-wallet"
import { createClient } from "@/lib/supabase/client"

interface SuggestedFeedbackProps {
  handleStartFeedbackFromSuggested: (feedback: FeedbackHandoff) => void
  onSaveForLater: (feedback: FeedbackHandoff) => void
}

type SortKey = "newest" | "high-reward" | "popular"

const SORTS: { key: SortKey; label: string }[] = [
  { key: "newest", label: "Newest" },
  { key: "high-reward", label: "Highest reward" },
  { key: "popular", label: "Most answered" },
]

const REWARD_GOALS = [100, 200, 300, 500]

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
  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? null
}

const SuggestedFeedbacks = ({ handleStartFeedbackFromSuggested, onSaveForLater }: SuggestedFeedbackProps) => {
  const router = useRouter()
  const [approvedForms, setApprovedForms] = useState<FeedbackForm[]>([])
  const [submittedIds, setSubmittedIds] = useState<Set<string>>(new Set())
  const [walletBalance, setWalletBalance] = useState(0)
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [sortKey, setSortKey] = useState<SortKey>("newest")

  useEffect(() => {
    let active = true
    const loadForms = async () => {
      const forms = await getApprovedForms()
      const userId = await resolveCurrentUserId()
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
    const syncWallet = () => void getTVXWalletState().then((wallet) => setWalletBalance(wallet.balance))
    syncWallet()
    const unsubscribe = subscribeToTVXWalletUpdates(syncWallet)
    window.addEventListener("focus", syncWallet)
    return () => {
      unsubscribe()
      window.removeEventListener("focus", syncWallet)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 200)
    return () => window.clearTimeout(timer)
  }, [search])

  const categories = useMemo(
    () => ["all", ...Array.from(new Set(approvedForms.map((f) => f.category)))],
    [approvedForms],
  )

  const normalizedSearch = debouncedSearch.trim().toLowerCase()

  const visible = useMemo(() => {
    const matched = approvedForms.filter((f) => {
      const matchSearch =
        !normalizedSearch ||
        [f.title, f.product, f.category, f.description, f.clientName]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch)
      const matchCat = categoryFilter === "all" || f.category === categoryFilter
      return matchSearch && matchCat
    })

    const sorted = [...matched].sort((a, b) => {
      if (sortKey === "high-reward") return b.rewardTokens - a.rewardTokens
      if (sortKey === "popular") return b.responseCount - a.responseCount
      return Date.parse(b.approvedAt || "") - Date.parse(a.approvedAt || "")
    })

    // Completed surveys sink to the bottom so open opportunities lead.
    return sorted.sort((a, b) => Number(submittedIds.has(a.id)) - Number(submittedIds.has(b.id)))
  }, [approvedForms, normalizedSearch, categoryFilter, sortKey, submittedIds])

  const nextGoal = REWARD_GOALS.find((goal) => goal > walletBalance)
  const progressMessage = nextGoal
    ? `${(nextGoal - walletBalance).toLocaleString()} TVX to your next reward`
    : "You have enough TVX to redeem now"

  const openForm = (formId: string) => router.push(`/user/feedback/${formId}`)

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div data-reveal-block className="text-center">
        <p className="inline-flex items-center gap-2 rounded-full border border-gold/20 bg-gold/[0.08] px-4 py-1.5 text-sm font-semibold text-gold">
          <Lightbulb className="h-4 w-4" /> Suggested for U
        </p>
        <h1 className="mt-4 font-display text-4xl font-extrabold tracking-[-0.03em] text-ink">Browse feedback opportunities</h1>
        <p className="mx-auto mt-3 max-w-xl text-ink-dim">Every live opportunity on the platform. Share your honest feedback and earn TVX.</p>
        <span className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-mint/25 bg-mint/10 px-3 py-1 text-xs font-semibold text-mint">
          <Coins className="h-3.5 w-3.5" /> {progressMessage}
        </span>
      </div>

      {/* Search + category filter + sort */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products, companies, or categories…"
            className="border-white/[0.08] bg-white/[0.03] pl-9 text-ink placeholder:text-ink-muted focus-visible:border-gold/50 focus-visible:ring-gold/20"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-muted transition-colors hover:text-ink"
            >
              Clear
            </button>
          )}
        </div>

        {/* Sort — top-right, single control (Session 4 expands to multi-criteria) */}
        <div className="flex items-center gap-2">
          <ArrowUpDown size={14} className="shrink-0 text-ink-muted" />
          <div className="flex items-center gap-1.5">
            {SORTS.map((s) => (
              <button
                key={s.key}
                onClick={() => setSortKey(s.key)}
                aria-pressed={sortKey === s.key}
                className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 ${
                  sortKey === s.key
                    ? "border-gold/40 bg-gold/10 text-gold"
                    : "border-white/[0.08] bg-white/[0.03] text-ink-dim hover:border-white/15 hover:text-ink"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Category filter row */}
      <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
        <Filter size={14} className="shrink-0 text-ink-muted" />
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            aria-pressed={categoryFilter === cat}
            className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 ${
              categoryFilter === cat
                ? "border-gold/40 bg-gold/10 text-gold"
                : "border-white/[0.08] bg-white/[0.03] text-ink-dim hover:border-white/15 hover:text-ink"
            }`}
          >
            {cat === "all" ? "All categories" : cat}
          </button>
        ))}
      </div>

      {/* Count */}
      <div className="mt-5 text-sm text-ink-muted">
        <span className="font-semibold text-ink">{visible.length}</span> opportunit{visible.length === 1 ? "y" : "ies"}
      </div>

      {/* Cards */}
      {visible.length === 0 ? (
        <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.02] py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.02]">
            <MessageSquare size={28} className="text-ink-muted" />
          </div>
          <h3 className="mb-2 text-base font-semibold text-ink-dim">No results found</h3>
          <p className="text-sm text-ink-muted">
            {normalizedSearch || categoryFilter !== "all"
              ? "Nothing matches your search or filter. Try different terms."
              : "No opportunities are live right now. Check back later."}
          </p>
          {(normalizedSearch || categoryFilter !== "all") && (
            <button
              onClick={() => {
                setSearch("")
                setCategoryFilter("all")
              }}
              className="mt-4 text-xs font-medium text-gold underline-offset-2 hover:underline"
            >
              Reset search &amp; filters
            </button>
          )}
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {visible.map((form) => {
            const isSubmitted = submittedIds.has(form.id)
            return (
              <div
                key={form.id}
                data-reveal-card
                className="group flex flex-col rounded-xl border border-white/[0.07] bg-white/[0.02] p-5 transition-all duration-200 hover:-translate-y-1 hover:border-white/15"
              >
                <div className="mb-3 flex flex-wrap gap-1.5">
                  <span className="inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-0.5 text-[11px] text-ink-muted">
                    {form.category}
                  </span>
                  {isSubmitted ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-mint/25 bg-mint/10 px-2 py-0.5 text-[11px] text-mint">
                      <CheckCircle2 size={11} /> Completed
                    </span>
                  ) : null}
                </div>

                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-display text-lg font-bold text-ink">{form.product}</h3>
                </div>
                <p className="mt-0.5 text-sm font-medium text-ink-muted">{form.clientName}</p>

                <p className="mt-3 line-clamp-3 flex-1 text-sm leading-relaxed text-ink-muted">
                  {form.description || `Share your feedback on ${form.product}.`}
                </p>

                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
                  <span className="inline-flex items-center gap-1">
                    <MessageSquare className="h-3.5 w-3.5" /> {form.questions.length} question{form.questions.length !== 1 ? "s" : ""}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    {form.responseCount} response{form.responseCount !== 1 ? "s" : ""}
                  </span>
                </div>

                <div className="mt-5 flex items-center justify-between">
                  <span className="tvx-num text-sm font-bold text-gold">+{form.rewardTokens} TVX</span>
                  <div className="flex gap-2">
                    {isSubmitted ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openForm(form.id)}
                        className="border-white/10 bg-white/[0.03] text-ink-dim hover:bg-white/[0.06] hover:text-ink"
                      >
                        <Eye className="mr-1 h-4 w-4" /> View
                      </Button>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onSaveForLater(toHandoff(form))}
                          className="border-white/10 bg-white/[0.03] text-ink-dim hover:bg-white/[0.06] hover:text-ink"
                        >
                          <Save className="mr-1 h-4 w-4" /> Bookmark
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleStartFeedbackFromSuggested(toHandoff(form))}
                          className="bg-gradient-to-b from-[#f2c877] to-gold-deep font-semibold text-[#241a06] hover:brightness-105"
                        >
                          <MessageSquare className="mr-1 h-4 w-4" /> Start
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {isSubmitted ? (
                  <p className="mt-3 inline-flex items-center gap-1 text-[11px] text-ink-muted">
                    <Ban size={11} /> Already submitted — read-only
                  </p>
                ) : null}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default SuggestedFeedbacks
