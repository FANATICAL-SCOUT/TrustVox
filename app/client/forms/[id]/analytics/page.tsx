"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, BarChart3, MessageSquare, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getFormById, getResponsesByFormId } from "@/lib/feedback-store"

function formatDate(value: string | undefined) {
  if (!value) return "-"
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) return "-"
  return new Date(parsed).toLocaleDateString()
}

// Real numeric star-rating answers from the form's actual seeded responses.
// Returns an empty array (rendered as an honest "no ratings yet" state by
// callers) when there's no real data — no formula-derived placeholder score.
function getResponseRatings(formId: string): number[] {
  return getResponsesByFormId(formId)
    .map((response) => Object.values(response.answers || {}).find((value) => typeof value === "number"))
    .filter((value): value is number => typeof value === "number")
}

export default function FormAnalyticsPage() {
  const params = useParams()
  const router = useRouter()
  const [isReady, setIsReady] = useState(false)

  const formId = Array.isArray(params?.id) ? params.id[0] : params?.id

  useEffect(() => {
    setIsReady(true)
  }, [])

  const form = useMemo(() => {
    if (!isReady || !formId) return null
    return getFormById(formId)
  }, [isReady, formId])

  const ratings = useMemo(() => (form ? getResponseRatings(form.id) : []), [form])
  const averageRating = ratings.length > 0 ? ratings.reduce((sum, value) => sum + value, 0) / ratings.length : 0

  const ratingCounts = useMemo(() => {
    const counts = [0, 0, 0, 0, 0]
    ratings.forEach((value) => {
      const bucket = Math.min(5, Math.max(1, Math.round(value))) - 1
      counts[bucket] += 1
    })
    return counts
  }, [ratings])

  const recentResponses = useMemo(() => {
    if (!form) return []
    return getResponsesByFormId(form.id)
      .slice()
      .sort((a, b) => Date.parse(b.submittedAt) - Date.parse(a.submittedAt))
      .slice(0, 5)
  }, [form])

  if (!isReady) {
    return (
      <div className="min-h-screen bg-background px-4 py-10">
        <div className="mx-auto max-w-5xl rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 text-sm text-ink-dim">
          Loading analytics...
        </div>
      </div>
    )
  }

  if (!form) {
    return (
      <div className="min-h-screen bg-background px-4 py-10">
        <div className="mx-auto max-w-5xl rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 text-center">
          <h1 className="text-lg font-semibold text-ink">Form not found</h1>
          <p className="mt-1 text-sm text-ink-dim">This form analytics page is unavailable.</p>
          <Button
            className="mt-4 bg-gradient-to-b from-[#f2c877] to-gold-deep text-[#241a06] font-semibold hover:brightness-105"
            onClick={() => router.push("/client/forms")}
          >
            Back to My Forms
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Button
          variant="ghost"
          className="mb-4 text-ink-dim hover:bg-white/[0.06] hover:text-ink"
          onClick={() => router.push("/client/forms")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to My Forms
        </Button>

        <section className="tvx-card-gold mb-6 rounded-2xl border border-white/[0.08] bg-gradient-to-b from-surface to-[#0e1017] p-6">
          <div className="mb-3 flex items-center gap-2">
            <Badge className="border border-gold/30 bg-gold/10 text-gold">Form Analytics</Badge>
            <span className="text-xs uppercase tracking-wide text-ink-muted">Insights</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-ink">{form.title || "Untitled Form"}</h1>
          <p className="mt-1 text-sm text-ink-dim">{form.description || "No description provided"}</p>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:max-w-3xl">
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
              <p className="tvx-num text-xl font-semibold text-ink">{form.responseCount}</p>
              <p className="text-xs text-ink-muted">Responses</p>
            </div>
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
              <p className="tvx-num text-xl font-semibold text-ink">{averageRating > 0 ? averageRating.toFixed(1) : "—"}</p>
              <p className="text-xs text-ink-muted">Avg rating</p>
            </div>
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
              <p className="tvx-num text-xl font-semibold text-ink">{form.questions.length}</p>
              <p className="text-xs text-ink-muted">Questions</p>
            </div>
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
              <p className="tvx-num text-xl font-semibold text-ink">{formatDate(form.submittedAt || form.createdAt)}</p>
              <p className="text-xs text-ink-muted">Last update</p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <Card className="border-white/[0.08] bg-white/[0.02]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-ink">
                <Star className="h-4 w-4 text-gold" />
                Rating breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              {ratings.length === 0 ? (
                <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 text-sm text-ink-dim">
                  No ratings on file for this form yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {ratingCounts.map((count, index) => {
                    const stars = index + 1
                    const pct = ratings.length > 0 ? (count / ratings.length) * 100 : 0
                    return (
                      <div key={stars} className="flex items-center gap-2 text-xs text-ink-dim">
                        <span className="w-10 shrink-0 tvx-num">{stars} star</span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                          <div className="h-full rounded-full bg-gold" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-6 shrink-0 text-right tvx-num">{count}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-white/[0.08] bg-white/[0.02]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-ink">
                <MessageSquare className="h-4 w-4 text-gold" />
                Recent responses
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentResponses.length === 0 ? (
                <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 text-sm text-ink-dim">
                  No responses yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {recentResponses.map((response) => (
                    <div
                      key={response.id}
                      className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 text-sm text-ink-dim"
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <BarChart3 className="h-3.5 w-3.5" />
                        Response received
                      </span>
                      <span className="tvx-num text-xs text-ink-muted">{formatDate(response.submittedAt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  )
}
