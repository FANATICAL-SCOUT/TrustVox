"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  MessageSquare, ChevronRight, Search, Sparkles,
  ArrowLeft, RefreshCw, CheckCircle2, Filter, Ban,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  getApprovedForms,
  getSubmittedFormIdsByUser,
  subscribeToFormsUpdates,
  type FeedbackForm,
} from "@/lib/feedback-store"
import { logFlow } from "@/lib/debug-log"
import { subscribeToApprovedCompanies } from "@/lib/approved-company-store"
import { createClient } from "@/lib/supabase/client"

async function resolveCurrentUserId(): Promise<string | null> {
  const supabase = createClient()
  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? null
}

function CategoryBadge({ category }: { category: string }) {
  return (
    <span className="inline-flex rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[10px] font-medium text-ink-muted">
      {category}
    </span>
  )
}

function FormCard({
  form,
  isBlocked,
  onGiveFeedback,
}: {
  form: FeedbackForm
  isBlocked: boolean
  onGiveFeedback: (id: string) => void
}) {
  return (
    <div
      data-reveal-card
      className="group relative flex flex-col gap-4 rounded-xl border border-white/[0.07] bg-white/[0.02] p-5 transition-all duration-200 hover:-translate-y-1 hover:border-white/15"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <CategoryBadge category={form.category} />
            {isBlocked ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-destructive/30 bg-destructive/10 px-1.5 py-0.5 text-[10px] text-destructive">
                <Ban size={9} />
                Already Submitted
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-mint/25 bg-mint/10 px-1.5 py-0.5 text-[10px] text-mint">
                <CheckCircle2 size={9} />
                Live
              </span>
            )}
          </div>
          <h3 className="font-display text-base font-bold leading-snug text-ink transition-colors group-hover:text-gold">
            {form.title}
          </h3>
          {form.description && (
            <p className="mt-1 line-clamp-2 text-xs text-ink-muted">{form.description}</p>
          )}
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gold/20 bg-gradient-to-br from-gold/20 to-gold-deep/20">
          <MessageSquare size={19} className="text-gold" />
        </div>
      </div>

      {/* Meta */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
        <span className="inline-flex rounded border border-gold/25 px-1.5 py-0.5 text-gold">
          {form.clientName}
        </span>
        <span>·</span>
        <span className="font-medium text-ink-dim">{form.product}</span>
        <span>·</span>
        <span>{form.questions.length} question{form.questions.length !== 1 ? "s" : ""}</span>
        <span>·</span>
        <span className="inline-flex items-center gap-0.5">
          {form.responseCount}
          <MessageSquare size={10} className="ml-0.5" />
        </span>
        <span>·</span>
        <span className="tvx-num font-semibold text-gold">{form.rewardTokens} TVX</span>
      </div>

      {/* CTA */}
      <Button
        className={`mt-auto w-full gap-2 font-semibold ${
          isBlocked
            ? "cursor-not-allowed border border-white/10 bg-white/[0.03] text-ink-muted hover:bg-white/[0.03]"
            : "bg-gradient-to-b from-[#f2c877] to-gold-deep text-[#241a06] hover:brightness-105"
        }`}
        onClick={() => {
          if (!isBlocked) onGiveFeedback(form.id)
        }}
        disabled={isBlocked}
        title={isBlocked ? "Blocked: You already submitted this feedback." : undefined}
      >
        {isBlocked ? "Blocked · Already Submitted" : `Give Feedback · Earn ${form.rewardTokens} TVX`}
        {isBlocked ? <Ban size={16} /> : <ChevronRight size={16} />}
      </Button>
    </div>
  )
}

export default function UserFeedbacksPage() {
  const router = useRouter()
  const [forms, setForms] = useState<FeedbackForm[]>([])
  const [submittedFormIds, setSubmittedFormIds] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [showSuggestions, setShowSuggestions] = useState(false)

  const loadForms = async (reason = "manual") => {
    try {
      const approvedForms = await getApprovedForms()
      const userId = await resolveCurrentUserId()
      const submittedIds = new Set(userId ? await getSubmittedFormIdsByUser(userId) : [])
      logFlow("user-page-load-approved", {
        reason,
        count: approvedForms.length,
        userId,
        submittedCount: submittedIds.size,
        formIds: approvedForms.map((f) => f.id),
        companies: approvedForms.map((f) => ({
          id: f.id,
          companyId: f.companyId,
          clientName: f.clientName,
          approvedAt: f.approvedAt,
        })),
      })
      setForms(approvedForms)
      setSubmittedFormIds(submittedIds)
    } catch (error) {
      logFlow("user-page-load-approved-error", { reason, error: String(error) })
    }
  }

  useEffect(() => {
    void loadForms("mount")

    const unsubscribeForms = subscribeToFormsUpdates(() => {
      void loadForms("forms-updated")
    })
    const unsubscribeCompanies = subscribeToApprovedCompanies(() => {
      void loadForms("companies-updated")
    })

    const handleFocus = () => void loadForms("window-focus")
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void loadForms("tab-visible")
      }
    }

    window.addEventListener("focus", handleFocus)
    document.addEventListener("visibilitychange", handleVisibilityChange)

    const polling = window.setInterval(() => void loadForms("polling"), 5000)

    return () => {
      unsubscribeForms()
      unsubscribeCompanies()
      window.removeEventListener("focus", handleFocus)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.clearInterval(polling)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search)
    }, 220)

    return () => window.clearTimeout(timer)
  }, [search])

  const categories = ["all", ...Array.from(new Set(forms.map((f) => f.category)))]

  const normalizedSearch = debouncedSearch.trim().toLowerCase()

  const searchSuggestions = useMemo(() => {
    if (!normalizedSearch) return []

    const ranked = forms
      .filter((form) => {
        const target = [form.title, form.product, form.category, form.description, form.clientName]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
        return target.includes(normalizedSearch)
      })
      .map((form) => {
        const product = (form.product || "").toLowerCase()
        const company = (form.clientName || "").toLowerCase()
        const title = (form.title || "").toLowerCase()
        const category = (form.category || "").toLowerCase()
        let rank = 3
        if (product.startsWith(normalizedSearch)) rank = 0
        else if (company.startsWith(normalizedSearch)) rank = 1
        else if (title.startsWith(normalizedSearch)) rank = 2
        else if (category.startsWith(normalizedSearch)) rank = 3

        return { form, rank }
      })
      .sort((a, b) => {
        if (a.rank !== b.rank) return a.rank - b.rank
        const productCompare = (a.form.product || "").localeCompare(b.form.product || "")
        if (productCompare !== 0) return productCompare
        return (a.form.title || "").localeCompare(b.form.title || "")
      })
      .slice(0, 8)

    return ranked
  }, [forms, normalizedSearch])

  const filtered = forms.filter((f) => {
    const matchSearch =
      !normalizedSearch ||
      f.title.toLowerCase().includes(normalizedSearch) ||
      f.product.toLowerCase().includes(normalizedSearch) ||
      f.category.toLowerCase().includes(normalizedSearch) ||
      (f.clientName || "").toLowerCase().includes(normalizedSearch) ||
      (f.description || "").toLowerCase().includes(normalizedSearch)
    const matchCat = categoryFilter === "all" || f.category === categoryFilter
    return matchSearch && matchCat
  })

  useEffect(() => {
    logFlow("user-page-render", {
      totalApproved: forms.length,
      filteredCount: filtered.length,
      search: normalizedSearch,
      categoryFilter,
      filteredIds: filtered.map((form) => form.id),
    })
  }, [categoryFilter, filtered, forms.length, normalizedSearch])

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <button
            onClick={() => router.push("/user/dashboard")}
            className="flex items-center gap-2 text-sm text-ink-dim transition-colors hover:text-gold"
          >
            <ArrowLeft size={16} />
            Dashboard
          </button>
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-gold" />
            <span className="text-sm font-semibold text-ink">Give Feedback</span>
          </div>
          <button
            onClick={() => loadForms("manual-refresh")}
            className="p-2 text-ink-muted transition-colors hover:text-gold"
            aria-label="Refresh"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Title */}
        <div data-reveal-block className="text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-gold/20 bg-gold/[0.08] px-4 py-1.5 text-sm font-semibold text-gold">
            <MessageSquare className="h-4 w-4" /> Discover
          </p>
          <h1 className="mt-4 font-display text-4xl font-extrabold tracking-[-0.03em] text-ink">Share your feedback</h1>
          <p className="mx-auto mt-3 max-w-xl text-ink-dim">
            Help companies improve by sharing honest feedback. Your voice matters.
          </p>
        </div>

        {/* Search + filter */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setShowSuggestions(true)
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => {
                window.setTimeout(() => setShowSuggestions(false), 120)
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && searchSuggestions.length > 0) {
                  const firstOpen = searchSuggestions.find(({ form }) => !submittedFormIds.has(form.id))
                  if (firstOpen) {
                    router.push(`/user/feedback/${firstOpen.form.id}`)
                  }
                }
              }}
              placeholder="Search forms…"
              className="border-white/[0.08] bg-white/[0.03] pl-9 text-ink placeholder:text-ink-muted focus-visible:border-gold/50 focus-visible:ring-gold/20"
            />

            {showSuggestions && normalizedSearch && (
              <div className="absolute left-0 right-0 z-30 mt-1 overflow-hidden rounded-lg border border-white/[0.08] bg-surface/95 shadow-2xl backdrop-blur-xl">
                {searchSuggestions.length === 0 ? (
                  <div className="px-3 py-2.5 text-xs text-ink-muted">No matching feedback forms</div>
                ) : (
                  <div className="max-h-72 overflow-y-auto">
                    {searchSuggestions.map(({ form }) => (
                      <button
                        key={form.id}
                        type="button"
                        onClick={() => {
                          if (submittedFormIds.has(form.id)) return
                          setSearch(form.product || form.title)
                          setShowSuggestions(false)
                          router.push(`/user/feedback/${form.id}`)
                        }}
                        className={`w-full border-b border-white/[0.06] px-3 py-2.5 text-left transition-colors last:border-b-0 ${
                          submittedFormIds.has(form.id)
                            ? "cursor-not-allowed opacity-60"
                            : "hover:bg-white/5"
                        }`}
                        title={submittedFormIds.has(form.id) ? "Blocked: You already submitted this feedback." : undefined}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-medium text-ink">{form.product}</p>
                          <span className="shrink-0 text-[10px] text-ink-muted">{form.questions.length}Q</span>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-ink-muted">{form.title}</p>
                        <div className="mt-1.5 flex items-center gap-2">
                          <span className="inline-flex rounded border border-gold/25 px-1.5 py-0.5 text-[10px] text-gold">
                            {form.clientName}
                          </span>
                          <span className="inline-flex rounded border border-white/[0.08] px-1.5 py-0.5 text-[10px] text-ink-muted">
                            {form.category}
                          </span>
                          {submittedFormIds.has(form.id) ? (
                            <span className="inline-flex items-center rounded border border-destructive/30 px-1.5 py-0.5 text-[10px] text-destructive">
                              <Ban size={10} className="mr-1" />
                              Blocked
                            </span>
                          ) : null}
                          <span className="truncate text-[10px] text-ink-muted">Form ID: {form.id}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 overflow-x-auto">
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
                {cat === "all" ? "All Categories" : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-6 flex items-center gap-4 text-sm text-ink-muted">
          <span>
            <span className="font-semibold text-ink">{filtered.length}</span> form{filtered.length !== 1 ? "s" : ""} available
          </span>
          {search && (
            <button
              onClick={() => setSearch("")}
              className="text-xs text-ink-muted transition-colors hover:text-destructive"
            >
              Clear search
            </button>
          )}
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.02] py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.02]">
              <MessageSquare size={28} className="text-ink-muted" />
            </div>
            <h3 className="mb-2 text-base font-semibold text-ink-dim">No feedback forms available</h3>
            <p className="text-sm text-ink-muted">
              {search
                ? `No results for "${search}". Try a different search term.`
                : "No forms are live right now. Check back later!"}
            </p>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((form) => (
              <FormCard
                key={form.id}
                form={form}
                isBlocked={submittedFormIds.has(form.id)}
                onGiveFeedback={(id) => router.push(`/user/feedback/${id}`)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
