"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { History, Coins, Star, MessageSquare, Eye, Save } from "lucide-react"
import CompanyDetailsModal from "@/components/modals/company-details-modal"
import { getForms, getResponsesByFormId, subscribeToFormsUpdates, type FeedbackHandoff } from "@/lib/feedback-store"

interface FeedbackHistoryProps {
  newFeedbacks: FeedbackHandoff[]
  savedFeedbacks: FeedbackHandoff[] // Saved feedbacks (drafts)
  onContinueEditing: (feedbackData: FeedbackHandoff) => void // Continue editing a draft
}

interface FeedbackHistoryModalHandlers {
  onStartFeedback?: (feedback: FeedbackHandoff) => void
  onSaveForLater?: (feedback: FeedbackHandoff) => void
}

type FeedbackHistoryAllProps = FeedbackHistoryProps & FeedbackHistoryModalHandlers

const STATUS_TONE: Record<string, string> = {
  approved: "border-mint/25 bg-mint/10 text-mint",
  pending: "border-gold/25 bg-gold/10 text-gold",
  rejected: "border-destructive/30 bg-destructive/10 text-destructive",
  draft: "border-white/10 bg-white/[0.04] text-ink-dim",
}

function StatusBadge({ status }: { status: string }) {
  const tone = STATUS_TONE[status] ?? STATUS_TONE.draft
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize ${tone}`}>
      {status}
    </span>
  )
}

function StatTile({ label, value, tone, icon: Icon }: { label: string; value: string; tone: "gold" | "mint" | "ink"; icon: typeof Coins }) {
  const toneClass = tone === "mint" ? "text-mint" : tone === "gold" ? "text-gold" : "text-ink"
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

export default function FeedbackHistory({ newFeedbacks, savedFeedbacks, onContinueEditing, onStartFeedback, onSaveForLater }: FeedbackHistoryAllProps) {
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackHandoff | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [allFeedbacks, setAllFeedbacks] = useState<FeedbackHandoff[]>([])
  const [helpfulMessageId, setHelpfulMessageId] = useState<string | null>(null)

  useEffect(() => {
    const loadLiveHistory = () => {
      const forms = getForms()

      const mapped = forms.flatMap((form) => {
        const responses = getResponsesByFormId(form.id)

        return responses.map((response, index) => {
          const answerValues = Object.values(response.answers || {})
          const textAnswer = answerValues.find((value) => typeof value === "string" && value.trim().length > 0)
          const feedbackText = typeof textAnswer === "string" ? textAnswer : `Feedback submitted for ${form.product}.`

          return {
            id: response.id,
            company: form.clientName,
            product: form.product,
            feedback: feedbackText,
            date: response.submittedAt.slice(0, 10),
            status: "approved",
            tokensEarned: response.rewardTokens ?? form.rewardTokens,
            interactions: 1 + (index % 6),
            rating: 4.5,
            category: form.category,
          }
        })
      })

      const sorted = mapped.sort((a, b) => Date.parse(String(b.date)) - Date.parse(String(a.date)))
      setAllFeedbacks([...newFeedbacks, ...sorted])
    }

    loadLiveHistory()
    const unsubscribe = subscribeToFormsUpdates(loadLiveHistory)
    window.addEventListener("focus", loadLiveHistory)

    return () => {
      unsubscribe()
      window.removeEventListener("focus", loadLiveHistory)
    }
  }, [newFeedbacks])

  const userStats = {
    totalFeedbacks: allFeedbacks.length + savedFeedbacks.length,
    tokensEarned: allFeedbacks.reduce((sum, f) => sum + (f.tokensEarned ?? 0), 0),
    averageRating:
      allFeedbacks.length > 0 ? (allFeedbacks.reduce((sum, f) => sum + (f.rating ?? 0), 0) / allFeedbacks.length).toFixed(1) : "0.0",
    totalInteractions: allFeedbacks.reduce((sum, f) => sum + (f.interactions ?? 0), 0),
  }

  const handleViewDetails = (feedback: FeedbackHandoff) => {
    setSelectedFeedback(feedback)
    setIsModalOpen(true)
  }

  const handleHelpfulClick = (id: string) => {
    setHelpfulMessageId(id)
    setTimeout(() => setHelpfulMessageId(null), 2000)
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div data-reveal-block className="text-center">
        <p className="inline-flex items-center gap-2 rounded-full border border-gold/20 bg-gold/[0.08] px-4 py-1.5 text-sm font-semibold text-gold">
          <History className="h-4 w-4" /> Activity
        </p>
        <h1 className="mt-4 font-display text-4xl font-extrabold tracking-[-0.03em] text-ink">Feedback history &amp; rewards</h1>
        <p className="mx-auto mt-3 max-w-xl text-ink-dim">Track your contributions and the TVX you&apos;ve earned.</p>
      </div>

      {/* Stats */}
      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile label="Total feedbacks" value={userStats.totalFeedbacks.toLocaleString()} tone="ink" icon={MessageSquare} />
        <StatTile label="Tokens earned" value={`${userStats.tokensEarned.toLocaleString()} TVX`} tone="gold" icon={Coins} />
        <StatTile label="Avg. rating" value={userStats.averageRating} tone="mint" icon={Star} />
      </div>

      {/* Saved drafts */}
      {savedFeedbacks.length > 0 && (
        <section className="mt-10">
          <h2 className="flex items-center gap-2 font-display text-xl font-bold text-ink">
            <Save className="h-5 w-5 text-gold" /> Saved drafts
          </h2>
          <p className="mt-1 text-sm text-ink-muted">Feedbacks you&apos;ve saved to complete later</p>
          <div className="mt-4 space-y-3">
            {savedFeedbacks.map((feedback) => (
              <div
                key={feedback.id}
                data-reveal-card
                className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5 transition-colors hover:border-white/15"
              >
                <div className="mb-3 flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
                  <div>
                    <h3 className="font-display text-lg font-bold text-ink">{feedback.company}</h3>
                    <p className="text-sm font-medium text-ink-muted">{feedback.product}</p>
                  </div>
                  <StatusBadge status={feedback.status || "draft"} />
                </div>
                <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-ink-muted">
                  {feedback.feedback || "No feedback entered yet."}
                </p>
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onContinueEditing(feedback)}
                    className="border-white/10 bg-white/[0.03] text-ink-dim hover:bg-white/[0.06] hover:text-ink"
                  >
                    <Eye className="mr-1 h-4 w-4" /> Continue editing
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recent feedbacks */}
      <section className="mt-10">
        <h2 className="font-display text-xl font-bold text-ink">Recent feedbacks</h2>
        <p className="mt-1 text-sm text-ink-muted">Your latest submissions and their status</p>

        {allFeedbacks.length === 0 ? (
          <p className="mt-4 rounded-xl border border-white/[0.07] bg-white/[0.02] p-8 text-center text-sm text-ink-muted">
            No feedback yet. Complete an opportunity from Suggested to see it here and start earning TVX.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {allFeedbacks.map((feedback) => (
              <div
                key={feedback.id}
                data-reveal-card
                className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5 transition-colors hover:border-white/15"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-lg font-bold text-ink">{feedback.company}</h3>
                    <p className="text-sm font-medium text-ink-muted">{feedback.product}</p>
                  </div>
                  <div className="flex flex-none items-center gap-2">
                    <StatusBadge status={feedback.status || "draft"} />
                    <span className="tvx-num text-xs text-ink-muted">{feedback.date}</span>
                  </div>
                </div>

                <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-ink-muted">{feedback.feedback}</p>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-muted">
                    <span className="inline-flex items-center gap-1">
                      <Coins className="h-3.5 w-3.5 text-gold" />
                      <span className="tvx-num font-semibold text-gold">+{feedback.tokensEarned}</span> TVX
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MessageSquare className="h-3.5 w-3.5" /> {feedback.interactions} interactions
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-gold text-gold" /> <span className="tvx-num">{feedback.rating}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {helpfulMessageId === feedback.id && (
                      <span className="text-xs text-mint">Thanks for the note!</span>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleHelpfulClick(String(feedback.id))}
                      className="text-ink-dim hover:text-gold"
                    >
                      Helpful?
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDetails(feedback)}
                      className="border-white/10 bg-white/[0.03] text-ink-dim hover:bg-white/[0.06] hover:text-ink"
                    >
                      <Eye className="mr-1 h-4 w-4" /> View details
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Company Details Modal */}
      {selectedFeedback && (
        <CompanyDetailsModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          company={selectedFeedback}
          onStartFeedback={() => (onStartFeedback ? onStartFeedback(selectedFeedback) : undefined)}
          onSaveForLater={() => (onSaveForLater ? onSaveForLater(selectedFeedback) : undefined)}
        />
      )}
    </div>
  )
}
