"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  CircleDashed,
  Clock3,
  Coins,
  Lightbulb,
  MessageSquare,
  Plus,
  Star,
  TrendingDown,
  TrendingUp,
  Users,
  XCircle,
} from "lucide-react"
import { getClientForms, getResponsesByFormId, subscribeToFormsUpdates } from "@/lib/feedback-store"
import type { FeedbackForm, FormResponse } from "@/lib/feedback-store"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

const STATUS_STYLES: Record<FeedbackForm["status"], string> = {
  draft: "border-white/15 bg-white/[0.04] text-ink-muted",
  pending: "border-gold/30 bg-gold/10 text-gold",
  approved: "border-mint/30 bg-mint/10 text-mint",
  rejected: "border-destructive/30 bg-destructive/10 text-destructive",
}

const STATUS_LABELS: Record<FeedbackForm["status"], string> = {
  draft: "Draft",
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
}

type ActivityTone = FeedbackForm["status"]

type ActivityItem = {
  id: string
  title: string
  time: string
  tone: ActivityTone
}

type InsightItem = {
  id: string
  icon: typeof Lightbulb
  title: string
  detail: string
}

type TimeRange = "7d" | "30d" | "all"

type TrendPoint = {
  key: string
  label: string
  fullLabel: string
  responses: number
  activeUsers: number
  rating: number
}

const TIME_FILTERS: Array<{ key: TimeRange; label: string }> = [
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "all", label: "All time" },
]

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function formatPercentDelta(value: number) {
  if (!Number.isFinite(value)) return "0%"
  const rounded = Number(value.toFixed(1))
  const sign = rounded > 0 ? "+" : ""
  return `${sign}${rounded}%`
}

function buildBuckets(range: TimeRange, periodOffset = 0) {
  const now = new Date()

  if (range === "all") {
    return Array.from({ length: 12 }).map((_, index) => {
      const date = new Date(now)
      date.setMonth(now.getMonth() - (11 - index) - periodOffset * 12)
      return {
        key: `${date.getFullYear()}-${date.getMonth() + 1}`,
        label: date.toLocaleDateString("en-US", { month: "short" }),
        fullLabel: date.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      }
    })
  }

  const dayCount = range === "7d" ? 7 : 30
  return Array.from({ length: dayCount }).map((_, index) => {
    const date = new Date(now)
    date.setDate(now.getDate() - (dayCount - 1 - index) - periodOffset * dayCount)
    return {
      key: date.toISOString().slice(0, 10),
      label: range === "7d" ? date.toLocaleDateString("en-US", { weekday: "short" }) : date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      fullLabel: date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    }
  })
}

// Real star rating (1-5) if the form captured one; otherwise a neutral
// midpoint. No keyword/text sentiment guessing — that's fabricated signal.
function deriveResponseScore(response: FormResponse): number {
  const values = Object.values(response.answers || {})
  const numeric = values.find((value) => typeof value === "number")
  if (typeof numeric === "number") return clamp(numeric, 1, 5)
  return 3
}

function toPeriodDate(rawValue?: string): Date | null {
  if (!rawValue) return null
  const parsed = Date.parse(rawValue)
  if (Number.isNaN(parsed)) return null
  return new Date(parsed)
}

function getPeriodStart(range: TimeRange, periodOffset = 0): Date {
  const end = getPeriodEnd(range, periodOffset)

  if (range === "all") {
    const start = new Date(end)
    start.setMonth(end.getMonth() - 11)
    start.setDate(1)
    return start
  }

  const dayCount = range === "7d" ? 7 : 30
  const start = new Date(end)
  start.setDate(end.getDate() - (dayCount - 1))
  start.setHours(0, 0, 0, 0)
  return start
}

function getPeriodEnd(range: TimeRange, periodOffset = 0): Date {
  const end = new Date()
  if (range === "all") {
    end.setMonth(end.getMonth() - periodOffset * 12)
    end.setDate(1)
    end.setMonth(end.getMonth() + 1)
    end.setDate(0)
    end.setHours(23, 59, 59, 999)
    return end
  }

  const dayCount = range === "7d" ? 7 : 30
  end.setDate(end.getDate() - periodOffset * dayCount)
  end.setHours(23, 59, 59, 999)
  return end
}

function resolveBucketKey(date: Date, range: TimeRange): string {
  if (range === "all") {
    return `${date.getFullYear()}-${date.getMonth() + 1}`
  }
  return date.toISOString().slice(0, 10)
}

// Only real submitted responses feed the chart/insights — no fabricated
// synthetic users or inferred ratings for forms that lack real response rows.
function buildTrendSeries(responses: FormResponse[], range: TimeRange, periodOffset = 0): TrendPoint[] {
  const buckets = buildBuckets(range, periodOffset)
  const start = getPeriodStart(range, periodOffset)
  const end = getPeriodEnd(range, periodOffset)

  const accumulator = new Map(
    buckets.map((bucket) => [bucket.key, { responses: 0, userIds: new Set<string>(), ratingSum: 0, ratingCount: 0 }]),
  )

  responses.forEach((response) => {
    const date = toPeriodDate(response.submittedAt)
    if (!date || date < start || date > end) return

    const bucket = accumulator.get(resolveBucketKey(date, range))
    if (!bucket) return

    const score = deriveResponseScore(response)
    bucket.responses += 1
    if (response.userId) bucket.userIds.add(response.userId)
    bucket.ratingSum += score
    bucket.ratingCount += 1
  })

  return buckets.map((bucket) => {
    const data = accumulator.get(bucket.key)
    const rating = data && data.ratingCount > 0 ? data.ratingSum / data.ratingCount : 0

    return {
      key: bucket.key,
      label: bucket.label,
      fullLabel: bucket.fullLabel,
      responses: data?.responses ?? 0,
      activeUsers: data?.userIds.size ?? 0,
      rating: Number(clamp(rating || 0, 0, 5).toFixed(1)),
    }
  })
}

function metricDelta(current: number, previous: number) {
  if (previous <= 0) return 0
  return ((current - previous) / previous) * 100
}

function timeAgo(isoValue?: string) {
  if (!isoValue) return "just now"
  const time = Date.parse(isoValue)
  if (Number.isNaN(time)) return "just now"
  const deltaMinutes = Math.max(1, Math.floor((Date.now() - time) / 60000))
  if (deltaMinutes < 60) return `${deltaMinutes}m ago`
  const hours = Math.floor(deltaMinutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function getLastUpdated(form: FeedbackForm) {
  return form.approvedAt || form.submittedAt || form.createdAt
}

export default function ClientHomePage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [allForms, setAllForms] = useState<FeedbackForm[]>([])
  const [timeRange, setTimeRange] = useState<TimeRange>("7d")
  // The dashboard fetches after mount, so `mounted` flips true well before the
  // data lands. Gating the skeleton on the first *fetch* (not just mount) avoids
  // the landing page briefly showing "0 forms / 0 responses" + zeroed stat tiles
  // before the real numbers arrive — the main "dashboard feels slow" complaint.
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    const loadForms = async () => {
      try {
        setAllForms(await getClientForms())
      } finally {
        setLoading(false)
      }
    }

    void loadForms()
    const unsubscribe = subscribeToFormsUpdates(() => void loadForms())
    return () => unsubscribe()
  }, [mounted])

  const [realResponses, setRealResponses] = useState<FormResponse[]>([])

  useEffect(() => {
    let active = true
    void (async () => {
      const responses = await Promise.all(allForms.map((form) => getResponsesByFormId(form.id)))
      if (active) setRealResponses(responses.flat())
    })()
    return () => {
      active = false
    }
  }, [allForms])

  const recentForms = useMemo(() => {
    return [...allForms]
      .sort((a, b) => Date.parse(getLastUpdated(b) || "") - Date.parse(getLastUpdated(a) || ""))
      .slice(0, 6)
  }, [allForms])

  const activity = useMemo(() => {
    const items: ActivityItem[] = []

    allForms.forEach((form) => {
      if (form.status === "approved" && form.approvedAt) {
        items.push({
          id: `${form.id}-approved`,
          title: `${form.title || "Form"} approved`,
          time: timeAgo(form.approvedAt),
          tone: "approved",
        })
      } else if (form.status === "pending" && form.submittedAt) {
        items.push({
          id: `${form.id}-pending`,
          title: `${form.title || "Form"} submitted for approval`,
          time: timeAgo(form.submittedAt),
          tone: "pending",
        })
      } else if (form.status === "rejected") {
        items.push({
          id: `${form.id}-rejected`,
          title: `${form.title || "Form"} rejected`,
          time: timeAgo(getLastUpdated(form)),
          tone: "rejected",
        })
      } else {
        items.push({
          id: `${form.id}-draft`,
          title: `${form.title || "Form"} saved as draft`,
          time: timeAgo(form.createdAt),
          tone: "draft",
        })
      }
    })

    return items.slice(0, 8)
  }, [allForms])

  const currentSeries = useMemo(() => {
    return buildTrendSeries(realResponses, timeRange, 0)
  }, [realResponses, timeRange])

  const previousSeries = useMemo(() => {
    return buildTrendSeries(realResponses, timeRange, 1)
  }, [realResponses, timeRange])

  const windowedResponses = useMemo(() => {
    const start = getPeriodStart(timeRange, 0)
    const end = getPeriodEnd(timeRange, 0)
    return realResponses.filter((response) => {
      const date = toPeriodDate(response.submittedAt)
      return date && date >= start && date <= end
    })
  }, [realResponses, timeRange])

  const aggregates = useMemo(() => {
    const totalFeedbacks = currentSeries.reduce((sum, point) => sum + point.responses, 0)
    const previousFeedbacks = previousSeries.reduce((sum, point) => sum + point.responses, 0)

    const uniqueRespondents = new Set(windowedResponses.map((response) => response.userId).filter(Boolean)).size
    const tvxRewarded = windowedResponses.reduce((sum, response) => sum + (response.rewardTokens || 0), 0)

    const weightedRatingSum = currentSeries.reduce((sum, point) => sum + point.rating * point.responses, 0)
    const previousWeightedRatingSum = previousSeries.reduce((sum, point) => sum + point.rating * point.responses, 0)

    const averageRating = totalFeedbacks > 0 ? weightedRatingSum / totalFeedbacks : 0
    const previousAverageRating = previousFeedbacks > 0 ? previousWeightedRatingSum / previousFeedbacks : 0

    return {
      totalFeedbacks,
      uniqueRespondents,
      tvxRewarded,
      averageRating,
      feedbackDelta: metricDelta(totalFeedbacks, previousFeedbacks),
      ratingDelta: averageRating - previousAverageRating,
    }
  }, [currentSeries, previousSeries, windowedResponses])

  const sentimentBreakdown = useMemo(() => {
    if (windowedResponses.length === 0) return null

    let positive = 0
    let neutral = 0
    let negative = 0

    windowedResponses.forEach((response) => {
      const score = deriveResponseScore(response)
      if (score >= 4) positive += 1
      else if (score <= 2) negative += 1
      else neutral += 1
    })

    const total = windowedResponses.length
    return [
      { label: "Positive", tag: "4-5 star", value: Math.round((positive / total) * 100), tone: "mint" as const },
      { label: "Neutral", tag: "3 star", value: Math.round((neutral / total) * 100), tone: "gold" as const },
      { label: "Negative", tag: "1-2 star", value: Math.round((negative / total) * 100), tone: "destructive" as const },
    ]
  }, [windowedResponses])

  const insightItems = useMemo<InsightItem[]>(() => {
    if (aggregates.totalFeedbacks === 0) return []

    const avgResponses = currentSeries.reduce((sum, point) => sum + point.responses, 0) / currentSeries.length
    const peak = currentSeries.reduce((best, point) => (point.responses > best.responses ? point : best), currentSeries[0])
    const lowest = currentSeries.reduce((worst, point) => (point.responses < worst.responses ? point : worst), currentSeries[0])
    const engagementGap = metricDelta(peak.responses, Math.max(1, Math.round(avgResponses)))

    const items: InsightItem[] = [
      {
        id: "peak",
        icon: TrendingUp,
        title: `${peak.fullLabel} recorded ${peak.responses} response${peak.responses === 1 ? "" : "s"}`,
        detail: `${formatPercentDelta(engagementGap)} above ${timeRange === "all" ? "monthly" : "period"} average.`,
      },
      {
        id: "rating",
        icon: Star,
        title: `Average rating is ${aggregates.averageRating.toFixed(1)} / 5`,
        detail: `${aggregates.ratingDelta >= 0 ? "+" : ""}${aggregates.ratingDelta.toFixed(2)} vs the previous period.`,
      },
      {
        id: "respondents",
        icon: Users,
        title: `${aggregates.uniqueRespondents} unique respondent${aggregates.uniqueRespondents === 1 ? "" : "s"}`,
        detail: `Across ${aggregates.totalFeedbacks} response${aggregates.totalFeedbacks === 1 ? "" : "s"} in this window.`,
      },
    ]

    if (lowest.key !== peak.key) {
      items.push({
        id: "dip",
        icon: TrendingDown,
        title: `${lowest.fullLabel} saw ${lowest.responses} response${lowest.responses === 1 ? "" : "s"}`,
        detail: `The quietest point in the current period.`,
      })
    }

    return items
  }, [currentSeries, aggregates, timeRange])

  const feedbackItems = useMemo(() => {
    return [...realResponses]
      .sort((a, b) => Date.parse(b.submittedAt) - Date.parse(a.submittedAt))
      .slice(0, 4)
      .map((response) => {
        const form = allForms.find((candidate) => candidate.id === response.formId)
        const textAnswer = Object.values(response.answers || {}).find((value) => typeof value === "string" && value.length > 12)
        const rating = Math.round(deriveResponseScore(response))
        const sentiment = rating >= 4 ? "Positive" : rating <= 2 ? "Negative" : "Neutral"
        const suffixMatch = response.userId?.match(/(\d+)$/)
        const respondentTag = suffixMatch ? `R${suffixMatch[1]}` : "R?"

        return {
          id: response.id,
          respondentTag,
          formTitle: form?.title || "Feedback form",
          text: typeof textAnswer === "string" ? textAnswer : "No written comment on this response.",
          rating,
          sentiment,
          time: timeAgo(response.submittedAt),
        }
      })
  }, [realResponses, allForms])

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6">
        <div className="mx-auto max-w-7xl animate-pulse">
          {/* Hero */}
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 md:p-6">
            <div className="h-7 w-56 rounded bg-white/[0.06]" />
            <div className="mt-2 h-4 w-80 max-w-full rounded bg-white/[0.04]" />
            <div className="mt-4 h-4 w-40 rounded bg-white/[0.04]" />
          </div>
          {/* Time filters */}
          <div className="mt-5 flex flex-wrap gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-7 w-16 rounded-full bg-white/[0.04]" />
            ))}
          </div>
          {/* Stat tiles */}
          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5">
                <div className="h-4 w-24 rounded bg-white/[0.05]" />
                <div className="mt-3 h-7 w-20 rounded bg-white/[0.06]" />
                <div className="mt-3 h-3 w-28 rounded bg-white/[0.04]" />
              </div>
            ))}
          </div>
          {/* Chart block */}
          <div className="mt-6 rounded-xl border border-white/[0.07] bg-white/[0.02] p-5">
            <div className="h-5 w-40 rounded bg-white/[0.05]" />
            <div className="mt-4 h-64 w-full rounded-lg bg-white/[0.03]" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <section className="tvx-card-gold relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-5 md:p-6">
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Feedback Overview</h1>
              <p className="mt-1 text-sm text-ink-dim">Track responses, engagement, and trends across all your forms</p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-xs text-ink-dim">{allForms.length} form{allForms.length !== 1 ? "s" : ""}</span>
                <span className="text-xs text-ink-muted">|</span>
                <span className="text-xs text-ink-dim">{realResponses.length} lifetime response{realResponses.length !== 1 ? "s" : ""}</span>
              </div>
            </div>

            <div className="flex flex-col items-start gap-3 sm:items-end">
              <button
                onClick={() => router.push("/client/create")}
                className="inline-flex w-full items-center justify-center rounded-lg bg-gradient-to-b from-[#f2c877] to-gold-deep px-4 py-2 text-sm font-semibold text-[#241a06] transition hover:brightness-105 sm:w-auto"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Form
              </button>
            </div>
          </div>
        </section>

        <section className="mt-5 flex flex-wrap gap-2">
          {TIME_FILTERS.map((option) => (
            <button
              key={option.key}
              onClick={() => setTimeRange(option.key)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                timeRange === option.key
                  ? "border-gold/30 bg-gold/10 text-gold"
                  : "border-white/[0.1] bg-white/[0.03] text-ink-muted hover:border-white/20 hover:text-ink-dim"
              }`}
            >
              {option.label}
            </button>
          ))}
        </section>

        <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              key: "feedbacks",
              label: "Total Responses",
              value: aggregates.totalFeedbacks.toLocaleString(),
              delta: formatPercentDelta(aggregates.feedbackDelta),
              positive: aggregates.feedbackDelta >= 0,
              icon: MessageSquare,
              subtext: `vs previous ${timeRange === "all" ? "year" : "period"}`,
            },
            {
              key: "rating",
              label: "Average Rating",
              value: aggregates.totalFeedbacks > 0 ? aggregates.averageRating.toFixed(1) : "—",
              delta: `${aggregates.ratingDelta >= 0 ? "+" : ""}${aggregates.ratingDelta.toFixed(2)}`,
              positive: aggregates.ratingDelta >= 0,
              icon: Star,
              subtext: "rating points vs previous period",
            },
            {
              key: "respondents",
              label: "Unique Respondents",
              value: aggregates.uniqueRespondents.toLocaleString(),
              delta: null,
              positive: true,
              icon: Users,
              subtext: "in the selected window",
            },
            {
              key: "tvx",
              label: "TVX Rewarded",
              value: aggregates.tvxRewarded.toLocaleString(),
              delta: null,
              positive: true,
              icon: Coins,
              subtext: "paid out for this window",
            },
          ].map((metric) => {
            const trendPositive = metric.positive
            return (
              <div key={metric.key} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-ink-muted">{metric.label}</p>
                    <p className="tvx-num mt-1 text-2xl font-semibold text-ink">{metric.value}</p>
                    {metric.delta !== null ? (
                      <p className={`mt-1 inline-flex items-center text-xs ${trendPositive ? "text-mint" : "text-destructive"}`}>
                        {trendPositive ? <ArrowUpRight className="mr-1 h-3.5 w-3.5" /> : <ArrowDownRight className="mr-1 h-3.5 w-3.5" />}
                        {metric.delta}
                      </p>
                    ) : null}
                    <p className="mt-1 text-[11px] text-ink-muted">{metric.subtext}</p>
                  </div>
                  <metric.icon className="h-5 w-5 text-gold" />
                </div>
              </div>
            )
          })}
        </section>

        <section className="mt-5">
          <div className="flex flex-col gap-4 rounded-xl border border-mint/25 bg-mint/[0.05] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-mint">
                <BarChart3 className="h-3.5 w-3.5" />
                Analytics Workspace
              </p>
              <h3 className="mt-1 text-base font-semibold text-ink">Deep-dive Analytics</h3>
              <p className="mt-1 text-sm text-ink-dim">
                Compare forms side by side, generate executive insights, and export reports as PDF.
              </p>
            </div>
            <button
              onClick={() => router.push("/client/analytics")}
              className="inline-flex w-full items-center justify-center rounded-lg border border-mint/30 bg-mint/10 px-4 py-2 text-sm font-medium text-mint transition hover:bg-mint/15 sm:w-auto"
            >
              Open Analytics
              <ArrowRight className="ml-2 h-4 w-4" />
            </button>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.7fr_1fr]">
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
            <h2 className="mb-2 text-lg font-semibold text-ink">Feedback Trends</h2>
            {aggregates.totalFeedbacks === 0 ? (
              <p className="flex h-[300px] items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.02] text-center text-sm text-ink-muted">
                No responses recorded in this window yet.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={340}>
                <AreaChart data={currentSeries} margin={{ top: 16, right: 16, left: 0, bottom: 8 }}>
                  <defs>
                    <linearGradient id="feedbackGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#EBBC6B" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="#C89545" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#878CA0" strokeDasharray="3 3" opacity={0.15} />
                  <XAxis
                    dataKey="label"
                    stroke="#878CA0"
                    tickLine={false}
                    axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                    interval={timeRange === "30d" ? 4 : 0}
                    label={{ value: timeRange === "all" ? "Months" : "Days", position: "insideBottom", offset: -4, fill: "#878CA0", fontSize: 12 }}
                  />
                  <YAxis
                    stroke="#878CA0"
                    tickLine={false}
                    axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                    label={{ value: "Responses", angle: -90, position: "insideLeft", fill: "#878CA0", fontSize: 12 }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(235,188,107,0.08)" }}
                    contentStyle={{
                      backgroundColor: "#1B1F2A",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "10px",
                      color: "#ECEEF4",
                    }}
                    labelStyle={{ color: "#B6BACB" }}
                    labelFormatter={(label: string) => `Period: ${label}`}
                    formatter={(value: number) => [value, "Responses"]}
                  />
                  <Area type="monotone" dataKey="responses" stroke="#EBBC6B" strokeWidth={2.5} fill="url(#feedbackGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
            <h2 className="mb-2 text-base font-semibold text-ink">Rating breakdown</h2>
            {!sentimentBreakdown ? (
              <p className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-6 text-center text-sm text-ink-muted">
                No ratings on file for this window.
              </p>
            ) : (
              <div className="space-y-4">
                {sentimentBreakdown.map((group) => {
                  const barClass = group.tone === "mint" ? "bg-mint" : group.tone === "gold" ? "bg-gold" : "bg-destructive"
                  return (
                    <div key={group.label}>
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-sm text-ink-dim">
                          {group.label} <span className="text-[11px] text-ink-muted">({group.tag})</span>
                        </span>
                        <span className="tvx-num text-sm font-medium text-ink">{group.value}%</span>
                      </div>
                      <div className="h-2.5 w-full rounded-full bg-white/[0.06]">
                        <div className={`h-2.5 rounded-full ${barClass} transition-all duration-500`} style={{ width: `${group.value}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-3 flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-gold" />
            <h2 className="text-lg font-semibold text-ink">Insights</h2>
          </div>
          {insightItems.length === 0 ? (
            <p className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-6 text-center text-sm text-ink-muted">
              No feedback yet in this window — insights populate once responses come in.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {insightItems.map((insight) => (
                <div key={insight.id} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
                  <div className="mb-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-gold/10 text-gold">
                    <insight.icon className="h-4 w-4" />
                  </div>
                  <p className="text-sm font-medium text-ink">{insight.title}</p>
                  <p className="mt-1 text-xs text-ink-muted">{insight.detail}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-8">
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
            <h2 className="mb-3 text-base font-semibold text-ink">Recent Feedback</h2>
            <div className="space-y-3">
              {feedbackItems.map((feedback) => {
                const sentimentClass =
                  feedback.sentiment === "Positive"
                    ? "border-mint/30 bg-mint/10 text-mint"
                    : feedback.sentiment === "Negative"
                    ? "border-destructive/30 bg-destructive/10 text-destructive"
                    : "border-white/15 bg-white/[0.04] text-ink-muted"

                return (
                  <div key={feedback.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="inline-flex h-8 w-8 flex-none items-center justify-center rounded-full border border-gold/25 bg-gold/10 text-xs font-semibold text-gold">
                        {feedback.respondentTag}
                      </span>
                      <div className="min-w-0">
                        <p className="max-w-xl truncate text-sm text-ink">{feedback.text}</p>
                        <p className="truncate text-xs text-ink-muted">{feedback.formTitle} · {feedback.time}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${sentimentClass}`}>
                        {feedback.sentiment}
                      </span>
                      <div className="flex items-center">
                        {Array.from({ length: 5 }).map((_, index) => (
                          <Star
                            key={`${feedback.id}-star-${index}`}
                            className={`h-3.5 w-3.5 ${index < feedback.rating ? "fill-gold text-gold" : "text-white/15"}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )
              })}
              {!feedbackItems.length ? <p className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-4 text-center text-sm text-ink-muted">No feedback captured yet.</p> : null}
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.45fr_1fr]">
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-ink">Recent Forms</h2>
              <button
                onClick={() => router.push("/client/forms")}
                className="inline-flex items-center rounded-md px-2 py-1.5 text-xs font-medium text-gold hover:bg-gold/10"
              >
                View all <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </button>
            </div>
            <div className="space-y-2">
              {recentForms.length === 0 ? (
                <p className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-6 text-center text-sm text-ink-muted">
                  No forms available yet. Use Create Form to launch your first feedback form.
                </p>
              ) : (
                recentForms.map((form) => {
                  const canEdit = form.status === "draft" || form.status === "rejected"
                  return (
                    <div key={form.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">{form.title || "Untitled Form"}</p>
                        <p className="truncate text-xs text-ink-muted">{form.clientName || "Company"} · {form.product || "Product"}</p>
                      </div>
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[form.status]}`}>{STATUS_LABELS[form.status]}</span>
                      <span className="text-xs text-ink-muted">{timeAgo(getLastUpdated(form))}</span>
                      <button
                        onClick={() =>
                          canEdit ? router.push(`/client/create?edit=${form.id}`) : router.push("/client/forms")
                        }
                        className="rounded-md px-2 py-1 text-xs font-medium text-mint hover:bg-mint/10"
                      >
                        {canEdit ? "Edit" : "View"}
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
            <h2 className="mb-3 text-base font-semibold text-ink">Activity Feed</h2>
            <div className="space-y-2">
              {activity.length === 0 ? (
                <p className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-6 text-center text-sm text-ink-muted">
                  No recent activity to display.
                </p>
              ) : (
                activity.map((item) => {
                  const isApproved = item.tone === "approved"
                  const isPending = item.tone === "pending"
                  const isRejected = item.tone === "rejected"
                  const iconWrapClass = isApproved
                    ? "text-mint bg-mint/10"
                    : isPending
                    ? "text-gold bg-gold/10"
                    : isRejected
                    ? "text-destructive bg-destructive/10"
                    : "text-ink-muted bg-white/[0.06]"

                  return (
                    <div key={item.id} className="flex items-start gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
                      <span className={`mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center rounded-full ${iconWrapClass}`}>
                        {isApproved ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : isPending ? (
                          <Clock3 className="h-3.5 w-3.5" />
                        ) : isRejected ? (
                          <XCircle className="h-3.5 w-3.5" />
                        ) : (
                          <CircleDashed className="h-3.5 w-3.5" />
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm text-ink">{item.title}</p>
                        <p className="text-xs text-ink-muted">{item.time}</p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
