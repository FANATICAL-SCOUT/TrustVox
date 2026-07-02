"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  MessageSquare, ChevronRight, Search, Sparkles,
  ArrowLeft, RefreshCw, CheckCircle2, Filter, Ban,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  getApprovedForms,
  getSubmittedFormIdsByUser,
  subscribeToFormsUpdates,
  type FeedbackForm,
} from "@/lib/feedback-store"
import { subscribeToApprovedCompanies } from "@/lib/approved-company-store"

function resolveCurrentUserId() {
  if (typeof window === "undefined") return "anonymous"

  try {
    const currentUserRaw = localStorage.getItem("currentUser")
    if (currentUserRaw) {
      const parsed = JSON.parse(currentUserRaw) as { email?: string; name?: string }
      const fromCurrentUser = String(parsed.email || parsed.name || "").trim().toLowerCase()
      if (fromCurrentUser) return fromCurrentUser
    }

    const userEmail = String(localStorage.getItem("userEmail") || "").trim().toLowerCase()
    if (userEmail) return userEmail
  } catch {
    // Fall through to anonymous identifier.
  }

  return "anonymous"
}

function CategoryBadge({ category }: { category: string }) {
  return (
    <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#21262D] border border-[#30363D] text-[#8B949E]">
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
    <div className="group relative rounded-2xl border border-[#30363D] bg-[#161B22] p-5 hover:border-[#2DD4BF]/40 transition-all duration-200 hover:shadow-[0_0_24px_#2DD4BF08] flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <CategoryBadge category={form.category} />
            {isBlocked ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] bg-[#F87171]/10 border border-[#F87171]/30 text-[#FCA5A5]">
                <Ban size={9} />
                Already Submitted
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] bg-[#34D399]/10 border border-[#34D399]/30 text-[#34D399]">
                <CheckCircle2 size={9} />
                Live
              </span>
            )}
          </div>
          <h3 className="text-base font-semibold text-[#F0F6FC] group-hover:text-[#2DD4BF] transition-colors leading-snug">
            {form.title}
          </h3>
          {form.description && (
            <p className="text-xs text-[#8B949E] mt-1 line-clamp-2">{form.description}</p>
          )}
        </div>
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#2DD4BF]/20 to-[#A78BFA]/20 border border-[#2DD4BF]/20 flex items-center justify-center shrink-0">
          <MessageSquare size={20} className="text-[#2DD4BF]" />
        </div>
      </div>

      {/* Meta */}
      <div className="flex items-center gap-3 text-xs text-[#484F58]">
        <span className="inline-flex px-1.5 py-0.5 rounded border border-[#2DD4BF]/30 text-[#2DD4BF]">
          {form.clientName}
        </span>
        <span>·</span>
        <span className="flex items-center gap-1 text-[#8B949E] font-medium">
          {form.product}
        </span>
        <span>·</span>
        <span>{form.questions.length} question{form.questions.length !== 1 ? "s" : ""}</span>
        <span>·</span>
        <span className="flex items-center gap-0.5">
          {form.responseCount}
          <MessageSquare size={10} className="ml-0.5" />
        </span>
        <span>·</span>
        <span className="text-[#2DD4BF] font-semibold">{form.rewardTokens} TVX</span>
      </div>

      {/* CTA */}
      <Button
        className={`w-full font-semibold gap-2 mt-auto ${
          isBlocked
            ? "bg-[#30363D] text-[#8B949E] cursor-not-allowed pointer-events-auto"
            : "bg-[#2DD4BF] hover:bg-[#14B8A6] text-[#0D1117]"
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

  const loadForms = (reason = "manual") => {
    const approvedForms = getApprovedForms()
    const userId = resolveCurrentUserId()
    const submittedIds = new Set(getSubmittedFormIdsByUser(userId))
    console.debug("[TrustVoxFlow] user-page-load-approved", {
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
  }

  useEffect(() => {
    loadForms("mount")

    const unsubscribeForms = subscribeToFormsUpdates(() => {
      loadForms("forms-updated")
    })
    const unsubscribeCompanies = subscribeToApprovedCompanies(() => {
      loadForms("companies-updated")
    })

    const handleFocus = () => loadForms("window-focus")
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        loadForms("tab-visible")
      }
    }

    window.addEventListener("focus", handleFocus)
    document.addEventListener("visibilitychange", handleVisibilityChange)

    const polling = window.setInterval(() => loadForms("polling"), 5000)

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
    console.debug("[TrustVoxFlow] user-page-render", {
      totalApproved: forms.length,
      filteredCount: filtered.length,
      search: normalizedSearch,
      categoryFilter,
      filteredIds: filtered.map((form) => form.id),
    })
  }, [categoryFilter, filtered, forms.length, normalizedSearch])

  return (
    <div className="min-h-screen app-page bg-[#0D1117] relative">
      {/* Ambient */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-0 right-1/4 w-96 h-80 bg-[#2DD4BF]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-1/4 w-80 h-80 bg-[#A78BFA]/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-[#30363D] bg-[#0D1117]/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-2 text-sm text-[#8B949E] hover:text-[#2DD4BF] transition-colors"
          >
            <ArrowLeft size={16} />
            Dashboard
          </button>
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-[#A78BFA]" />
            <span className="text-sm font-semibold text-[#F0F6FC]">Give Feedback</span>
          </div>
          <button onClick={() => loadForms("manual-refresh")} className="p-2 text-[#484F58] hover:text-[#2DD4BF] transition-colors">
            <RefreshCw size={14} />
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 relative z-10">
        {/* Title */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-[#F0F6FC] mb-2">
            Share Your <span className="bg-gradient-to-r from-[#2DD4BF] to-[#A78BFA] bg-clip-text text-transparent">Feedback</span>
          </h1>
          <p className="text-sm text-[#8B949E] max-w-md mx-auto">
            Help companies improve by sharing honest feedback. Your voice matters!
          </p>
        </div>

        {/* Search + filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#484F58]" />
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
              className="pl-9 bg-[#161B22] border-[#30363D] text-[#F0F6FC] placeholder:text-[#484F58]"
            />

            {showSuggestions && normalizedSearch && (
              <div className="absolute left-0 right-0 mt-1 z-30 rounded-xl border border-[#30363D] bg-[#161B22] shadow-2xl overflow-hidden">
                {searchSuggestions.length === 0 ? (
                  <div className="px-3 py-2.5 text-xs text-[#484F58]">No matching feedback forms</div>
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
                        className={`w-full px-3 py-2.5 text-left border-b last:border-b-0 border-[#21262D] transition-colors ${
                          submittedFormIds.has(form.id)
                            ? "cursor-not-allowed opacity-60"
                            : "hover:bg-[#1C2333]"
                        }`}
                        title={submittedFormIds.has(form.id) ? "Blocked: You already submitted this feedback." : undefined}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm text-[#F0F6FC] font-medium truncate">{form.product}</p>
                          <span className="text-[10px] text-[#484F58] shrink-0">{form.questions.length}Q</span>
                        </div>
                        <p className="text-xs text-[#8B949E] truncate mt-0.5">{form.title}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="inline-flex px-1.5 py-0.5 rounded border border-[#2DD4BF]/30 text-[10px] text-[#2DD4BF]">
                            {form.clientName}
                          </span>
                          <span className="inline-flex px-1.5 py-0.5 rounded border border-[#30363D] text-[10px] text-[#8B949E]">
                            {form.category}
                          </span>
                          {submittedFormIds.has(form.id) ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded border border-[#F87171]/40 text-[10px] text-[#FCA5A5]">
                              <Ban size={10} className="mr-1" />
                              Blocked
                            </span>
                          ) : null}
                          <span className="text-[10px] text-[#484F58] truncate">Form ID: {form.id}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 overflow-x-auto">
            <Filter size={14} className="text-[#484F58] shrink-0" />
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border ${
                  categoryFilter === cat
                    ? "bg-[#2DD4BF]/20 border-[#2DD4BF]/50 text-[#2DD4BF]"
                    : "bg-[#161B22] border-[#30363D] text-[#8B949E] hover:border-[#484F58]"
                }`}
              >
                {cat === "all" ? "All Categories" : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 mb-6 text-sm text-[#8B949E]">
          <span>
            <span className="text-[#F0F6FC] font-semibold">{filtered.length}</span> form{filtered.length !== 1 ? "s" : ""} available
          </span>
          {search && (
            <button
              onClick={() => setSearch("")}
              className="text-xs text-[#484F58] hover:text-[#F87171] transition-colors"
            >
              Clear search
            </button>
          )}
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#161B22] border border-[#30363D] flex items-center justify-center mb-4">
              <MessageSquare size={28} className="text-[#484F58]" />
            </div>
            <h3 className="text-base font-semibold text-[#8B949E] mb-2">No feedback forms available</h3>
            <p className="text-sm text-[#484F58]">
              {search
                ? `No results for "${search}". Try a different search term.`
                : "No forms are live right now. Check back later!"}
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
