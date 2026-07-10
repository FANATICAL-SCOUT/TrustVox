"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Coins, MessageSquare, Eye, Bookmark, ArrowRight, CheckCircle2, Trash2, Clock,
} from "lucide-react"
import {
  getForms,
  getResponsesByUser,
  subscribeToFormsUpdates,
  type FeedbackForm,
} from "@/lib/feedback-store"
import {
  getBookmarks,
  removeBookmark,
  subscribeToBookmarkUpdates,
  type Bookmark as BookmarkRow,
} from "@/lib/bookmark-store"
import { createClient } from "@/lib/supabase/client"

// A completed feedback = one real submitted response, joined with its form.
interface CompletedItem {
  responseId: string
  formId: string
  company: string
  product: string
  category: string
  date: string
  tokensEarned: number
}

type HistoryFilter = "all" | "bookmarked" | "completed"

async function resolveCurrentUserId(): Promise<string | null> {
  const supabase = createClient()
  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? null
}

function StatTile({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string
  value: string
  tone: "gold" | "ink"
  icon: typeof Coins
}) {
  const toneClass = tone === "gold" ? "text-gold" : "text-ink"
  return (
    <div data-reveal-card className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-ink-muted">{label}</p>
        <Icon className="h-4 w-4 text-gold" />
      </div>
      <p className={`tvx-num mt-1.5 text-2xl font-bold ${toneClass}`}>{value}</p>
    </div>
  )
}

export default function FeedbackHistory() {
  const router = useRouter()
  const [completed, setCompleted] = useState<CompletedItem[]>([])
  const [bookmarks, setBookmarks] = useState<BookmarkRow[]>([])
  const [filter, setFilter] = useState<HistoryFilter>("all")

  const loadHistory = useCallback(async () => {
    const userId = await resolveCurrentUserId()
    if (!userId) {
      setCompleted([])
      setBookmarks([])
      return
    }

    const [responses, forms, bookmarkRows] = await Promise.all([
      getResponsesByUser(userId),
      getForms(),
      getBookmarks(),
    ])

    const formsById = new Map<string, FeedbackForm>(forms.map((f) => [f.id, f]))
    const items: CompletedItem[] = responses.map((response) => {
      const form = formsById.get(response.formId)
      return {
        responseId: response.id,
        formId: response.formId,
        company: form?.clientName ?? "",
        product: form?.product ?? "Feedback opportunity",
        category: form?.category ?? "",
        date: response.submittedAt.slice(0, 10),
        tokensEarned: response.rewardTokens ?? form?.rewardTokens ?? 0,
      }
    })
    items.sort((a, b) => Date.parse(b.date) - Date.parse(a.date))

    setCompleted(items)
    setBookmarks(bookmarkRows)
  }, [])

  useEffect(() => {
    void loadHistory()
    const unsubscribeForms = subscribeToFormsUpdates(() => void loadHistory())
    const unsubscribeBookmarks = subscribeToBookmarkUpdates(() => void loadHistory())
    const handleFocus = () => void loadHistory()
    window.addEventListener("focus", handleFocus)
    return () => {
      unsubscribeForms()
      unsubscribeBookmarks()
      window.removeEventListener("focus", handleFocus)
    }
  }, [loadHistory])

  // A bookmark whose form the user has since completed is "done" — it moves to
  // the Completed side of the flow (Bookmarked → started → Completed), so we
  // don't double-list it as a still-actionable saved item.
  const completedFormIds = useMemo(() => new Set(completed.map((c) => c.formId)), [completed])
  const openBookmarks = useMemo(
    () => bookmarks.filter((b) => !completedFormIds.has(b.formId)),
    [bookmarks, completedFormIds],
  )

  const tokensEarned = useMemo(() => completed.reduce((sum, c) => sum + c.tokensEarned, 0), [completed])

  const handleRemoveBookmark = async (formId: string) => {
    // Optimistic; Realtime/focus reload reconciles on failure.
    setBookmarks((prev) => prev.filter((b) => b.formId !== formId))
    try {
      await removeBookmark(formId)
    } catch {
      void loadHistory()
    }
  }

  const showBookmarks = filter === "all" || filter === "bookmarked"
  const showCompleted = filter === "all" || filter === "completed"

  const FILTERS: { key: HistoryFilter; label: string; count: number }[] = [
    { key: "all", label: "All", count: openBookmarks.length + completed.length },
    { key: "bookmarked", label: "Bookmarked", count: openBookmarks.length },
    { key: "completed", label: "Completed", count: completed.length },
  ]

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div data-reveal-block className="text-center">
        <h1 className="font-display text-4xl font-extrabold tracking-[-0.03em] text-ink">
          Your feedback <span className="tvx-text-gold">history</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-ink-dim">
          What you&apos;ve saved for later, and every feedback you&apos;ve completed.
        </p>
      </div>

      {/* Stats — real, derived only */}
      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <StatTile label="Feedbacks completed" value={completed.length.toLocaleString()} tone="ink" icon={MessageSquare} />
        <StatTile label="Tokens earned" value={`${tokensEarned.toLocaleString()} TVX`} tone="gold" icon={Coins} />
      </div>

      {/* Filter */}
      <div className="mt-8 flex flex-wrap items-center gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            aria-pressed={filter === f.key}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 ${
              filter === f.key
                ? "border-gold/40 bg-gold/10 text-gold"
                : "border-white/[0.08] bg-white/[0.03] text-ink-dim hover:border-white/15 hover:text-ink"
            }`}
          >
            {f.label}
            <span className="tvx-num text-[11px] opacity-70">{f.count}</span>
          </button>
        ))}
      </div>

      {/* Bookmarked */}
      {showBookmarks && (
        <section className="mt-8">
          <h2 className="flex items-center gap-2 font-display text-xl font-bold text-ink">
            <Bookmark className="h-5 w-5 text-gold" /> Bookmarked
          </h2>
          <p className="mt-1 text-sm text-ink-muted">Opportunities you saved to complete later</p>

          {openBookmarks.length === 0 ? (
            <p className="mt-4 rounded-xl border border-white/[0.07] bg-white/[0.02] p-8 text-center text-sm text-ink-muted">
              Nothing bookmarked yet. Bookmark an opportunity in{" "}
              <button
                onClick={() => router.push("/user/dashboard?section=suggested")}
                className="text-gold underline-offset-2 hover:underline"
              >
                Suggested
              </button>{" "}
              so you don&apos;t miss it.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {openBookmarks.map((b) => (
                <div
                  key={b.id}
                  data-reveal-card
                  className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5 transition-colors hover:border-white/15"
                >
                  <div className="mb-3 flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-display text-lg font-bold text-ink">{b.product}</h3>
                        {b.category ? (
                          <span className="inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[11px] text-ink-muted">
                            {b.category}
                          </span>
                        ) : null}
                      </div>
                      {b.company ? <p className="text-sm font-medium text-ink-muted">{b.company}</p> : null}
                    </div>
                    <span className="tvx-num inline-flex items-center gap-1 text-xs text-ink-muted">
                      <Clock className="h-3.5 w-3.5" /> Saved {b.createdAt.slice(0, 10)}
                    </span>
                  </div>
                  {b.description ? (
                    <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-ink-muted">{b.description}</p>
                  ) : null}

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="tvx-num text-sm font-bold text-gold">+{b.rewardTokens} TVX</span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void handleRemoveBookmark(b.formId)}
                        className="text-ink-muted hover:text-destructive"
                      >
                        <Trash2 className="mr-1 h-4 w-4" /> Remove
                      </Button>
                      {b.formMissing || b.formStatus !== "approved" ? (
                        <span className="text-xs text-ink-muted">No longer available</span>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => router.push(`/user/feedback/${b.formId}`)}
                          className="bg-gradient-to-b from-[#f2c877] to-gold-deep font-semibold text-[#241a06] hover:brightness-105"
                        >
                          Start <ArrowRight className="ml-1 h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Completed */}
      {showCompleted && (
        <section className="mt-10">
          <h2 className="flex items-center gap-2 font-display text-xl font-bold text-ink">
            <CheckCircle2 className="h-5 w-5 text-mint" /> Completed
          </h2>
          <p className="mt-1 text-sm text-ink-muted">Feedback you&apos;ve submitted and the TVX you earned</p>

          {completed.length === 0 ? (
            <p className="mt-4 rounded-xl border border-white/[0.07] bg-white/[0.02] p-8 text-center text-sm text-ink-muted">
              No feedback yet. Complete an opportunity from Suggested to see it here and start earning TVX.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {completed.map((item) => (
                <div
                  key={item.responseId}
                  data-reveal-card
                  className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5 transition-colors hover:border-white/15"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-display text-lg font-bold text-ink">{item.product}</h3>
                        {item.category ? (
                          <span className="inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[11px] text-ink-muted">
                            {item.category}
                          </span>
                        ) : null}
                      </div>
                      {item.company ? <p className="text-sm font-medium text-ink-muted">{item.company}</p> : null}
                    </div>
                    <div className="flex flex-none items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full border border-mint/25 bg-mint/10 px-2.5 py-0.5 text-[11px] font-semibold text-mint">
                        <CheckCircle2 size={11} /> Completed
                      </span>
                      <span className="tvx-num text-xs text-ink-muted">{item.date}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-1 text-xs text-ink-muted">
                      <Coins className="h-3.5 w-3.5 text-gold" />
                      <span className="tvx-num font-semibold text-gold">+{item.tokensEarned}</span> TVX earned
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/user/feedback/${item.formId}?view=1`)}
                      className="border-white/10 bg-white/[0.03] text-ink-dim hover:bg-white/[0.06] hover:text-ink"
                    >
                      <Eye className="mr-1 h-4 w-4" /> View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
