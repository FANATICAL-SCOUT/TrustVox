"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  MessageSquare, Search, Bookmark, BookmarkCheck, Ban, Eye, CheckCircle2,
  SlidersHorizontal, ChevronDown, Clock, X, PanelLeftClose, PanelLeftOpen,
} from "lucide-react"
import {
  getApprovedForms,
  getSubmittedFormIdsByUser,
  subscribeToFormsUpdates,
  type FeedbackForm,
  type FeedbackHandoff,
} from "@/lib/feedback-store"
import {
  getBookmarkedFormIds,
  toggleBookmark,
  subscribeToBookmarkUpdates,
} from "@/lib/bookmark-store"
import { createClient, getCachedUser } from "@/lib/supabase/client"

interface SuggestedFeedbackProps {
  handleStartFeedbackFromSuggested: (feedback: FeedbackHandoff) => void
}

type SortKey = "newest" | "high-reward" | "popular" | "ending-soon"

const SORTS: { key: SortKey; label: string }[] = [
  { key: "newest", label: "Newest first" },
  { key: "high-reward", label: "Highest reward" },
  { key: "popular", label: "Most answered" },
  { key: "ending-soon", label: "Ending soon" },
]

// Reward tiers are OR-combined: a form qualifies if it clears ANY selected floor.
const REWARD_TIERS: { key: string; label: string; min: number }[] = [
  { key: "r100", label: "100+ TVX", min: 100 },
  { key: "r250", label: "250+ TVX", min: 250 },
  { key: "r500", label: "500+ TVX", min: 500 },
]

// A form is "ending soon" if it has an auto-close date within the next 7 days.
const ENDING_SOON_WINDOW_MS = 7 * 24 * 60 * 60 * 1000

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

function isEndingSoon(form: FeedbackForm): boolean {
  if (!form.autoCloseDate) return false
  const closeAt = Date.parse(form.autoCloseDate)
  if (Number.isNaN(closeAt)) return false
  const delta = closeAt - Date.now()
  return delta > 0 && delta <= ENDING_SOON_WINDOW_MS
}

async function resolveCurrentUserId(): Promise<string | null> {
  const supabase = createClient()
  const user = await getCachedUser(supabase)
  return user?.id ?? null
}

// A collapsible dropdown section in the filter sidebar. Click the header to open
// the list of multi-select options (item 2: a real dropdown control in a left rail,
// not a top-right pill row).
function FilterSection({
  title,
  count,
  defaultOpen = true,
  children,
}: {
  title: string
  count: number
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="border-b border-white/[0.06] py-3">
      <CollapsibleTrigger className="flex w-full items-center justify-between text-left">
        <span className="flex items-center gap-2 text-sm font-semibold text-ink">
          {title}
          {count > 0 && (
            <span className="tvx-num rounded-full bg-gold/15 px-1.5 text-[10px] font-bold text-gold">{count}</span>
          )}
        </span>
        <ChevronDown
          size={15}
          className={`shrink-0 text-ink-muted transition-transform ${open ? "rotate-180" : ""}`}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2.5 space-y-1.5">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  )
}

function CheckRow({
  checked,
  onToggle,
  label,
}: {
  checked: boolean
  onToggle: () => void
  label: string
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 rounded-md px-1.5 py-1 transition-colors hover:bg-white/[0.03]">
      <Checkbox
        checked={checked}
        onCheckedChange={onToggle}
        className="h-4 w-4 border-white/20 data-[state=checked]:border-gold data-[state=checked]:bg-gold data-[state=checked]:text-[#241a06]"
      />
      <span className={`text-sm ${checked ? "text-ink" : "text-ink-dim"}`}>{label}</span>
    </label>
  )
}

const SuggestedFeedbacks = ({ handleStartFeedbackFromSuggested }: SuggestedFeedbackProps) => {
  const router = useRouter()
  const [approvedForms, setApprovedForms] = useState<FeedbackForm[]>([])
  const [submittedIds, setSubmittedIds] = useState<Set<string>>(new Set())
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")

  // Multi-select filter state (item 2c). Categories + reward tiers OR within
  // their own group; groups AND together. Sort is single-select.
  const [categoryFilters, setCategoryFilters] = useState<Set<string>>(new Set())
  const [rewardFilters, setRewardFilters] = useState<Set<string>>(new Set())
  const [availabilityFilters, setAvailabilityFilters] = useState<Set<string>>(new Set())
  const [sortKey, setSortKey] = useState<SortKey>("newest")
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  // Desktop-only: retract the filter rail to hand its width back to the results
  // grid, which then goes up to 4-per-row (item 1). Mobile uses the drawer above.
  const [desktopFiltersOpen, setDesktopFiltersOpen] = useState(true)

  const loadForms = useCallback(async () => {
    // Forms + user-id resolve in parallel; the user-scoped queries then run
    // together (was a 3-deep waterfall).
    const [forms, userId] = await Promise.all([getApprovedForms(), resolveCurrentUserId()])
    const [ids, bookmarks] = await Promise.all([
      userId ? getSubmittedFormIdsByUser(userId) : Promise.resolve<string[]>([]),
      getBookmarkedFormIds(),
    ])
    setApprovedForms(forms)
    setSubmittedIds(new Set(ids))
    setBookmarkedIds(bookmarks)
  }, [])

  useEffect(() => {
    void loadForms()
    const unsubscribeForms = subscribeToFormsUpdates(() => void loadForms())
    const unsubscribeBookmarks = subscribeToBookmarkUpdates(() => void loadForms())
    const handleFocus = () => void loadForms()
    window.addEventListener("focus", handleFocus)
    return () => {
      unsubscribeForms()
      unsubscribeBookmarks()
      window.removeEventListener("focus", handleFocus)
    }
  }, [loadForms])

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 200)
    return () => window.clearTimeout(timer)
  }, [search])

  const categories = useMemo(
    () => Array.from(new Set(approvedForms.map((f) => f.category))).sort(),
    [approvedForms],
  )

  const toggleFrom = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, value: string) =>
    setter((prev) => {
      const next = new Set(prev)
      if (next.has(value)) next.delete(value)
      else next.add(value)
      return next
    })

  const clearAllFilters = () => {
    setCategoryFilters(new Set())
    setRewardFilters(new Set())
    setAvailabilityFilters(new Set())
    setSearch("")
  }

  const activeFilterCount = categoryFilters.size + rewardFilters.size + availabilityFilters.size
  const normalizedSearch = debouncedSearch.trim().toLowerCase()

  const visible = useMemo(() => {
    const rewardMins = REWARD_TIERS.filter((t) => rewardFilters.has(t.key)).map((t) => t.min)

    const matched = approvedForms.filter((f) => {
      const matchSearch =
        !normalizedSearch ||
        [f.title, f.product, f.category, f.description, f.clientName]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch)

      const matchCat = categoryFilters.size === 0 || categoryFilters.has(f.category)
      const matchReward = rewardMins.length === 0 || rewardMins.some((min) => f.rewardTokens >= min)

      let matchAvailability = true
      if (availabilityFilters.size > 0) {
        const isOpen = !submittedIds.has(f.id)
        const ending = isEndingSoon(f)
        // OR within the availability group.
        matchAvailability =
          (availabilityFilters.has("open") && isOpen) ||
          (availabilityFilters.has("ending-soon") && ending)
      }

      return matchSearch && matchCat && matchReward && matchAvailability
    })

    const sorted = [...matched].sort((a, b) => {
      if (sortKey === "high-reward") return b.rewardTokens - a.rewardTokens
      if (sortKey === "popular") return b.responseCount - a.responseCount
      if (sortKey === "ending-soon") {
        const aClose = a.autoCloseDate ? Date.parse(a.autoCloseDate) : Number.POSITIVE_INFINITY
        const bClose = b.autoCloseDate ? Date.parse(b.autoCloseDate) : Number.POSITIVE_INFINITY
        return aClose - bClose
      }
      return Date.parse(b.approvedAt || "") - Date.parse(a.approvedAt || "")
    })

    // Completed surveys sink to the bottom so open opportunities lead.
    return sorted.sort((a, b) => Number(submittedIds.has(a.id)) - Number(submittedIds.has(b.id)))
  }, [approvedForms, normalizedSearch, categoryFilters, rewardFilters, availabilityFilters, sortKey, submittedIds])

  const openForm = (formId: string) => router.push(`/user/feedback/${formId}`)

  const handleBookmark = async (formId: string) => {
    const currentlyBookmarked = bookmarkedIds.has(formId)
    // Optimistic — Realtime + focus reload reconcile if the write fails.
    setBookmarkedIds((prev) => {
      const next = new Set(prev)
      if (currentlyBookmarked) next.delete(formId)
      else next.add(formId)
      return next
    })
    try {
      await toggleBookmark(formId, currentlyBookmarked)
    } catch {
      // revert on failure
      setBookmarkedIds((prev) => {
        const next = new Set(prev)
        if (currentlyBookmarked) next.add(formId)
        else next.delete(formId)
        return next
      })
    }
  }

  // ── Filter rail (shared between the desktop sidebar and the mobile drawer) ──
  const filterRail = (
    <div className="space-y-1">
      <FilterSection title="Sort by" count={0}>
        {SORTS.map((s) => (
          <label
            key={s.key}
            className="flex cursor-pointer items-center gap-2.5 rounded-md px-1.5 py-1 transition-colors hover:bg-white/[0.03]"
          >
            <span
              className={`grid h-4 w-4 place-items-center rounded-full border ${
                sortKey === s.key ? "border-gold" : "border-white/25"
              }`}
            >
              {sortKey === s.key && <span className="h-2 w-2 rounded-full bg-gold" />}
            </span>
            <input
              type="radio"
              name="suggested-sort"
              className="sr-only"
              checked={sortKey === s.key}
              onChange={() => setSortKey(s.key)}
            />
            <span className={`text-sm ${sortKey === s.key ? "text-ink" : "text-ink-dim"}`}>{s.label}</span>
          </label>
        ))}
      </FilterSection>

      <FilterSection title="Availability" count={availabilityFilters.size}>
        <CheckRow
          checked={availabilityFilters.has("open")}
          onToggle={() => toggleFrom(setAvailabilityFilters, "open")}
          label="Open (not yet done)"
        />
        <CheckRow
          checked={availabilityFilters.has("ending-soon")}
          onToggle={() => toggleFrom(setAvailabilityFilters, "ending-soon")}
          label="Ending soon (≤ 7 days)"
        />
      </FilterSection>

      <FilterSection title="Reward" count={rewardFilters.size}>
        {REWARD_TIERS.map((t) => (
          <CheckRow
            key={t.key}
            checked={rewardFilters.has(t.key)}
            onToggle={() => toggleFrom(setRewardFilters, t.key)}
            label={t.label}
          />
        ))}
      </FilterSection>

      <FilterSection title="Category" count={categoryFilters.size} defaultOpen={categories.length <= 8}>
        {categories.length === 0 ? (
          <p className="px-1.5 text-xs text-ink-muted">No categories yet.</p>
        ) : (
          categories.map((cat) => (
            <CheckRow
              key={cat}
              checked={categoryFilters.has(cat)}
              onToggle={() => toggleFrom(setCategoryFilters, cat)}
              label={cat}
            />
          ))
        )}
      </FilterSection>

      {activeFilterCount > 0 && (
        <button
          onClick={clearAllFilters}
          className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-gold underline-offset-2 hover:underline"
        >
          <X size={12} /> Clear all filters
        </button>
      )}
    </div>
  )

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Hero — a real tagline, not a placeholder chip (item 3) */}
      <div data-reveal-block className="text-center">
        <h1 className="mx-auto max-w-3xl text-balance font-display text-4xl font-extrabold tracking-[-0.03em] text-ink sm:text-5xl">
          Your voice, <span className="tvx-text-gold">rewarded</span>.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-ink-dim">
          Every live opportunity on TrustVox — pick one, share your honest take, and grow your balance.
        </p>
      </div>

      {/* Search */}
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

        {/* Mobile: open the filter rail as a togglable panel */}
        <Button
          variant="outline"
          onClick={() => setMobileFiltersOpen((v) => !v)}
          className="justify-center border-white/10 bg-white/[0.03] text-ink-dim hover:bg-white/[0.06] hover:text-ink lg:hidden"
        >
          <SlidersHorizontal size={15} className="mr-1.5" />
          Filters
          {activeFilterCount > 0 && (
            <span className="tvx-num ml-1.5 rounded-full bg-gold/15 px-1.5 text-[10px] font-bold text-gold">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </div>

      {/* Two-column layout: filter sidebar (left) + results (right).
          The sidebar retracts on desktop (item 1) so results reclaim its width
          and grow to 4-per-row; when it's shown they stay capped at 3. */}
      <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* Sidebar — collapsible on mobile (drawer) and on desktop (retract) */}
        <aside
          className={`${mobileFiltersOpen ? "block" : "hidden"} ${
            desktopFiltersOpen ? "lg:block" : "lg:hidden"
          } lg:w-64 lg:flex-none`}
        >
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 lg:sticky lg:top-20">
            <div className="mb-1 flex items-center justify-between gap-2 text-sm font-bold text-ink">
              <span className="flex items-center gap-2">
                <SlidersHorizontal size={15} className="text-gold" /> Filters
              </span>
              {/* Desktop-only retract control */}
              <button
                onClick={() => setDesktopFiltersOpen(false)}
                aria-label="Hide filters"
                className="hidden rounded-md p-1 text-ink-muted transition-colors hover:bg-white/5 hover:text-ink lg:inline-flex"
              >
                <PanelLeftClose size={16} />
              </button>
            </div>
            {filterRail}
          </div>
        </aside>

        {/* Results */}
        <div className="min-w-0 flex-1">
          <div className="mb-4 flex items-center gap-3 text-sm text-ink-muted">
            {/* Desktop-only "show filters" button, visible only while retracted */}
            {!desktopFiltersOpen && (
              <button
                onClick={() => setDesktopFiltersOpen(true)}
                className="hidden shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-ink-dim transition-colors hover:bg-white/[0.06] hover:text-ink lg:inline-flex"
              >
                <PanelLeftOpen size={14} /> Filters
                {activeFilterCount > 0 && (
                  <span className="tvx-num rounded-full bg-gold/15 px-1.5 text-[10px] font-bold text-gold">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            )}
            <span>
              <span className="font-semibold text-ink">{visible.length}</span> opportunit
              {visible.length === 1 ? "y" : "ies"}
              {activeFilterCount > 0 || normalizedSearch ? " match your filters" : ""}
            </span>
          </div>

          {visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.02] py-20 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.02]">
                <MessageSquare size={28} className="text-ink-muted" />
              </div>
              <h3 className="mb-2 text-base font-semibold text-ink-dim">No results found</h3>
              <p className="max-w-sm text-sm text-ink-muted">
                {normalizedSearch || activeFilterCount > 0
                  ? "Nothing matches your search or filters. Try loosening them."
                  : "No opportunities are live right now. Check back later."}
              </p>
              {(normalizedSearch || activeFilterCount > 0) && (
                <button
                  onClick={clearAllFilters}
                  className="mt-4 text-xs font-medium text-gold underline-offset-2 hover:underline"
                >
                  Reset search &amp; filters
                </button>
              )}
            </div>
          ) : (
            <div
              className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${
                desktopFiltersOpen ? "xl:grid-cols-3" : "lg:grid-cols-3 xl:grid-cols-4"
              }`}
            >
              {visible.map((form) => {
                const isSubmitted = submittedIds.has(form.id)
                const isBookmarked = bookmarkedIds.has(form.id)
                const ending = isEndingSoon(form)
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
                      {ending && !isSubmitted ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-gold/25 bg-gold/10 px-2 py-0.5 text-[11px] text-gold">
                          <Clock size={11} /> Ending soon
                        </span>
                      ) : null}
                      {isSubmitted ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-mint/25 bg-mint/10 px-2 py-0.5 text-[11px] text-mint">
                          <CheckCircle2 size={11} /> Completed
                        </span>
                      ) : null}
                    </div>

                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-display text-lg font-bold text-ink">{form.product}</h3>
                      {!isSubmitted && (
                        <button
                          onClick={() => void handleBookmark(form.id)}
                          aria-label={isBookmarked ? "Remove bookmark" : "Bookmark for later"}
                          aria-pressed={isBookmarked}
                          className={`shrink-0 rounded-md p-1.5 transition-colors ${
                            isBookmarked
                              ? "text-gold hover:bg-gold/10"
                              : "text-ink-muted hover:bg-white/5 hover:text-ink"
                          }`}
                        >
                          {isBookmarked ? <BookmarkCheck size={17} /> : <Bookmark size={17} />}
                        </button>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm font-medium text-ink-muted">{form.clientName}</p>

                    <p className="mt-3 line-clamp-3 flex-1 text-sm leading-relaxed text-ink-muted">
                      {form.description || `Share your feedback on ${form.product}.`}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
                      <span className="inline-flex items-center gap-1">
                        <MessageSquare className="h-3.5 w-3.5" /> {form.questions.length} question
                        {form.questions.length !== 1 ? "s" : ""}
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
                          <Button
                            size="sm"
                            onClick={() => handleStartFeedbackFromSuggested(toHandoff(form))}
                            className="bg-gradient-to-b from-[#f2c877] to-gold-deep font-semibold text-[#241a06] hover:brightness-105"
                          >
                            <MessageSquare className="mr-1 h-4 w-4" /> Start
                          </Button>
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
      </div>
    </div>
  )
}

export default SuggestedFeedbacks
