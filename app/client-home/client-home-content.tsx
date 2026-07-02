"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  CircleDashed,
  Clock3,
  Eye,
  Lightbulb,
  MessageSquare,
  Plus,
  Star,
  TrendingDown,
  TrendingUp,
  User,
  Users,
  XCircle,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getResponsesByFormId, subscribeToFormsUpdates } from "@/lib/feedback-store"
import type { FeedbackForm, FormResponse } from "@/lib/feedback-store"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { getCampaignDetails, getCampaignSummaries, type CampaignSummary } from "@/lib/client-campaigns"

const STATUS_STYLES: Record<FeedbackForm["status"], string> = {
  draft: "border-slate-500/40 bg-slate-500/15 text-slate-300",
  pending: "border-amber-400/40 bg-amber-500/15 text-amber-200",
  approved: "border-emerald-400/40 bg-emerald-500/15 text-emerald-200",
  rejected: "border-rose-400/40 bg-rose-500/15 text-rose-200",
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
  views: number
  activeUsers: number
  rating: number
}

const TIME_FILTERS: Array<{ key: TimeRange; label: string }> = [
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "all", label: "All time" },
]

const CAMPAIGN_STATUS_STYLE = {
  active: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
  draft: "border-amber-400/30 bg-amber-500/10 text-amber-200",
  completed: "border-slate-400/30 bg-slate-500/10 text-slate-200",
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value)
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

function deriveResponseScore(response: FormResponse): number {
  const values = Object.values(response.answers || {})
  const numeric = values.find((value) => typeof value === "number")
  if (typeof numeric === "number") return clamp(numeric, 1, 5)

  const text = values.find((value) => typeof value === "string")
  if (typeof text === "string") {
    const normalized = text.toLowerCase()
    if (normalized.includes("excellent") || normalized.includes("great") || normalized.includes("good")) return 4.5
    if (normalized.includes("bad") || normalized.includes("poor") || normalized.includes("terrible")) return 2
  }

  return 3.5
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

function buildTrendSeries(forms: FeedbackForm[], range: TimeRange, periodOffset = 0): TrendPoint[] {
  const buckets = buildBuckets(range, periodOffset)
  const start = getPeriodStart(range, periodOffset)
  const end = getPeriodEnd(range, periodOffset)

  const accumulator = new Map(
    buckets.map((bucket) => [
      bucket.key,
      { responses: 0, views: 0, activeUserIds: new Set<string>(), syntheticUsers: 0, ratingSum: 0, ratingCount: 0 },
    ]),
  )

  forms.forEach((form) => {
    const responses = getResponsesByFormId(form.id)

    if (responses.length > 0) {
      responses.forEach((response) => {
        const date = toPeriodDate(response.submittedAt)
        if (!date || date < start || date > end) return

        const bucket = accumulator.get(resolveBucketKey(date, range))
        if (!bucket) return

        const score = deriveResponseScore(response)
        bucket.responses += 1
        bucket.views += Math.max(1, form.questions.length)
        if (response.userId) bucket.activeUserIds.add(response.userId)
        bucket.ratingSum += score
        bucket.ratingCount += 1
      })
      return
    }

    if (form.responseCount <= 0) return
    const referenceDate = toPeriodDate(getLastUpdated(form))
    if (!referenceDate || referenceDate < start || referenceDate > end) return

    const bucket = accumulator.get(resolveBucketKey(referenceDate, range))
    if (!bucket) return

    const inferredScore = form.status === "approved" ? 4.2 : form.status === "pending" ? 3.8 : 3.4
    bucket.responses += form.responseCount
    bucket.views += form.responseCount * Math.max(1, form.questions.length)
    bucket.syntheticUsers += Math.max(1, Math.min(form.responseCount, Math.round(form.responseCount * 0.7)))
    bucket.ratingSum += inferredScore * form.responseCount
    bucket.ratingCount += form.responseCount
  })

  return buckets.map((bucket) => {
    const data = accumulator.get(bucket.key)
    const rating = data && data.ratingCount > 0 ? data.ratingSum / data.ratingCount : 0
    const activeUsers = data ? data.activeUserIds.size + data.syntheticUsers : 0

    return {
      key: bucket.key,
      label: bucket.label,
      fullLabel: bucket.fullLabel,
      responses: data?.responses ?? 0,
      views: data?.views ?? 0,
      activeUsers,
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
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([])
  const [selectedCampaign, setSelectedCampaign] = useState("")
  const [timeRange, setTimeRange] = useState<TimeRange>("7d")
  const [isLive, setIsLive] = useState(true)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    const loadCampaigns = () => {
      const summaries = getCampaignSummaries()
      const relevantCampaigns = isLive
        ? summaries.filter((campaign) => campaign.status === "active")
        : summaries

      setCampaigns(relevantCampaigns)

      const defaultCampaignId = relevantCampaigns[0]?.id || ""

      setSelectedCampaign((current) => {
        if (current && relevantCampaigns.some((campaign) => campaign.id === current)) return current
        return defaultCampaignId
      })
    }

    loadCampaigns()
    const unsubscribe = subscribeToFormsUpdates(loadCampaigns)
    return () => unsubscribe()
  }, [mounted, isLive])

  const selectedCampaignSummary = useMemo(() => {
    return campaigns.find((campaign) => campaign.id === selectedCampaign) || null
  }, [campaigns, selectedCampaign])

  const campaignDetails = useMemo(() => {
    if (!selectedCampaign) return null
    return getCampaignDetails(selectedCampaign)
  }, [selectedCampaign, campaigns])

  const selectedForms = useMemo(() => {
    return campaignDetails?.forms || []
  }, [campaignDetails])

  const recentForms = useMemo(() => {
    return [...selectedForms]
      .sort((a, b) => Date.parse(getLastUpdated(b) || "") - Date.parse(getLastUpdated(a) || ""))
      .slice(0, 6)
  }, [selectedForms])

  const activity = useMemo(() => {
    const items: ActivityItem[] = []

    selectedForms.forEach((form) => {
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
  }, [selectedForms])

  const currentSeries = useMemo(() => {
    if (!selectedCampaign) return []
    return buildTrendSeries(selectedForms, timeRange, 0)
  }, [selectedCampaign, selectedForms, timeRange])

  const previousSeries = useMemo(() => {
    if (!selectedCampaign) return []
    return buildTrendSeries(selectedForms, timeRange, 1)
  }, [selectedCampaign, selectedForms, timeRange])

  const aggregates = useMemo(() => {
    const totalFeedbacks = currentSeries.reduce((sum, point) => sum + point.responses, 0)
    const previousFeedbacks = previousSeries.reduce((sum, point) => sum + point.responses, 0)

    const views = currentSeries.reduce((sum, point) => sum + point.views, 0)
    const previousViews = previousSeries.reduce((sum, point) => sum + point.views, 0)

    const activeUsers = Math.round(
      currentSeries.reduce((sum, point) => sum + point.activeUsers, 0) / Math.max(1, currentSeries.length),
    )
    const previousActiveUsers = Math.round(
      previousSeries.reduce((sum, point) => sum + point.activeUsers, 0) / Math.max(1, previousSeries.length),
    )

    const weightedRatingSum = currentSeries.reduce((sum, point) => sum + point.rating * point.responses, 0)
    const previousWeightedRatingSum = previousSeries.reduce((sum, point) => sum + point.rating * point.responses, 0)

    const averageRating = totalFeedbacks > 0 ? weightedRatingSum / totalFeedbacks : 0
    const previousAverageRating = previousFeedbacks > 0 ? previousWeightedRatingSum / previousFeedbacks : 0

    return {
      totalFeedbacks,
      views,
      activeUsers,
      averageRating,
      feedbackDelta: metricDelta(totalFeedbacks, previousFeedbacks),
      viewsDelta: metricDelta(views, previousViews),
      activeUsersDelta: metricDelta(activeUsers, previousActiveUsers),
      ratingDelta: averageRating - previousAverageRating,
    }
  }, [currentSeries, previousSeries])

  const demographics = useMemo(() => {
    const weightedRating = currentSeries.reduce(
      (accumulator, point) => {
        accumulator.responses += point.responses
        accumulator.ratingSum += point.rating * point.responses
        return accumulator
      },
      { responses: 0, ratingSum: 0 },
    )

    const averageRating = weightedRating.responses > 0 ? weightedRating.ratingSum / weightedRating.responses : 0
    const positiveRatio = clamp((averageRating - 1) / 4, 0, 1)
    const neutralRatio = clamp(1 - Math.abs(averageRating - 3) / 2 - 0.25, 0.1, 0.5)
    const negativeRatio = clamp(1 - positiveRatio - neutralRatio, 0, 1)
    const totalRatio = positiveRatio + neutralRatio + negativeRatio || 1

    const positivePct = Math.round((positiveRatio / totalRatio) * 100)
    const neutralPct = Math.round((neutralRatio / totalRatio) * 100)
    const negativePct = Math.max(0, 100 - positivePct - neutralPct)

    return [
      { label: "Positive", tag: "High satisfaction", value: positivePct },
      { label: "Neutral", tag: "Mixed sentiment", value: neutralPct },
      { label: "Negative", tag: "Needs attention", value: negativePct },
    ]
  }, [currentSeries])

  const insightItems = useMemo<InsightItem[]>(() => {
    if (!currentSeries.length) return []

    const avgResponses = currentSeries.reduce((sum, point) => sum + point.responses, 0) / currentSeries.length
    const peak = currentSeries.reduce((best, point) => (point.responses > best.responses ? point : best), currentSeries[0])
    const lowest = currentSeries.reduce((worst, point) => (point.responses < worst.responses ? point : worst), currentSeries[0])
    const engagementGap = metricDelta(peak.responses, Math.max(1, Math.round(avgResponses)))
    const lowGap = metricDelta(lowest.responses, Math.max(1, Math.round(avgResponses)))
    const topDemographic = demographics.reduce((best, segment) => (segment.value > best.value ? segment : best), demographics[0])

    return [
      {
        id: "peak",
        icon: TrendingUp,
        title: `${peak.fullLabel} recorded ${peak.responses} responses`,
        detail: `${formatPercentDelta(engagementGap)} above ${timeRange === "all" ? "monthly" : "period"} average engagement.`,
      },
      {
        id: "rating",
        icon: Star,
        title: `Average rating is ${aggregates.averageRating.toFixed(1)} / 5`,
        detail: `${aggregates.ratingDelta >= 0 ? "+" : ""}${aggregates.ratingDelta.toFixed(2)} vs previous period quality score.`,
      },
      {
        id: "dip",
        icon: TrendingDown,
        title: `${lowest.fullLabel} dipped to ${lowest.responses} responses`,
        detail: `${formatPercentDelta(lowGap)} compared with the current period average baseline.`,
      },
      {
        id: "demographic",
        icon: User,
        title: `${topDemographic.label} sentiment dominates`,
        detail: `${topDemographic.value}% share indicates ${topDemographic.tag.toLowerCase()} for this campaign window.`,
      },
    ]
  }, [currentSeries, demographics, aggregates.averageRating, aggregates.ratingDelta, timeRange])

  const feedbackItems = useMemo(() => {
    return selectedForms.slice(0, 4).map((form, index) => {
      const responses = getResponsesByFormId(form.id)
      const averageScore =
        responses.length > 0
          ? responses.reduce((sum, response) => sum + deriveResponseScore(response), 0) / responses.length
          : form.status === "approved"
          ? 4.1
          : form.status === "pending"
          ? 3.7
          : 3.3

      const rating = Number(clamp(averageScore, 1, 5).toFixed(1))
      const sentiment = rating >= 4.2 ? "Positive" : rating >= 3.4 ? "Neutral" : "Negative"
      const text = form.description || `${form.title || "Form"} is collecting campaign responses and sentiment signals.`

      return {
        id: form.id,
        user: `U${index + 1}`,
        text,
        rating: Math.round(rating),
        sentiment,
      }
    })
  }, [selectedForms])

  const engagementProgress = useMemo(() => {
    if (!campaignDetails) return 0
    const target = Math.max(60, campaignDetails.formsCount * 70)
    return Math.round(clamp((campaignDetails.totalResponses / target) * 100, 0, 100))
  }, [campaignDetails])

  if (!mounted) {
    return <div className="min-h-screen bg-[#090b14]" />
  }

  return (
    <div className="min-h-screen bg-[#090b14] p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <section className="relative overflow-hidden rounded-2xl border border-[#a78bfa]/25 bg-[linear-gradient(120deg,rgba(167,139,250,0.16),rgba(17,24,39,0.58),rgba(76,29,149,0.18))] p-5 shadow-[0_12px_45px_rgba(76,29,149,0.35)] md:p-6">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#a78bfa]/20 blur-3xl" />
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-100">Campaign Performance</h1>
              <p className="mt-1 text-sm text-slate-300">Track responses, engagement, and trends in real time</p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Badge className={`border ${CAMPAIGN_STATUS_STYLE[(campaignDetails?.status || "draft") as keyof typeof CAMPAIGN_STATUS_STYLE]}`}>
                  {(campaignDetails?.status || "draft").toUpperCase()}
                </Badge>
                <span className="text-xs text-slate-300">{campaignDetails?.formsCount || 0} forms</span>
                <span className="text-xs text-slate-500">|</span>
                <span className="text-xs text-slate-300">{campaignDetails?.totalResponses || 0} total responses</span>
              </div>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                <label className="text-xs font-medium uppercase tracking-wide text-slate-400">Campaign:</label>
                {campaigns.length > 0 ? (
                  <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                    <SelectTrigger className="w-64 border-white/15 bg-[#111827]/80 text-slate-100 focus:border-[#a78bfa]/70 focus:ring-[#a78bfa]/30">
                      <SelectValue>
                        {selectedCampaignSummary ? selectedCampaignSummary.name : "Select a campaign"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="border-white/15 bg-[#111827] text-slate-100">
                      {campaigns.map((campaign) => (
                        <SelectItem key={campaign.id} value={campaign.id} className="focus:bg-[#a78bfa]/20 focus:text-slate-100">
                          {campaign.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="inline-flex h-9 items-center rounded-md border border-slate-600/40 bg-slate-500/10 px-3 text-xs text-slate-400">
                    {isLive ? "No active campaigns available" : "No campaigns available"}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setIsLive((prev) => !prev)}
                  className={`inline-flex h-11 items-center gap-3 rounded-xl border px-3.5 text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-0 ${
                    isLive
                      ? "border-emerald-400/60 bg-emerald-500/18 text-emerald-100 focus-visible:ring-emerald-300/40"
                      : "border-slate-500/50 bg-slate-700/40 text-slate-200 focus-visible:ring-slate-300/30"
                  }`}
                  aria-pressed={isLive}
                  role="switch"
                  aria-checked={isLive}
                  aria-label={`Live analytics ${isLive ? "enabled" : "disabled"}`}
                >
                  <span
                    className={`relative inline-flex h-6 w-11 items-center rounded-full border transition-colors ${
                      isLive
                        ? "border-emerald-300/60 bg-emerald-400/30"
                        : "border-slate-400/40 bg-slate-500/25"
                    }`}
                    aria-hidden="true"
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                        isLive ? "translate-x-5" : "translate-x-0.5"
                      }`}
                    />
                  </span>
                  <Activity className={`h-4 w-4 ${isLive ? "text-emerald-200" : "text-slate-300"}`} />
                  <span className="tracking-wide">Live Analytics</span>
                  <span
                    className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${
                      isLive
                        ? "bg-emerald-300/25 text-emerald-100"
                        : "bg-slate-400/20 text-slate-200"
                    }`}
                  >
                    {isLive ? "ON" : "OFF"}
                  </span>
                </button>
              </div>
            </div>

            <div className="flex flex-col items-start gap-3 sm:items-end">
              <p className="text-xs uppercase tracking-wide text-slate-400">Current Campaign</p>
              <p className="text-sm font-medium text-slate-200">{campaignDetails?.name || "No campaign available"}</p>
              <div className="w-56">
                <div className="mb-1 flex items-center justify-between text-[11px] text-slate-300">
                  <span>Engagement progress</span>
                  <span>{engagementProgress}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-700/70">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-[#8b5cf6] via-[#a78bfa] to-[#ddd6fe]"
                    style={{ width: `${engagementProgress}%` }}
                  />
                </div>
              </div>
              <Button
                onClick={() => router.push("/create-form")}
                className="w-full sm:w-auto border border-[#a78bfa]/45 bg-gradient-to-r from-[#8b5cf6]/90 to-[#a78bfa]/80 text-[#f5f7ff] shadow-[0_8px_30px_rgba(139,92,246,0.3)] hover:from-[#8b5cf6] hover:to-[#c4b5fd]"
              >
                <Plus className="mr-2 h-4 w-4" />
                + Create Form
              </Button>
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
                  ? "border-[#a78bfa]/45 bg-[#8b5cf6]/15 text-[#ddd6fe]"
                  : "border-white/15 bg-white/[0.03] text-slate-300 hover:border-[#a78bfa]/30 hover:text-slate-100"
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
              label: "Total Feedbacks",
              value: aggregates.totalFeedbacks.toLocaleString(),
              delta: formatPercentDelta(aggregates.feedbackDelta),
              positive: aggregates.feedbackDelta >= 0,
              icon: MessageSquare,
              subtext: `vs previous ${timeRange === "all" ? "year" : "period"}`,
            },
            {
              key: "rating",
              label: "Average Rating",
              value: aggregates.averageRating.toFixed(1),
              delta: `${aggregates.ratingDelta >= 0 ? "+" : ""}${aggregates.ratingDelta.toFixed(2)}`,
              positive: aggregates.ratingDelta >= 0,
              icon: Star,
              subtext: "rating points vs previous period",
            },
            {
              key: "users",
              label: "Active Users",
              value: formatCompactNumber(aggregates.activeUsers),
              delta: formatPercentDelta(aggregates.activeUsersDelta),
              positive: aggregates.activeUsersDelta >= 0,
              icon: Users,
              subtext: `vs previous ${timeRange === "all" ? "year" : "period"}`,
            },
            {
              key: "views",
              label: "Views",
              value: aggregates.views.toLocaleString(),
              delta: formatPercentDelta(aggregates.viewsDelta),
              positive: aggregates.viewsDelta >= 0,
              icon: Eye,
              subtext: `vs previous ${timeRange === "all" ? "year" : "period"}`,
            },
          ].map((metric) => {
            const trendPositive = metric.positive
            return (
              <Card key={metric.key} className="border-white/10 bg-white/[0.03] backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-400">{metric.label}</p>
                      <p className="mt-1 text-2xl font-semibold text-slate-100">{metric.value}</p>
                      <p className={`mt-1 inline-flex items-center text-xs ${trendPositive ? "text-emerald-300" : "text-rose-300"}`}>
                        {trendPositive ? <ArrowUpRight className="mr-1 h-3.5 w-3.5" /> : <ArrowDownRight className="mr-1 h-3.5 w-3.5" />}
                        {metric.delta}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-500">{metric.subtext}</p>
                    </div>
                    <metric.icon className={`h-5 w-5 ${trendPositive ? "text-emerald-300" : "text-rose-300"}`} />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </section>

        <section className="mt-5">
          <Card className="border-[#22d3ee]/35 bg-[linear-gradient(135deg,rgba(34,211,238,0.1),rgba(15,23,42,0.5),rgba(59,130,246,0.12))]">
            <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-[#a5f3fc]">
                  <BarChart3 className="h-3.5 w-3.5" />
                  Analytics Workspace
                </p>
                <h3 className="mt-1 text-base font-semibold text-slate-100">Comparative Campaign Analytics</h3>
                <p className="mt-1 text-sm text-slate-300">
                  Compare up to 3 campaigns, generate executive insights, and export reports as PDF.
                </p>
              </div>
              <Button
                onClick={() => router.push("/client/analytics")}
                className="w-full border border-[#22d3ee]/40 bg-[#0891b2]/20 text-[#ccfbf1] hover:bg-[#0891b2]/35 sm:w-auto"
              >
                Open Analytics
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.7fr_1fr]">
          <Card className="border-[#a78bfa]/30 bg-[linear-gradient(180deg,rgba(167,139,250,0.08),rgba(255,255,255,0.03))] shadow-[0_10px_30px_rgba(76,29,149,0.2)]">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold text-slate-100">Weekly Feedback Trends</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <ResponsiveContainer width="100%" height={360}>
                <AreaChart data={currentSeries} margin={{ top: 16, right: 16, left: 0, bottom: 8 }}>
                  <defs>
                    <linearGradient id="feedbackGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.05} />
                    </linearGradient>
                    <filter id="lineGlow" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                      <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  <CartesianGrid stroke="#334155" strokeDasharray="3 3" opacity={0.45} />
                  <XAxis
                    dataKey="label"
                    stroke="#94a3b8"
                    tickLine={false}
                    axisLine={{ stroke: "#334155" }}
                    interval={timeRange === "30d" ? 4 : 0}
                    label={{ value: timeRange === "all" ? "Months" : "Days", position: "insideBottom", offset: -4, fill: "#94a3b8", fontSize: 12 }}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    tickLine={false}
                    axisLine={{ stroke: "#334155" }}
                    label={{ value: "Feedback Count", angle: -90, position: "insideLeft", fill: "#94a3b8", fontSize: 12 }}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(167,139,250,0.1)" }}
                    contentStyle={{
                      backgroundColor: "#111827",
                      border: "1px solid rgba(167,139,250,0.3)",
                      borderRadius: "10px",
                      color: "#f8fafc",
                    }}
                    labelStyle={{ color: "#cbd5e1" }}
                    labelFormatter={(label: string) => `Period: ${label}`}
                    formatter={(value: number) => [value, "Feedbacks"]}
                  />
                  <Area type="monotone" dataKey="responses" stroke="#a78bfa" strokeWidth={2.8} fill="url(#feedbackGradient)" filter="url(#lineGlow)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/[0.03]">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-slate-100">Demographics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-4 pt-0">
              <div className="space-y-4">
                {demographics.map((group) => (
                  <div key={group.label}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-sm text-slate-300">{group.label} <span className="text-[11px] text-slate-500">({group.tag})</span></span>
                      <span className="text-sm font-medium text-slate-200">{group.value}%</span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-slate-700/70">
                      <div
                        className="h-2.5 rounded-full bg-gradient-to-r from-[#8b5cf6] via-[#a78bfa] to-[#c4b5fd] transition-all duration-500"
                        style={{ width: `${group.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="mt-8">
          <div className="mb-3 flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-[#c4b5fd]" />
            <h2 className="text-lg font-semibold text-slate-100">Insights</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {insightItems.map((insight) => (
              <Card key={insight.id} className="border-white/10 bg-white/[0.03]">
                <CardContent className="p-4">
                  <div className="mb-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#a78bfa]/20 text-[#ddd6fe]">
                    <insight.icon className="h-4 w-4" />
                  </div>
                  <p className="text-sm font-medium text-slate-100">{insight.title}</p>
                  <p className="mt-1 text-xs text-slate-400">{insight.detail}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <Card className="border-white/10 bg-white/[0.03]">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-slate-100">Recent Feedback</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-0">
              {feedbackItems.map((feedback) => {
                const sentimentClass =
                  feedback.sentiment === "Positive"
                    ? "border-emerald-400/35 bg-emerald-500/15 text-emerald-200"
                    : feedback.sentiment === "Negative"
                    ? "border-rose-400/35 bg-rose-500/15 text-rose-200"
                    : "border-slate-400/30 bg-slate-500/15 text-slate-300"

                return (
                  <div key={feedback.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#7c3aed] to-[#4f46e5] text-xs font-semibold text-white">
                        {feedback.user}
                      </span>
                      <p className="max-w-xl truncate text-sm text-slate-200">{feedback.text}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="border-emerald-500/30 text-emerald-300">
                        Verified
                      </Badge>
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${sentimentClass}`}>
                        {feedback.sentiment}
                      </span>
                      <div className="flex items-center">
                        {Array.from({ length: 5 }).map((_, index) => (
                          <Star
                            key={`${feedback.id}-star-${index}`}
                            className={`h-3.5 w-3.5 ${index < feedback.rating ? "fill-yellow-400 text-yellow-400" : "text-slate-600"}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )
              })}
              {!feedbackItems.length ? <p className="rounded-lg border border-white/10 bg-white/5 px-3 py-4 text-center text-sm text-slate-400">No feedback captured for this campaign yet.</p> : null}
            </CardContent>
          </Card>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.45fr_1fr]">
          <Card className="border-[#a78bfa]/35 bg-[linear-gradient(180deg,rgba(167,139,250,0.08),rgba(255,255,255,0.03))]">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-lg font-semibold text-slate-100">Recent Forms</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push("/my-forms")}
                  className="h-8 px-2 text-xs font-medium text-[#c4b5fd] hover:bg-[#a78bfa]/15 hover:text-[#ddd6fe]"
                >
                  View all <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 p-4 pt-0">
              {recentForms.length === 0 ? (
                <p className="rounded-lg border border-white/10 bg-white/5 px-3 py-6 text-center text-sm text-slate-400">
                  No forms available yet. Use Create Form to launch your first feedback campaign.
                </p>
              ) : (
                recentForms.map((form) => {
                  const canEdit = form.status === "draft" || form.status === "rejected"
                  return (
                    <div key={form.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-100">{form.title || "Untitled Form"}</p>
                        <p className="truncate text-xs text-slate-400">{form.clientName || "Company"} · {form.product || "Product"}</p>
                      </div>
                      <Badge className={`border ${STATUS_STYLES[form.status]}`}>{STATUS_LABELS[form.status]}</Badge>
                      <span className="text-xs text-slate-500">{timeAgo(getLastUpdated(form))}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          canEdit ? router.push(`/client/create-feedback?edit=${form.id}`) : router.push("/client/forms")
                        }
                        className="h-7 px-2 text-xs text-[#9df7ea] hover:bg-[#2dd4bf]/15 hover:text-[#b8fff5]"
                      >
                        {canEdit ? "Edit" : "View"}
                      </Button>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/[0.03]">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-slate-100">Activity Feed</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-4 pt-0">
              {activity.length === 0 ? (
                <p className="rounded-lg border border-white/10 bg-white/5 px-3 py-6 text-center text-sm text-slate-400">
                  No recent activity to display.
                </p>
              ) : (
                activity.map((item) => {
                  const isApproved = item.tone === "approved"
                  const isPending = item.tone === "pending"
                  const isRejected = item.tone === "rejected"
                  const iconWrapClass = isApproved
                    ? "text-emerald-300 bg-emerald-500/10"
                    : isPending
                    ? "text-amber-300 bg-amber-500/10"
                    : isRejected
                    ? "text-rose-300 bg-rose-500/10"
                    : "text-slate-300 bg-slate-500/15"

                  return (
                    <div key={item.id} className="flex items-start gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5">
                      <span className={`mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full ${iconWrapClass}`}>
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
                        <p className="text-sm text-slate-100">{item.title}</p>
                        <p className="text-xs text-slate-500">{item.time}</p>
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}
