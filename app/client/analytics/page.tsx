"use client"

import { Suspense, useEffect, useMemo, useRef, useState } from "react"
import {
  AlertCircle,
  BarChart3,
  Check,
  ChevronDown,
  Download,
  FileText,
  Layers,
  Loader2,
  Sparkles,
  TrendingUp,
} from "lucide-react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { getClientForms, getResponsesByFormId, subscribeToFormsUpdates, type FeedbackForm, type FormResponse } from "@/lib/feedback-store"
import AnalyticsPDFTemplate from "@/components/analytics-pdf-template"
import { useSearchParams } from "next/navigation"

const REPORTS_STORAGE_KEY = "trustvox.client.analytics.reports.v1"
const MAX_COMPARE_FORMS = 3
// Single-accent Ledger palette for series that need to stay distinguishable
// (compare mode caps out at 3 form slots).
const LEDGER_SERIES_COLORS = ["#EBBC6B", "#5FD0A6", "#B6BACB"]

type CampaignResponse = {
  date: string
  total: number
  positive: number
  negative: number
}

type AnalyticsCampaign = {
  id: string
  name: string
  date: string
  responses: CampaignResponse[]
}

type GrowthTrend = "increasing" | "decreasing" | "flat"
type ConsistencyLevel = "Stable" | "Moderate" | "Volatile"

type CampaignMetric = {
  campaignId: string
  campaignName: string
  totalResponses: number
  durationDays: number
  engagementRate: number
  totalPositive: number
  totalNegative: number
  positiveRate: number
  negativeRate: number
  sentimentScore: number
  consistencyScore: number
  consistencyLevel: ConsistencyLevel
  peakContributionPct: number
  dropOffPct: number
  rankScore: number
  rank: number
  trend: {
    peakDay: string
    peakResponses: number
    growthTrend: GrowthTrend
    hasSpike: boolean
  }
}

type PairwiseComparison = {
  previousCampaignId: string
  currentCampaignId: string
  previousCampaignName: string
  currentCampaignName: string
  responseChangePct: number
  negativeRateChangePct: number
}

type AnalyticsReport = {
  id: string
  generatedAt: string
  campaignIds: string[]
  summaryLines: string[]
  insights: string[]
  comparativeAnalysis: string[]
  patternObservations: string[]
  finalRecommendation: string
  finalSummary: string[]
  highlights: {
    bestPerforming: string
    highestEngagement: string
    bestSentiment: string
    mostVolatile: string
  }
  metrics: CampaignMetric[]
  pairwise: PairwiseComparison[]
}

type CampaignSlots = [string | null, string | null, string | null]
type AnalysisMode = "single" | "compare"

type LineChartRow = {
  date: string
  label: string
  [key: string]: string | number
}

function formatDateLabel(value: string): string {
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) return value
  return new Date(parsed).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

function formatDeltaPercent(value: number): string {
  const safe = Number.isFinite(value) ? value : 0
  const rounded = safe.toFixed(1)
  return `${safe > 0 ? "+" : ""}${rounded}%`
}

function calculatePercentageChange(current: number, previous: number): number {
  if (previous <= 0) return 0
  return ((current - previous) / previous) * 100
}

function calculateCampaignMetrics(campaign: AnalyticsCampaign): CampaignMetric {
  const totalResponses = campaign.responses.reduce((sum, item) => sum + item.total, 0)
  const durationDays = Math.max(1, campaign.responses.length)
  const engagementRate = totalResponses / durationDays
  const totalPositive = campaign.responses.reduce((sum, item) => sum + item.positive, 0)
  const totalNegative = campaign.responses.reduce((sum, item) => sum + item.negative, 0)
  const positiveRate = totalResponses > 0 ? totalPositive / totalResponses : 0
  const negativeRate = totalResponses > 0 ? totalNegative / totalResponses : 0
  const sentimentScore = (positiveRate - negativeRate) * 100

  const peak = campaign.responses.reduce<CampaignResponse | null>((currentPeak, entry) => {
    if (!currentPeak || entry.total > currentPeak.total) return entry
    return currentPeak
  }, null)

  const first = campaign.responses[0]
  const last = campaign.responses[campaign.responses.length - 1]
  const growthRatio = first && last && first.total > 0 ? (last.total - first.total) / first.total : 0
  const growthTrend =
    growthRatio > 0.05 ? "increasing" : growthRatio < -0.05 ? "decreasing" : "flat"

  const avgDaily =
    campaign.responses.length > 0
      ? campaign.responses.reduce((sum, entry) => sum + entry.total, 0) / campaign.responses.length
      : 0

  const variance =
    durationDays > 0
      ? campaign.responses.reduce((sum, entry) => sum + (entry.total - avgDaily) ** 2, 0) / durationDays
      : 0
  const standardDeviation = Math.sqrt(variance)
  const consistencyScore = avgDaily > 0 ? standardDeviation / avgDaily : 0
  const consistencyLevel: ConsistencyLevel =
    consistencyScore <= 0.2 ? "Stable" : consistencyScore <= 0.45 ? "Moderate" : "Volatile"

  const hasSpike = Boolean(peak && avgDaily > 0 && peak.total >= avgDaily * 1.3)
  const peakContributionPct = totalResponses > 0 && peak ? (peak.total / totalResponses) * 100 : 0

  const peakIndex = peak ? campaign.responses.findIndex((entry) => entry.date === peak.date) : -1
  const postPeak = peakIndex >= 0 ? campaign.responses.slice(peakIndex + 1) : []
  const postPeakAverage =
    postPeak.length > 0 ? postPeak.reduce((sum, entry) => sum + entry.total, 0) / postPeak.length : peak?.total ?? 0
  const dropOffPct = peak && peak.total > 0 ? ((peak.total - postPeakAverage) / peak.total) * 100 : 0

  return {
    campaignId: campaign.id,
    campaignName: campaign.name,
    totalResponses,
    durationDays,
    engagementRate,
    totalPositive,
    totalNegative,
    positiveRate,
    negativeRate,
    sentimentScore,
    consistencyScore,
    consistencyLevel,
    peakContributionPct,
    dropOffPct,
    rankScore: 0,
    rank: 0,
    trend: {
      peakDay: peak?.date ?? "-",
      peakResponses: peak?.total ?? 0,
      growthTrend,
      hasSpike,
    },
  }
}

function calculatePairwiseComparisons(metrics: CampaignMetric[]): PairwiseComparison[] {
  const pairs: PairwiseComparison[] = []
  for (let index = 0; index < metrics.length; index += 1) {
    for (let next = index + 1; next < metrics.length; next += 1) {
      const previous = metrics[index]
      const current = metrics[next]
      if (!previous || !current) continue
      pairs.push({
        previousCampaignId: previous.campaignId,
        currentCampaignId: current.campaignId,
        previousCampaignName: previous.campaignName,
        currentCampaignName: current.campaignName,
        responseChangePct: calculatePercentageChange(current.totalResponses, previous.totalResponses),
        negativeRateChangePct: calculatePercentageChange(current.negativeRate, previous.negativeRate),
      })
    }
  }
  return pairs
}

function generateInsights(metrics: CampaignMetric[], pairwise: PairwiseComparison[]): string[] {
  const insightLines: string[] = []

  pairwise.forEach((comparison) => {
    if (Math.abs(comparison.responseChangePct) >= 10) {
      insightLines.push(
        `${comparison.currentCampaignName} vs ${comparison.previousCampaignName}: response shift ${formatDeltaPercent(comparison.responseChangePct)} and negative-rate shift ${formatDeltaPercent(comparison.negativeRateChangePct)}.`,
      )
    }
  })

  metrics.forEach((metric) => {
    if (metric.totalResponses === 0) {
      insightLines.push(`${metric.campaignName}: no responses recorded yet — insights will populate once feedback comes in.`)
      return
    }

    if (metric.sentimentScore < 10) {
      insightLines.push(
        `${metric.campaignName}: sentiment score ${metric.sentimentScore.toFixed(1)} with ${formatPercent(metric.negativeRate)} negative responses indicates a quality-risk zone.`,
      )
    }

    if (metric.dropOffPct > 18) {
      insightLines.push(
        `${metric.campaignName}: drop-off detected at ${metric.dropOffPct.toFixed(1)}% after peak day ${formatDateLabel(metric.trend.peakDay)}.`,
      )
    }

    insightLines.push(
      `${metric.campaignName}: engagement ${metric.engagementRate.toFixed(1)} responses/day, consistency ${metric.consistencyLevel.toLowerCase()} (CV ${metric.consistencyScore.toFixed(2)}), peak contribution ${metric.peakContributionPct.toFixed(1)}%.`,
    )
  })

  if (insightLines.length === 0) {
    insightLines.push("No major anomalies detected. Form performance remains stable across the selected period.")
  }

  return insightLines
}

function applyCampaignRanking(metrics: CampaignMetric[]): CampaignMetric[] {
  if (metrics.length === 0) return []

  const maxEngagement = Math.max(...metrics.map((metric) => metric.engagementRate), 1)
  const maxConsistencyScore = Math.max(...metrics.map((metric) => metric.consistencyScore), 0.01)

  const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

  const RANK_WEIGHTS = {
    engagement: 0.32,
    sentiment: 0.28,
    growth: 0.14,
    consistency: 0.14,
    dropOffResilience: 0.08,
    peakBalance: 0.04,
  }

  const withScores = metrics.map((metric) => {
    const normalizedEngagement = metric.engagementRate / maxEngagement
    const normalizedSentiment = clamp01((metric.sentimentScore + 100) / 200)
    const growthScore = metric.trend.growthTrend === "increasing" ? 1 : metric.trend.growthTrend === "flat" ? 0.65 : 0.35
    const consistencyStability = clamp01(1 - metric.consistencyScore / maxConsistencyScore)
    const dropOffResilience = clamp01(1 - Math.max(0, metric.dropOffPct) / 100)

    // Peak around 35% is healthier than very concentrated single-day spikes.
    const peakBalance = clamp01(1 - Math.abs(metric.peakContributionPct - 35) / 35)

    const rankScore =
      normalizedEngagement * RANK_WEIGHTS.engagement +
      normalizedSentiment * RANK_WEIGHTS.sentiment +
      growthScore * RANK_WEIGHTS.growth +
      consistencyStability * RANK_WEIGHTS.consistency +
      dropOffResilience * RANK_WEIGHTS.dropOffResilience +
      peakBalance * RANK_WEIGHTS.peakBalance

    return {
      ...metric,
      rankScore,
      rank: 0,
    }
  })

  const orderedIds = [...withScores]
    .sort((first, second) => second.rankScore - first.rankScore)
    .map((metric) => metric.campaignId)

  return withScores.map((metric) => ({
    ...metric,
    rank: orderedIds.indexOf(metric.campaignId) + 1,
  }))
}

function buildComparativeAnalysis(metrics: CampaignMetric[]): string[] {
  if (metrics.length < 2) {
    return ["Comparative analysis requires at least two forms. Add another form to unlock side-by-side interpretation."]
  }

  const ranked = [...metrics].sort((first, second) => first.rank - second.rank)
  const best = ranked[0]
  const weakest = ranked[ranked.length - 1]
  const sentimentLeader = [...metrics].sort((first, second) => second.sentimentScore - first.sentimentScore)[0]

  if (!best || !weakest || !sentimentLeader) return []

  return [
    `${best.campaignName} leads the set with rank score ${best.rankScore.toFixed(2)}, engagement ${best.engagementRate.toFixed(1)} responses/day, and sentiment score ${best.sentimentScore.toFixed(1)}.`,
    `${weakest.campaignName} trails with rank score ${weakest.rankScore.toFixed(2)} and consistency ${weakest.consistencyLevel.toLowerCase()}, indicating weaker retention rhythm versus peers.`,
    `${sentimentLeader.campaignName} shows the strongest audience quality signal with ${formatPercent(sentimentLeader.positiveRate)} positive responses against ${formatPercent(sentimentLeader.negativeRate)} negative.`,
  ]
}

function buildPatternObservations(metrics: CampaignMetric[]): string[] {
  if (metrics.length === 0) return []

  const mostVolatile = [...metrics].sort((first, second) => second.consistencyScore - first.consistencyScore)[0]
  const highestPeak = [...metrics].sort((first, second) => second.peakContributionPct - first.peakContributionPct)[0]
  const biggestDropOff = [...metrics].sort((first, second) => second.dropOffPct - first.dropOffPct)[0]

  return [
    `${mostVolatile?.campaignName || "This form"} is the most volatile pattern with consistency score ${mostVolatile?.consistencyScore.toFixed(2) || "0.00"}.`,
    `${highestPeak?.campaignName || "This form"} has the strongest peak concentration (${highestPeak?.peakContributionPct.toFixed(1) || "0.0"}% of responses on ${formatDateLabel(highestPeak?.trend.peakDay || "-")}).`,
    `${biggestDropOff?.campaignName || "This form"} shows the sharpest post-peak decline at ${biggestDropOff?.dropOffPct.toFixed(1) || "0.0"}%.`,
  ]
}

function buildFinalRecommendation(metrics: CampaignMetric[]): string {
  if (metrics.length === 0) return "No recommendation available because no form metrics are present."
  const best = [...metrics].sort((first, second) => first.rank - second.rank)[0]
  if (!best) return "No recommendation available."
  return `Recommended form to double down on: ${best.campaignName} (rank #${best.rank}) due to engagement ${best.engagementRate.toFixed(1)} responses/day, sentiment score ${best.sentimentScore.toFixed(1)}, and ${best.consistencyLevel.toLowerCase()} consistency.`
}

function buildFinalSummary(metrics: CampaignMetric[]): string[] {
  if (metrics.length === 0) {
    return [
      "Comparative output is currently limited by missing form activity.",
      "Add form responses to unlock engagement and sentiment conclusions.",
      "Once data is available, this section will produce a final recommendation.",
      "Current state indicates insufficient volume for strategic decision-making.",
    ]
  }

  const best = [...metrics].sort((first, second) => first.rank - second.rank)[0]
  const bestSentiment = [...metrics].sort((first, second) => second.sentimentScore - first.sentimentScore)[0]
  const mostVolatile = [...metrics].sort((first, second) => second.consistencyScore - first.consistencyScore)[0]

  return [
    `${best?.campaignName || "The top form"} leads overall performance with ${best?.engagementRate.toFixed(1) || "0.0"} responses/day and rank #${best?.rank || 0}.`,
    `${bestSentiment?.campaignName || "The leading form"} delivers the strongest sentiment profile at ${bestSentiment?.sentimentScore.toFixed(1) || "0.0"} score.`,
    `${mostVolatile?.campaignName || "The most volatile form"} needs pacing optimization due to ${mostVolatile?.consistencyLevel.toLowerCase() || "moderate"} response volatility.`,
    "Overall the form set shows positive audience reception with targeted room to improve post-peak retention.",
    `${best?.campaignName || "The leading form"} is recommended to prioritize while sentiment-leading forms can be used for precision targeting.`,
  ]
}

function buildReportHighlights(metrics: CampaignMetric[]): AnalyticsReport["highlights"] {
  if (metrics.length === 0) {
    return {
      bestPerforming: "N/A",
      highestEngagement: "N/A",
      bestSentiment: "N/A",
      mostVolatile: "N/A",
    }
  }

  const bestPerforming = [...metrics].sort((first, second) => first.rank - second.rank)[0]
  const highestEngagement = [...metrics].sort((first, second) => second.engagementRate - first.engagementRate)[0]
  const bestSentiment = [...metrics].sort((first, second) => second.sentimentScore - first.sentimentScore)[0]
  const mostVolatile = [...metrics].sort((first, second) => second.consistencyScore - first.consistencyScore)[0]

  return {
    bestPerforming: bestPerforming?.campaignName || "N/A",
    highestEngagement: highestEngagement?.campaignName || "N/A",
    bestSentiment: bestSentiment?.campaignName || "N/A",
    mostVolatile: mostVolatile?.campaignName || "N/A",
  }
}

function createAnalyticsReport(input: {
  id: string
  generatedAt: string
  campaignIds: string[]
  metrics: CampaignMetric[]
  pairwise: PairwiseComparison[]
}): AnalyticsReport {
  const rankedMetrics = applyCampaignRanking(input.metrics)
  const summaryLines = buildSummaryLines(rankedMetrics, input.pairwise)
  const insights = generateInsights(rankedMetrics, input.pairwise)
  const comparativeAnalysis = buildComparativeAnalysis(rankedMetrics)
  const patternObservations = buildPatternObservations(rankedMetrics)
  const finalRecommendation = buildFinalRecommendation(rankedMetrics)
  const finalSummary = buildFinalSummary(rankedMetrics)
  const highlights = buildReportHighlights(rankedMetrics)

  return {
    id: input.id,
    generatedAt: input.generatedAt,
    campaignIds: input.campaignIds,
    metrics: rankedMetrics,
    pairwise: input.pairwise,
    summaryLines,
    insights,
    comparativeAnalysis,
    patternObservations,
    finalRecommendation,
    finalSummary,
    highlights,
  }
}

function normalizeMetric(raw: Partial<CampaignMetric>): CampaignMetric {
  return {
    campaignId: raw.campaignId || "unknown-form",
    campaignName: raw.campaignName || "Unknown Form",
    totalResponses: raw.totalResponses ?? 0,
    durationDays: raw.durationDays ?? 1,
    engagementRate: raw.engagementRate ?? 0,
    totalPositive: raw.totalPositive ?? 0,
    totalNegative: raw.totalNegative ?? 0,
    positiveRate: raw.positiveRate ?? 0,
    negativeRate: raw.negativeRate ?? 0,
    sentimentScore: raw.sentimentScore ?? 0,
    consistencyScore: raw.consistencyScore ?? 0,
    consistencyLevel: raw.consistencyLevel || "Moderate",
    peakContributionPct: raw.peakContributionPct ?? 0,
    dropOffPct: raw.dropOffPct ?? 0,
    rankScore: raw.rankScore ?? 0,
    rank: raw.rank ?? 0,
    trend: {
      peakDay: raw.trend?.peakDay || "-",
      peakResponses: raw.trend?.peakResponses ?? 0,
      growthTrend: raw.trend?.growthTrend || "flat",
      hasSpike: raw.trend?.hasSpike ?? false,
    },
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function calculateCampaignHealthScore(metric: CampaignMetric): number {
  const score =
    50 +
    metric.sentimentScore * 0.25 +
    metric.engagementRate * 2 -
    metric.consistencyScore * 35 -
    Math.max(0, metric.dropOffPct) * 0.25

  return Number(clamp(score, 0, 100).toFixed(1))
}

function buildSingleCampaignSummary(metric: CampaignMetric, healthScore: number): string[] {
  if (metric.totalResponses === 0) {
    return [`${metric.campaignName} has no recorded responses yet — the summary below will populate once feedback comes in.`]
  }

  const trendLabel =
    metric.trend.growthTrend === "increasing"
      ? "increasing"
      : metric.trend.growthTrend === "decreasing"
      ? "decreasing"
      : "fluctuating"

  return [
    `${metric.campaignName} recorded ${metric.totalResponses} total responses over ${metric.durationDays} active days at ${metric.engagementRate.toFixed(2)} responses per day.`,
    `Sentiment profile stands at ${metric.sentimentScore.toFixed(1)} with ${formatPercent(metric.positiveRate)} positive and ${formatPercent(metric.negativeRate)} negative responses.`,
    `Growth pattern is ${trendLabel} with a peak contribution of ${metric.peakContributionPct.toFixed(1)}% and post-peak drop-off of ${metric.dropOffPct.toFixed(1)}%.`,
    `Overall form health score is ${healthScore.toFixed(1)}/100, indicating ${healthScore >= 70 ? "strong" : healthScore >= 50 ? "moderate" : "at-risk"} performance quality.`,
  ]
}

function buildSummaryLines(metrics: CampaignMetric[], pairwise: PairwiseComparison[]): string[] {
  if (metrics.length === 0) return ["No summary available."]

  const bestCampaign = [...metrics].sort((first, second) => {
    if (second.totalResponses !== first.totalResponses) {
      return second.totalResponses - first.totalResponses
    }
    return second.positiveRate - first.positiveRate
  })[0]

  if (!bestCampaign) return ["No summary available."]

  const risingCount = metrics.filter((metric) => metric.trend.growthTrend === "increasing").length
  const decliningCount = metrics.filter((metric) => metric.trend.growthTrend === "decreasing").length

  const topShift = [...pairwise].sort(
    (first, second) => Math.abs(second.responseChangePct) - Math.abs(first.responseChangePct),
  )[0]

  const highNegative = metrics.filter((metric) => metric.negativeRate > 0.4)

  const lines = [
    bestCampaign.totalResponses > 0
      ? `${bestCampaign.campaignName} is the best-performing form with ${bestCampaign.totalResponses} total responses and ${formatPercent(bestCampaign.positiveRate)} positive feedback.`
      : "None of the selected forms have recorded responses yet.",
    topShift
      ? `Largest comparative shift: ${topShift.currentCampaignName} vs ${topShift.previousCampaignName} (${formatDeltaPercent(topShift.responseChangePct)} response change).`
      : "Comparative shifts are limited due to fewer form combinations.",
    risingCount > decliningCount
      ? "Overall trend indicates broader engagement growth across selected forms."
      : decliningCount > risingCount
      ? "Overall trend indicates engagement softening across selected forms."
      : "Overall trend is balanced with no dominant directional shift.",
    highNegative.length > 0
      ? `Risk note: ${highNegative.map((metric) => metric.campaignName).join(", ")} show elevated negative feedback and should be reviewed.`
      : "Customer sentiment remains within healthy thresholds for the selected set.",
  ]

  return lines
}

function getCampaignTotalResponses(campaign: AnalyticsCampaign): number {
  return campaign.responses.reduce((sum, item) => sum + item.total, 0)
}

function buildLineChartData(selectedCampaigns: AnalyticsCampaign[]): LineChartRow[] {
  const allDates = Array.from(
    new Set(selectedCampaigns.flatMap((campaign) => campaign.responses.map((response) => response.date))),
  ).sort((first, second) => Date.parse(String(first)) - Date.parse(String(second))) as string[]

  return allDates.map((date) => {
    const row: LineChartRow = {
      date,
      label: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    }

    selectedCampaigns.forEach((campaign) => {
      const match = campaign.responses.find((response) => response.date === date)
      row[campaign.name] = match?.total ?? 0
    })

    return row
  })
}

function buildBarChartData(metrics: CampaignMetric[]) {
  return metrics.map((metric) => ({
    name: metric.campaignName,
    positive: metric.totalPositive,
    negative: metric.totalNegative,
  }))
}

function buildResponseDistributionData(metrics: CampaignMetric[]) {
  const totalResponses = metrics.reduce((sum, metric) => sum + metric.totalResponses, 0)
  return metrics.map((metric) => ({
    name: metric.campaignName,
    value: metric.totalResponses,
    sharePct: totalResponses > 0 ? (metric.totalResponses / totalResponses) * 100 : 0,
  }))
}

function buildSentimentTrendData(campaigns: AnalyticsCampaign[]) {
  const byDate = new Map<string, { positive: number; negative: number; total: number }>()

  campaigns.forEach((campaign) => {
    campaign.responses.forEach((entry) => {
      const normalizedDate = new Date(entry.date).toISOString().slice(0, 10)
      const current = byDate.get(normalizedDate) || { positive: 0, negative: 0, total: 0 }
      byDate.set(normalizedDate, {
        positive: current.positive + entry.positive,
        negative: current.negative + entry.negative,
        total: current.total + entry.total,
      })
    })
  })

  return Array.from(byDate.entries())
    .sort((first, second) => Date.parse(first[0]) - Date.parse(second[0]))
    .map(([date, totals]) => {
      const sentimentScore = totals.total > 0 ? ((totals.positive - totals.negative) / totals.total) * 100 : 0
      return {
        date,
        label: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        positive: totals.positive,
        negative: totals.negative,
        sentimentScore: Number(sentimentScore.toFixed(1)),
      }
    })
}

function buildScatterData(metrics: CampaignMetric[]) {
  return metrics.map((metric) => ({
    campaignName: metric.campaignName,
    responses: metric.totalResponses,
    sentimentScore: Number(metric.sentimentScore.toFixed(1)),
    engagementRate: Number(metric.engagementRate.toFixed(1)),
  }))
}

function toThreeSlots(campaignIds: string[]): CampaignSlots {
  return [campaignIds[0] ?? null, campaignIds[1] ?? null, campaignIds[2] ?? null]
}

// Real star rating (1-5) if the form captured one; otherwise a neutral
// midpoint. No keyword/text sentiment guessing — that's fabricated signal.
function deriveResponseScore(response: FormResponse): number {
  const values = Object.values(response.answers || {})
  const numeric = values.find((value) => typeof value === "number")
  if (typeof numeric === "number") return numeric
  return 3
}

// Only real submitted responses build a campaign's response curve. Forms
// with zero real responses correctly show up as zero-response campaigns —
// no fabricated multi-day curve invented from a hashed seed. Responses are
// bucketed by calendar day (not a running cumulative counter) so summing
// `total`/`positive`/`negative` across entries gives the true count instead
// of double-counting via a cumulative snapshot.
async function buildCampaignResponsesFromForm(form: FeedbackForm): Promise<CampaignResponse[]> {
  const responses = await getResponsesByFormId(form.id)

  const byDate = new Map<string, CampaignResponse>()

  responses.forEach((response) => {
    const dateKey = new Date(response.submittedAt).toISOString().slice(0, 10)
    const bucket = byDate.get(dateKey) || { date: dateKey, total: 0, positive: 0, negative: 0 }
    const score = deriveResponseScore(response)

    bucket.total += 1
    if (score >= 4) bucket.positive += 1
    else if (score <= 2) bucket.negative += 1

    byDate.set(dateKey, bucket)
  })

  return Array.from(byDate.values()).sort((left, right) => Date.parse(left.date) - Date.parse(right.date))
}

// Real client forms only. No fabricated "Campaign A-E" filler blended in —
// if there are genuinely zero forms, the page shows an honest empty state.
async function buildAnalyticsCampaigns(): Promise<AnalyticsCampaign[]> {
  const forms = await getClientForms()

  const campaigns = await Promise.all(
    forms.map(async (form, index) => ({
      id: form.id,
      name: form.title || form.product || `Campaign ${index + 1}`,
      date: form.submittedAt || form.createdAt,
      responses: await buildCampaignResponsesFromForm(form),
    })),
  )

  return campaigns.sort((left, right) => Date.parse(right.date) - Date.parse(left.date))
}

function ClientAnalyticsPageContent() {
  const searchParams = useSearchParams()
  const reportSectionRef = useRef<HTMLElement | null>(null)
  const autoDownloadTokenRef = useRef<string>("")

  const [campaigns, setCampaigns] = useState<AnalyticsCampaign[]>([])
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>("single")
  const [singleCampaignId, setSingleCampaignId] = useState<string>("")
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<CampaignSlots>([null, null, null])
  const [warning, setWarning] = useState("")
  const [reports, setReports] = useState<AnalyticsReport[]>([])
  const [activeReportId, setActiveReportId] = useState<string | null>(null)
  const [singleReportId, setSingleReportId] = useState<string | null>(null)
  const [pdfReportId, setPdfReportId] = useState<string | null>(null)
  const [isHydrated, setIsHydrated] = useState(false)

  // AI summary (Phase 11 · Session 11.6) — keyed by formId so switching the
  // selected single form doesn't show a stale summary from a different form.
  const [aiSummaryFormId, setAiSummaryFormId] = useState<string | null>(null)
  const [aiSummaryText, setAiSummaryText] = useState<string | null>(null)
  const [aiSummaryInsufficientCount, setAiSummaryInsufficientCount] = useState<number | null>(null)
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false)
  const [aiSummaryError, setAiSummaryError] = useState<string | null>(null)

  const campaignMap = useMemo(() => new Map(campaigns.map((campaign) => [campaign.id, campaign])), [campaigns])

  useEffect(() => {
    let active = true
    const loadCampaigns = async () => {
      const built = await buildAnalyticsCampaigns()
      if (active) setCampaigns(built)
    }
    const handleUpdate = () => void loadCampaigns()

    void loadCampaigns()
    const unsubscribe = subscribeToFormsUpdates(handleUpdate)
    window.addEventListener("focus", handleUpdate)

    return () => {
      active = false
      unsubscribe()
      window.removeEventListener("focus", handleUpdate)
    }
  }, [])

  useEffect(() => {
    setIsHydrated(true)
    try {
      const raw = window.localStorage.getItem(REPORTS_STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as Array<Partial<AnalyticsReport>>
      if (!Array.isArray(parsed)) return
      const normalized = parsed
        .filter((entry) => typeof entry?.id === "string")
        .map((entry) =>
          createAnalyticsReport({
            id: entry.id as string,
            generatedAt: typeof entry.generatedAt === "string" ? entry.generatedAt : new Date().toISOString(),
            campaignIds: Array.isArray(entry.campaignIds)
              ? entry.campaignIds.filter((id): id is string => typeof id === "string")
              : [],
            metrics: Array.isArray(entry.metrics)
              ? (entry.metrics as Array<Partial<CampaignMetric>>).map((metric) => normalizeMetric(metric))
              : [],
            pairwise: Array.isArray(entry.pairwise) ? (entry.pairwise as PairwiseComparison[]) : [],
          }),
        )

      setReports(normalized)
      if (normalized[0]?.id) {
        setActiveReportId(normalized[0].id)
      }
    } catch {
      setReports([])
    }
  }, [])

  useEffect(() => {
    if (!isHydrated) return
    window.localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(reports))
  }, [isHydrated, reports])

  const selectedCampaigns = useMemo(() => {
    const uniqueIds = selectedCampaignIds.filter((id): id is string => Boolean(id))
    return uniqueIds
      .map((id) => campaignMap.get(id))
      .filter((campaign): campaign is AnalyticsCampaign => Boolean(campaign))
      .sort((first, second) => Date.parse(first.date) - Date.parse(second.date))
  }, [campaignMap, selectedCampaignIds])

  const activeReport = useMemo(() => {
    if (!activeReportId) return null
    return reports.find((report) => report.id === activeReportId) ?? null
  }, [activeReportId, reports])

  const singleReport = useMemo(() => {
    if (!singleReportId) return null
    return reports.find((report) => report.id === singleReportId) ?? null
  }, [reports, singleReportId])

  const activeReportCampaigns = useMemo(() => {
    if (!activeReport) return []
    return activeReport.campaignIds
      .map((id) => campaignMap.get(id))
      .filter((campaign): campaign is AnalyticsCampaign => Boolean(campaign))
  }, [activeReport, campaignMap])

  const lineChartData = useMemo(() => buildLineChartData(activeReportCampaigns), [activeReportCampaigns])
  const barChartData = useMemo(() => buildBarChartData(activeReport?.metrics ?? []), [activeReport])
  const responseDistributionData = useMemo(
    () => buildResponseDistributionData(activeReport?.metrics ?? []),
    [activeReport],
  )
  const sentimentTrendData = useMemo(
    () => buildSentimentTrendData(activeReportCampaigns),
    [activeReportCampaigns],
  )
  const responseVsSentimentData = useMemo(
    () => buildScatterData(activeReport?.metrics ?? []),
    [activeReport],
  )

  const reportCampaignLabel = useMemo(() => {
    if (!activeReport) return ""
    return activeReport.campaignIds
      .map((id) => campaignMap.get(id)?.name ?? id)
      .join(" vs ")
  }, [activeReport, campaignMap])

  const comparativeHighlights = useMemo(() => {
    if (!activeReport) return []

    const strongestDelta = [...activeReport.pairwise].sort(
      (first, second) => Math.abs(second.responseChangePct) - Math.abs(first.responseChangePct),
    )[0]
    const strongestSentiment = [...activeReport.metrics].sort((first, second) => second.sentimentScore - first.sentimentScore)[0]

    return [
      strongestDelta
        ? `Largest movement: ${strongestDelta.currentCampaignName} vs ${strongestDelta.previousCampaignName} (${formatDeltaPercent(strongestDelta.responseChangePct)} response change).`
        : "Largest movement: not enough pairwise data.",
      strongestSentiment
        ? `Best sentiment quality: ${strongestSentiment.campaignName} (${strongestSentiment.sentimentScore.toFixed(1)} sentiment score).`
        : "Best sentiment quality: unavailable.",
    ]
  }, [activeReport])

  const singleCampaign = useMemo(() => {
    if (!singleCampaignId) return null
    return campaignMap.get(singleCampaignId) || null
  }, [campaignMap, singleCampaignId])

  const singleMetric = useMemo(() => {
    if (!singleCampaign) return null
    return calculateCampaignMetrics(singleCampaign)
  }, [singleCampaign])

  const singleHealthScore = useMemo(() => {
    if (!singleMetric) return 0
    return calculateCampaignHealthScore(singleMetric)
  }, [singleMetric])

  const singleSummaryLines = useMemo(() => {
    if (!singleMetric) return []
    return buildSingleCampaignSummary(singleMetric, singleHealthScore)
  }, [singleHealthScore, singleMetric])

  const singleTrendRows = useMemo<LineChartRow[]>(() => {
    if (!singleCampaign) return []
    return singleCampaign.responses.map((entry) => ({
      date: entry.date,
      label: new Date(entry.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      [singleCampaign.name]: entry.total,
    }))
  }, [singleCampaign])

  const pdfReport = useMemo(() => {
    if (pdfReportId) {
      const matched = reports.find((report) => report.id === pdfReportId)
      if (matched) return matched
    }
    return activeReport
  }, [activeReport, pdfReportId, reports])

  const pdfCampaignLabel = useMemo(() => {
    if (!pdfReport) return ""
    return pdfReport.campaignIds.map((id) => campaignMap.get(id)?.name ?? id).join(" vs ")
  }, [campaignMap, pdfReport])

  const pdfReportCampaigns = useMemo(() => {
    if (!pdfReport) return []
    return pdfReport.campaignIds
      .map((id) => campaignMap.get(id))
      .filter((campaign): campaign is AnalyticsCampaign => Boolean(campaign))
  }, [campaignMap, pdfReport])

  const pdfLineChartData = useMemo(() => buildLineChartData(pdfReportCampaigns), [pdfReportCampaigns])
  const pdfBarChartData = useMemo(() => buildBarChartData(pdfReport?.metrics ?? []), [pdfReport])
  const pdfResponseDistributionData = useMemo(
    () => buildResponseDistributionData(pdfReport?.metrics ?? []),
    [pdfReport],
  )
  const pdfSentimentTrendData = useMemo(
    () => buildSentimentTrendData(pdfReportCampaigns),
    [pdfReportCampaigns],
  )
  const pdfResponseVsSentimentData = useMemo(
    () => buildScatterData(pdfReport?.metrics ?? []),
    [pdfReport],
  )

  useEffect(() => {
    const requestedMode = searchParams.get("mode")
    if (requestedMode === "single" || requestedMode === "compare") {
      setAnalysisMode(requestedMode)
    }

    const campaign = searchParams.get("campaign")
    if (campaign) {
      setAnalysisMode("single")
      setSingleCampaignId(campaign)
    }

    const campaignsParam = searchParams.get("campaigns")
    if (campaignsParam) {
      const ids = campaignsParam
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean)
        .slice(0, 3)

      if (ids.length > 0) {
        setAnalysisMode("compare")
        setSelectedCampaignIds(toThreeSlots(ids))
      }
    }

    const reportId = searchParams.get("reportId")
    if (reportId) {
      const existing = reports.find((report) => report.id === reportId)
      if (existing) {
        if (existing.campaignIds.length === 1) {
          setAnalysisMode("single")
          setSingleCampaignId(existing.campaignIds[0] || "")
          setSingleReportId(existing.id)
        } else {
          setAnalysisMode("compare")
          setActiveReportId(reportId)
          setSelectedCampaignIds(toThreeSlots(existing.campaignIds))
        }
      }
    }

    const shouldDownload = searchParams.get("download") === "1"
    if (reportId && shouldDownload) {
      const token = `${reportId}:download`
      if (autoDownloadTokenRef.current !== token) {
        autoDownloadTokenRef.current = token
        const existing = reports.find((report) => report.id === reportId)
        if (existing) {
          void exportReportToPdf(existing)
        }
      }
    }
    // exportReportToPdf is declared further down in this component (not yet hoisted at
    // this point), and the autoDownloadTokenRef guard above already prevents
    // duplicate/stale downloads, so omitting it here is safe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reports, searchParams])

  // Click-to-select comparison: toggle a form in/out of the (up to 3) compare
  // set. Replaces the old drag-and-drop-into-slots flow. The underlying
  // `CampaignSlots` shape is kept so saved reports + the `?campaigns=` URL
  // param continue to work unchanged.
  const compareCount = selectedCampaignIds.filter((id): id is string => Boolean(id)).length

  const toggleCompareForm = (formId: string) => {
    setSelectedCampaignIds((current) => {
      const chosen = current.filter((id): id is string => Boolean(id))

      if (chosen.includes(formId)) {
        setWarning("")
        return toThreeSlots(chosen.filter((id) => id !== formId))
      }

      if (chosen.length >= MAX_COMPARE_FORMS) {
        setWarning(`You can compare up to ${MAX_COMPARE_FORMS} forms at once. Deselect one first.`)
        return current
      }

      setWarning("")
      return toThreeSlots([...chosen, formId])
    })
  }

  const clearCompareSelection = () => {
    setSelectedCampaignIds([null, null, null])
    setWarning("")
  }

  const scrollToReportOutput = () => {
    window.setTimeout(() => {
      reportSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    }, 120)
  }

  const runReportGeneration = () => {
    const uniqueCampaignIds = Array.from(new Set(selectedCampaigns.map((campaign) => campaign.id)))

    if (uniqueCampaignIds.length < 2) {
      setWarning("Select at least 2 forms to generate a comparison report.")
      return
    }

    setWarning("")

    const selected = uniqueCampaignIds
      .map((id) => campaignMap.get(id))
      .filter((campaign): campaign is AnalyticsCampaign => Boolean(campaign))
      .sort((first, second) => Date.parse(first.date) - Date.parse(second.date))

    const metrics = selected.map(calculateCampaignMetrics)
    const pairwise = calculatePairwiseComparisons(metrics)
    const report = createAnalyticsReport({
      id: String(Date.now()),
      generatedAt: new Date().toISOString(),
      campaignIds: selected.map((campaign) => campaign.id),
      metrics,
      pairwise,
    })

    setReports((current) => [report, ...current].slice(0, 15))
    setActiveReportId(report.id)
    setSelectedCampaignIds(toThreeSlots(report.campaignIds))
    scrollToReportOutput()
  }

  const analyzeSingleCampaign = () => {
    if (!singleCampaignId) {
      setWarning("Select a form to run single analysis.")
      return
    }

    const selected = campaignMap.get(singleCampaignId)
    if (!selected) {
      setWarning("Selected form could not be found.")
      return
    }

    const metric = calculateCampaignMetrics(selected)
    const report = createAnalyticsReport({
      id: String(Date.now()),
      generatedAt: new Date().toISOString(),
      campaignIds: [selected.id],
      metrics: [metric],
      pairwise: [],
    })

    setReports((current) => [report, ...current].slice(0, 25))
    setSingleReportId(report.id)
    setPdfReportId(report.id)
    setWarning("")
    setActiveReportId(null)
    // A new single-form report invalidates any AI summary shown for a
    // previous form — clear it so the panel doesn't show a stale read.
    setAiSummaryFormId(null)
    setAiSummaryText(null)
    setAiSummaryInsufficientCount(null)
    setAiSummaryError(null)
    scrollToReportOutput()
  }

  // AI summary (Phase 11 · Session 11.6) — on-demand fetch, not auto-fired on
  // form selection, so browsing forms never silently burns the rate limit.
  // Reuses the exact auth-gate/rate-limit/validation pattern from 11.5's
  // /api/generate-questions (see that route for the shared shell).
  const handleGenerateAiSummary = async (formId: string) => {
    setAiSummaryLoading(true)
    setAiSummaryError(null)
    try {
      const res = await fetch("/api/summarize-responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setAiSummaryError(data?.error ?? "Couldn't generate a summary — try again.")
        return
      }
      setAiSummaryFormId(formId)
      if (data.insufficientData) {
        setAiSummaryText(null)
        setAiSummaryInsufficientCount(data.responseCount ?? 0)
      } else {
        setAiSummaryText(data.summary as string)
        setAiSummaryInsufficientCount(null)
      }
    } catch {
      setAiSummaryError("Couldn't generate a summary — try again.")
    } finally {
      setAiSummaryLoading(false)
    }
  }

  const exportReportToPdf = async (reportToDownload?: AnalyticsReport) => {
    const reportForPdf = reportToDownload || activeReport
    if (!reportForPdf) return

    if (reportToDownload && reportToDownload.id !== activeReportId) {
      setActiveReportId(reportToDownload.id)
      setSelectedCampaignIds(toThreeSlots(reportToDownload.campaignIds))
      await new Promise((resolve) => window.setTimeout(resolve, 260))
    }
    setPdfReportId(reportForPdf.id)
    await new Promise((resolve) => window.requestAnimationFrame(() => window.requestAnimationFrame(resolve)))

    const template = document.getElementById("analytics-pdf-template")
    if (!template) return

    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")])
    const pdf = new jsPDF("p", "mm", "a4")

    const pages = Array.from(template.querySelectorAll(".pdf-page")) as HTMLElement[]
    if (pages.length === 0) return

    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const margin = 12
    const printableWidth = pageWidth - margin * 2
    const printableHeight = pageHeight - margin * 2

    for (let index = 0; index < pages.length; index += 1) {
      const page = pages[index]

      const canvas = await html2canvas(page, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        scrollX: 0,
        scrollY: 0,
        windowWidth: 794,
      })

      const imageData = canvas.toDataURL("image/png")
      const widthScale = printableWidth / canvas.width
      const heightScale = printableHeight / canvas.height
      const finalScale = Math.min(widthScale, heightScale)
      const renderWidth = canvas.width * finalScale
      const renderHeight = canvas.height * finalScale
      const offsetX = (pageWidth - renderWidth) / 2
      const offsetY = margin

      if (index > 0) {
        pdf.addPage()
      }

      pdf.addImage(imageData, "PNG", offsetX, offsetY, renderWidth, renderHeight)
    }

    const fileLabel = reportForPdf.campaignIds.join("-") || "report"

    pdf.save(`trustvox-analytics-${fileLabel}.pdf`)
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-7xl px-4 py-8">
        <header className="tvx-card-gold mb-6 rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-6">
          <p className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-gold">
            <BarChart3 className="h-3.5 w-3.5" />
            Analytics Workspace
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold text-ink">
            Form <span className="tvx-text-gold">Analytics</span>
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-dim">
            Analyze a single form in depth or compare up to {MAX_COMPARE_FORMS} forms side by side. Every number is
            derived from real submitted responses — export any report as a PDF.
          </p>
        </header>

        {/* Mode toggle — segmented control, matches the create-page pattern */}
        <div className="mb-8 inline-flex items-center rounded-lg border border-white/10 bg-white/[0.04] p-1">
          <button
            type="button"
            onClick={() => {
              setAnalysisMode("single")
              setWarning("")
            }}
            className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              analysisMode === "single"
                ? "bg-gradient-to-b from-[#f2c877] to-gold-deep text-[#241a06]"
                : "text-ink-muted hover:text-ink-dim"
            }`}
          >
            <FileText className="h-4 w-4" />
            Single Form
          </button>
          <button
            type="button"
            onClick={() => {
              setAnalysisMode("compare")
              setWarning("")
            }}
            className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              analysisMode === "compare"
                ? "bg-gradient-to-b from-[#f2c877] to-gold-deep text-[#241a06]"
                : "text-ink-muted hover:text-ink-dim"
            }`}
          >
            <Layers className="h-4 w-4" />
            Compare Forms
          </button>
        </div>

        {analysisMode === "compare" ? (
          <>
            <section className="mb-8 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
              <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-ink">
                  <Layers className="h-4 w-4 text-gold" />
                  <h2 className="text-base font-semibold">Select forms to compare</h2>
                </div>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-xs font-medium text-ink-dim">
                  {compareCount} / {MAX_COMPARE_FORMS} selected
                </span>
              </div>
              <p className="mb-4 text-sm text-ink-muted">
                Pick 2 or 3 forms, then generate a side-by-side report.
              </p>

              {campaigns.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/[0.1] bg-white/[0.02] py-12 text-center text-sm text-ink-muted">
                  No forms yet — create a form to unlock analytics.
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {campaigns.map((campaign) => {
                    const totalResponses = getCampaignTotalResponses(campaign)
                    const isSelected = selectedCampaignIds.includes(campaign.id)
                    const atLimit = compareCount >= MAX_COMPARE_FORMS && !isSelected

                    return (
                      <button
                        key={campaign.id}
                        type="button"
                        onClick={() => toggleCompareForm(campaign.id)}
                        disabled={atLimit}
                        aria-pressed={isSelected}
                        className={`group relative rounded-xl border p-4 text-left transition-all ${
                          isSelected
                            ? "border-gold/50 bg-gold/[0.07]"
                            : atLimit
                            ? "cursor-not-allowed border-white/[0.06] bg-white/[0.01] opacity-50"
                            : "border-white/[0.07] bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                        }`}
                      >
                        <span
                          className={`absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full border transition-colors ${
                            isSelected ? "border-gold bg-gold text-[#241a06]" : "border-white/20 text-transparent"
                          }`}
                        >
                          <Check className="h-3 w-3" />
                        </span>
                        <p className="pr-6 font-semibold text-ink">{campaign.name}</p>
                        <p className="mt-0.5 text-xs text-ink-muted">Created {formatDateLabel(campaign.date)}</p>
                        <p className="mt-3 tvx-num text-2xl font-semibold text-ink">{totalResponses}</p>
                        <p className="text-[11px] uppercase tracking-wide text-ink-muted">Responses</p>
                      </button>
                    )
                  })}
                </div>
              )}

              <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-white/[0.06] pt-4">
                <button
                  onClick={runReportGeneration}
                  disabled={compareCount < 2}
                  className="inline-flex items-center rounded-lg bg-gradient-to-b from-[#f2c877] to-gold-deep px-4 py-2 text-sm font-semibold text-[#241a06] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Generate Comparison
                </button>
                {compareCount > 0 ? (
                  <button
                    onClick={clearCompareSelection}
                    className="text-sm font-medium text-ink-muted transition-colors hover:text-ink-dim"
                  >
                    Clear selection
                  </button>
                ) : null}
                {warning ? <p className="text-sm text-destructive">{warning}</p> : null}
              </div>
            </section>
          </>
        ) : (
          <>
            <section className="mb-8 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
              <div className="mb-4 flex items-center gap-2 text-ink">
                <FileText className="h-4 w-4 text-gold" />
                <h2 className="text-base font-semibold">Choose a form to analyze</h2>
              </div>
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <div className="relative w-full md:max-w-md">
                  <select
                    value={singleCampaignId}
                    onChange={(event) => {
                      setSingleCampaignId(event.target.value)
                      setWarning("")
                    }}
                    className="h-11 w-full appearance-none rounded-lg border border-white/15 bg-white/[0.04] px-3 pr-10 text-sm text-ink outline-none transition-colors focus:border-gold/60 focus:ring-2 focus:ring-gold/20"
                  >
                    <option value="">Select a form…</option>
                    {campaigns.map((campaign) => (
                      <option key={campaign.id} value={campaign.id}>
                        {campaign.name} ({formatDateLabel(campaign.date)})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                </div>
                <button
                  onClick={analyzeSingleCampaign}
                  className="inline-flex h-11 items-center justify-center rounded-lg bg-gradient-to-b from-[#f2c877] to-gold-deep px-4 text-sm font-semibold text-[#241a06] transition hover:brightness-105"
                >
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Analyze Form
                </button>
              </div>
              {campaigns.length === 0 ? (
                <p className="mt-3 text-sm text-ink-muted">No forms yet — create a form to unlock analytics.</p>
              ) : null}
              {warning ? <p className="mt-3 text-sm text-destructive">{warning}</p> : null}
            </section>

            {singleCampaign && singleMetric ? (
              <section ref={reportSectionRef} className="pb-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-ink">
                    <BarChart3 className="h-4 w-4 text-gold" />
                    <h2 className="text-base font-semibold">Form Analysis</h2>
                  </div>
                  {singleReport ? (
                    <button
                      className="inline-flex items-center rounded-lg border border-white/15 bg-white/[0.04] px-4 py-2 text-sm font-medium text-ink transition hover:bg-white/[0.08]"
                      onClick={() => void exportReportToPdf(singleReport)}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download Detailed PDF
                    </button>
                  ) : null}
                </div>

                <div className="space-y-5 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
                    <h3 className="text-lg font-semibold text-ink">Overview</h3>
                    <p className="mb-2 text-xs text-ink-muted">
                      {singleCampaign.name} · Created {formatDateLabel(singleCampaign.date)}
                    </p>
                    <div className="space-y-2 text-sm text-ink-dim">
                      {singleSummaryLines.map((line) => (
                        <p key={line}>{line}</p>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
                      <p className="text-xs uppercase tracking-wide text-ink-muted">Form Score</p>
                      <p className="mt-2 tvx-num text-2xl font-semibold text-gold">{singleHealthScore.toFixed(1)}<span className="text-sm text-ink-muted"> / 100</span></p>
                    </div>
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
                      <p className="text-xs uppercase tracking-wide text-ink-muted">Total Responses</p>
                      <p className="mt-2 tvx-num text-2xl font-semibold text-ink">{singleMetric.totalResponses}</p>
                    </div>
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
                      <p className="text-xs uppercase tracking-wide text-ink-muted">Engagement / Day</p>
                      <p className="mt-2 tvx-num text-2xl font-semibold text-ink">{singleMetric.engagementRate.toFixed(1)}</p>
                    </div>
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
                      <p className="text-xs uppercase tracking-wide text-ink-muted">Sentiment Score</p>
                      <p className="mt-2 tvx-num text-2xl font-semibold text-ink">{singleMetric.sentimentScore.toFixed(1)}</p>
                    </div>
                  </div>

                  {/* AI summary panel (Phase 11 · Session 11.6) — real Groq call over
                      this form's actual responses, on demand (not auto-fired), data-gated
                      on a minimum response count with an honest empty state below it. */}
                  <div className="rounded-xl border border-dashed border-gold/25 bg-gold/[0.04] p-4">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-gold" />
                        <h3 className="text-sm font-semibold text-ink">AI Summary</h3>
                      </div>
                      <button
                        onClick={() => void handleGenerateAiSummary(singleCampaign.id)}
                        disabled={aiSummaryLoading}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-b from-[#f2c877] to-gold-deep px-3 py-1.5 text-xs font-semibold text-[#241a06] transition hover:brightness-105 disabled:opacity-60"
                      >
                        {aiSummaryLoading ? (
                          <>
                            <Loader2 size={13} className="animate-spin" />
                            Analyzing…
                          </>
                        ) : (
                          <>
                            <Sparkles size={13} />
                            {aiSummaryFormId === singleCampaign.id && (aiSummaryText || aiSummaryInsufficientCount !== null)
                              ? "Regenerate"
                              : "Generate Summary"}
                          </>
                        )}
                      </button>
                    </div>

                    {aiSummaryError ? (
                      <p className="mt-3 flex items-center gap-1.5 text-[11px] text-red-400">
                        <AlertCircle size={12} />
                        {aiSummaryError}
                      </p>
                    ) : aiSummaryFormId === singleCampaign.id && aiSummaryInsufficientCount !== null ? (
                      <p className="mt-3 text-sm text-ink-dim">
                        Not enough responses yet to analyze — this form has {aiSummaryInsufficientCount}{" "}
                        response{aiSummaryInsufficientCount === 1 ? "" : "s"} so far. A meaningful AI read needs a
                        few more real submissions.
                      </p>
                    ) : aiSummaryFormId === singleCampaign.id && aiSummaryText ? (
                      <div className="mt-3 space-y-2">
                        <p className="text-sm leading-relaxed text-ink-dim whitespace-pre-line">{aiSummaryText}</p>
                        <p className="text-[10px] text-ink-muted">AI summary — review before acting.</p>
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-ink-dim">
                        A plain-language read of what this form&apos;s real responses are telling you — themes and
                        suggested actions. Generate it on demand; review before acting.
                      </p>
                    )}
                  </div>

                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
                    <h3 className="mb-3 text-lg font-semibold text-ink">Response Trend</h3>
                    {singleTrendRows.length > 0 ? (
                      <div className="h-[290px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={singleTrendRows} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid stroke="rgba(255,255,255,0.1)" strokeDasharray="3 3" />
                            <XAxis dataKey="label" stroke="#878CA0" tick={{ fill: "#878CA0", fontSize: 12 }} />
                            <YAxis stroke="#878CA0" tick={{ fill: "#878CA0", fontSize: 12 }} allowDecimals={false} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "#1B1F2A",
                                border: "1px solid rgba(255,255,255,0.1)",
                                borderRadius: "10px",
                              }}
                            />
                            <Line
                              type="monotone"
                              dataKey={singleCampaign.name}
                              stroke="#EBBC6B"
                              strokeWidth={2}
                              dot={{ r: 2 }}
                              activeDot={{ r: 4 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <p className="text-sm text-ink-muted">No response timeline available for this form.</p>
                    )}
                  </div>

                  {singleReport ? (
                    <>
                      <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
                        <h3 className="mb-3 text-lg font-semibold text-ink">Detailed KPI Snapshot</h3>
                        <div className="overflow-x-auto">
                          <table className="min-w-full border-collapse text-sm">
                            <thead>
                              <tr className="text-left text-ink-muted">
                                <th className="border-b border-white/[0.06] px-3 py-2">Form</th>
                                <th className="border-b border-white/[0.06] px-3 py-2">Responses</th>
                                <th className="border-b border-white/[0.06] px-3 py-2">Engagement / Day</th>
                                <th className="border-b border-white/[0.06] px-3 py-2">Positive %</th>
                                <th className="border-b border-white/[0.06] px-3 py-2">Negative %</th>
                                <th className="border-b border-white/[0.06] px-3 py-2">Consistency</th>
                                <th className="border-b border-white/[0.06] px-3 py-2">Drop-off</th>
                              </tr>
                            </thead>
                            <tbody>
                              {singleReport.metrics.map((metric) => (
                                <tr key={`single-kpi-${metric.campaignId}`} className="text-ink">
                                  <td className="border-b border-white/[0.05] px-3 py-2">{metric.campaignName}</td>
                                  <td className="border-b border-white/[0.05] px-3 py-2">{metric.totalResponses}</td>
                                  <td className="border-b border-white/[0.05] px-3 py-2">{metric.engagementRate.toFixed(2)}</td>
                                  <td className="border-b border-white/[0.05] px-3 py-2 text-mint">{formatPercent(metric.positiveRate)}</td>
                                  <td className="border-b border-white/[0.05] px-3 py-2 text-destructive">{formatPercent(metric.negativeRate)}</td>
                                  <td className="border-b border-white/[0.05] px-3 py-2">{metric.consistencyLevel}</td>
                                  <td className="border-b border-white/[0.05] px-3 py-2">{metric.dropOffPct.toFixed(1)}%</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
                        <h3 className="mb-3 text-lg font-semibold text-ink">Auto-Generated Insights</h3>
                        <ul className="space-y-2 text-sm text-ink-dim">
                          {singleReport.insights.map((insight) => (
                            <li key={insight} className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                              {insight}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
                        <h3 className="mb-3 text-lg font-semibold text-ink">Pattern Observations</h3>
                        <ul className="space-y-2 text-sm text-ink-dim">
                          {singleReport.patternObservations.map((observation) => (
                            <li key={observation} className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                              {observation}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
                        <h3 className="mb-3 text-lg font-semibold text-ink">Final Recommendation</h3>
                        <p className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-sm text-ink-dim">
                          {singleReport.finalRecommendation}
                        </p>
                      </div>

                      <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-4">
                        <h3 className="mb-3 text-lg font-semibold text-ink">Final Summary</h3>
                        <div className="space-y-2 text-sm text-ink-dim">
                          {singleReport.finalSummary.map((line) => (
                            <p key={line}>{line}</p>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : null}
                </div>
              </section>
            ) : null}
          </>
        )}

        {analysisMode === "compare" && activeReport ? (
          <section ref={reportSectionRef} className="pb-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-ink">
                <BarChart3 className="h-4 w-4 text-gold" />
                <h2 className="text-base font-semibold">Report Output</h2>
              </div>
              <button
                className="inline-flex items-center rounded-lg border border-white/15 bg-white/[0.04] px-4 py-2 text-sm font-medium text-ink transition hover:bg-white/[0.08]"
                onClick={() => void exportReportToPdf()}
              >
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </button>
            </div>

            <div className="space-y-5 rounded-xl border border-white/[0.07] bg-white/[0.02] p-5">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-wide text-ink-muted">Best Performing</p>
                  <p className="mt-2 text-sm font-semibold text-ink">{activeReport.highlights.bestPerforming}</p>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-wide text-ink-muted">Highest Engagement</p>
                  <p className="mt-2 text-sm font-semibold text-ink">{activeReport.highlights.highestEngagement}</p>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-wide text-ink-muted">Best Sentiment</p>
                  <p className="mt-2 text-sm font-semibold text-ink">{activeReport.highlights.bestSentiment}</p>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-wide text-ink-muted">Most Volatile</p>
                  <p className="mt-2 text-sm font-semibold text-ink">{activeReport.highlights.mostVolatile}</p>
                </div>
              </div>

              <div className="rounded-xl border border-mint/25 bg-mint/[0.05] p-4">
                <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-mint">Comparative Highlights</p>
                <div className="space-y-2 text-sm text-ink-dim">
                  {comparativeHighlights.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs uppercase tracking-[0.14em] text-ink-muted">
                Page 1 - Executive Comparison Snapshot
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
                <h3 className="text-lg font-semibold text-ink">Executive Summary</h3>
                <p className="mb-2 text-xs text-ink-muted">
                  Comparative report for {reportCampaignLabel} | Generated on {formatDateLabel(activeReport.generatedAt)}
                </p>
                <div className="space-y-2 text-sm text-ink-dim">
                  {activeReport.summaryLines.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
                <h3 className="mb-3 text-lg font-semibold text-ink">KPI Table</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse text-sm">
                    <thead>
                      <tr className="text-left text-ink-muted">
                        <th className="border-b border-white/[0.06] px-3 py-2">Form Name</th>
                        <th className="border-b border-white/[0.06] px-3 py-2">Total Responses</th>
                        <th className="border-b border-white/[0.06] px-3 py-2">Engagement / Day</th>
                        <th className="border-b border-white/[0.06] px-3 py-2">Positive %</th>
                        <th className="border-b border-white/[0.06] px-3 py-2">Negative %</th>
                        <th className="border-b border-white/[0.06] px-3 py-2">Sentiment Score</th>
                        <th className="border-b border-white/[0.06] px-3 py-2">Rank</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeReport.metrics.map((metric) => (
                        <tr key={metric.campaignId} className="text-ink">
                          <td className="border-b border-white/[0.05] px-3 py-2">{metric.campaignName}</td>
                          <td className="border-b border-white/[0.05] px-3 py-2">{metric.totalResponses}</td>
                          <td className="border-b border-white/[0.05] px-3 py-2">{metric.engagementRate.toFixed(1)}</td>
                          <td className="border-b border-white/[0.05] px-3 py-2 text-mint">
                            {formatPercent(metric.positiveRate)}
                          </td>
                          <td className="border-b border-white/[0.05] px-3 py-2 text-destructive">
                            {formatPercent(metric.negativeRate)}
                          </td>
                          <td className="border-b border-white/[0.05] px-3 py-2 text-gold">{metric.sentimentScore.toFixed(1)}</td>
                          <td className="border-b border-white/[0.05] px-3 py-2">#{metric.rank}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid gap-5 xl:grid-cols-2">
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
                  <h3 className="mb-3 text-lg font-semibold text-ink">Responses Over Time</h3>
                  {lineChartData.length > 0 ? (
                    <div className="h-[290px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={lineChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <CartesianGrid stroke="rgba(255,255,255,0.1)" strokeDasharray="3 3" />
                          <XAxis dataKey="label" stroke="#878CA0" tick={{ fill: "#878CA0", fontSize: 12 }} />
                          <YAxis
                            stroke="#878CA0"
                            tick={{ fill: "#878CA0", fontSize: 12 }}
                            label={{ value: "Responses", angle: -90, position: "insideLeft", fill: "#878CA0", fontSize: 11 }}
                            allowDecimals={false}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#1B1F2A",
                              border: "1px solid rgba(255,255,255,0.1)",
                              borderRadius: "10px",
                            }}
                            labelStyle={{ color: "#B6BACB" }}
                            formatter={(value: number, name: string) => [`${value} responses`, name]}
                          />
                          <Legend />
                          {activeReportCampaigns.map((campaign, index) => (
                            <Line
                              key={campaign.id}
                              type="monotone"
                              dataKey={campaign.name}
                              stroke={LEDGER_SERIES_COLORS[index % LEDGER_SERIES_COLORS.length]}
                              strokeWidth={2}
                              dot={{ r: 2 }}
                              activeDot={{ r: 4 }}
                            />
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <p className="text-sm text-ink-muted">No timeline data available for selected forms.</p>
                  )}
                  <p className="mt-3 text-xs text-ink-muted">
                    This chart compares how response volume changed across each selected form, date by date.
                  </p>
                </div>

                <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
                  <h3 className="mb-3 text-lg font-semibold text-ink">Positive vs Negative Responses</h3>
                  {barChartData.length > 0 ? (
                    <div className="h-[290px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <CartesianGrid stroke="rgba(255,255,255,0.1)" strokeDasharray="3 3" />
                          <XAxis dataKey="name" stroke="#878CA0" tick={{ fill: "#878CA0", fontSize: 12 }} />
                          <YAxis
                            stroke="#878CA0"
                            tick={{ fill: "#878CA0", fontSize: 12 }}
                            label={{ value: "Responses", angle: -90, position: "insideLeft", fill: "#878CA0", fontSize: 11 }}
                            allowDecimals={false}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#1B1F2A",
                              border: "1px solid rgba(255,255,255,0.1)",
                              borderRadius: "10px",
                            }}
                            formatter={(value: number, name: string) => [`${value} responses`, name]}
                          />
                          <Legend />
                          <Bar dataKey="positive" name="Positive" fill="#5FD0A6" radius={[5, 5, 0, 0]} />
                          <Bar dataKey="negative" name="Negative" fill="#F0899A" radius={[5, 5, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <p className="text-sm text-ink-muted">No sentiment totals available for selected forms.</p>
                  )}
                  <p className="mt-3 text-xs text-ink-muted">
                    Bars highlight positive (mint) and negative (rose) totals to expose sentiment quality gaps.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
                <h3 className="text-lg font-semibold text-ink">Analytics Summary Visuals</h3>
                <p className="mb-3 text-xs text-ink-muted">
                  Response distribution, sentiment movement over time, and response-vs-sentiment pattern mapping.
                </p>
                <div className="grid gap-5 xl:grid-cols-3">
                  <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                    <p className="mb-2 text-sm font-medium text-ink">Response Distribution</p>
                    {responseDistributionData.length > 0 ? (
                      <div className="h-[270px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={responseDistributionData}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius={58}
                              outerRadius={92}
                              paddingAngle={3}
                            >
                              {responseDistributionData.map((entry, index) => (
                                <Cell
                                  key={`distribution-${entry.name}`}
                                  fill={LEDGER_SERIES_COLORS[index % LEDGER_SERIES_COLORS.length]}
                                />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "#1B1F2A",
                                border: "1px solid rgba(255,255,255,0.1)",
                                borderRadius: "10px",
                              }}
                              labelStyle={{ color: "#B6BACB" }}
                              formatter={(value: number, _name: string, payload) => {
                                const share = Number(payload?.payload?.sharePct || 0)
                                return [`${value} responses (${share.toFixed(1)}%)`, payload?.name || "Form"]
                              }}
                            />
                            <Legend wrapperStyle={{ color: "#B6BACB", fontSize: "12px" }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <p className="text-sm text-ink-muted">No distribution data available.</p>
                    )}
                  </div>

                  <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                    <p className="mb-2 text-sm font-medium text-ink">Sentiment Trend Over Time</p>
                    {sentimentTrendData.length > 0 ? (
                      <div className="h-[270px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={sentimentTrendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid stroke="rgba(255,255,255,0.1)" strokeDasharray="3 3" />
                            <XAxis dataKey="label" stroke="#878CA0" tick={{ fill: "#878CA0", fontSize: 12 }} />
                            <YAxis stroke="#878CA0" tick={{ fill: "#878CA0", fontSize: 12 }} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "#1B1F2A",
                                border: "1px solid rgba(255,255,255,0.1)",
                                borderRadius: "10px",
                              }}
                              labelStyle={{ color: "#B6BACB" }}
                            />
                            <Legend wrapperStyle={{ color: "#B6BACB", fontSize: "12px" }} />
                            <Area
                              type="monotone"
                              dataKey="sentimentScore"
                              name="Sentiment Score"
                              stroke="#EBBC6B"
                              fill="#EBBC6B"
                              fillOpacity={0.26}
                              strokeWidth={2}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <p className="text-sm text-ink-muted">No sentiment trend data available.</p>
                    )}
                  </div>

                  <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                    <p className="mb-2 text-sm font-medium text-ink">Responses vs Sentiment Score</p>
                    {responseVsSentimentData.length > 0 ? (
                      <div className="h-[270px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <ScatterChart margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid stroke="rgba(255,255,255,0.1)" strokeDasharray="3 3" />
                            <XAxis
                              type="number"
                              dataKey="responses"
                              name="Responses"
                              stroke="#878CA0"
                              tick={{ fill: "#878CA0", fontSize: 12 }}
                            />
                            <YAxis
                              type="number"
                              dataKey="sentimentScore"
                              name="Sentiment Score"
                              stroke="#878CA0"
                              tick={{ fill: "#878CA0", fontSize: 12 }}
                            />
                            <Tooltip
                              cursor={{ strokeDasharray: "3 3" }}
                              contentStyle={{
                                backgroundColor: "#1B1F2A",
                                border: "1px solid rgba(255,255,255,0.1)",
                                borderRadius: "10px",
                              }}
                              labelStyle={{ color: "#B6BACB" }}
                              formatter={(value: number, name: string) => [value, name]}
                              content={({ active, payload }) => {
                                if (!active || !payload || payload.length === 0) return null
                                const point = payload[0]?.payload as {
                                  campaignName: string
                                  responses: number
                                  sentimentScore: number
                                  engagementRate: number
                                }
                                if (!point) return null
                                return (
                                  <div className="rounded-lg border border-white/10 bg-surface-raised p-2 text-xs text-ink-dim">
                                    <p className="font-semibold text-ink">{point.campaignName}</p>
                                    <p>Responses: {point.responses}</p>
                                    <p>Sentiment Score: {point.sentimentScore}</p>
                                    <p>Engagement/Day: {point.engagementRate}</p>
                                  </div>
                                )
                              }}
                            />
                            <Legend wrapperStyle={{ color: "#B6BACB", fontSize: "12px" }} />
                            <Scatter name="Forms" data={responseVsSentimentData} fill="#EBBC6B" />
                          </ScatterChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <p className="text-sm text-ink-muted">No scatter data available.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
                <h3 className="mb-3 text-lg font-semibold text-ink">Comparative Trend Deltas</h3>
                {activeReport.pairwise.length > 0 ? (
                  <div className="space-y-2">
                    {activeReport.pairwise.map((comparison) => (
                      <div
                        key={`${comparison.previousCampaignId}-${comparison.currentCampaignId}`}
                        className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 text-sm"
                      >
                        <p className="font-medium text-ink">
                          {comparison.currentCampaignName} vs {comparison.previousCampaignName}
                        </p>
                        <p className="mt-1 text-ink-muted">
                          Response change: {formatDeltaPercent(comparison.responseChangePct)} | Negative-rate change: {formatDeltaPercent(comparison.negativeRateChangePct)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-ink-muted">Not enough forms selected for comparative pair analysis.</p>
                )}
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
                <h3 className="mb-3 text-lg font-semibold text-ink">Auto-Generated Insights</h3>
                <ul className="space-y-2 text-sm text-ink-dim">
                  {activeReport.insights.map((insight) => (
                    <li key={insight} className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                      {insight}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs uppercase tracking-[0.14em] text-ink-muted">
                Page 2 - Advanced Analytics Interpretation
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
                <h3 className="mb-3 text-lg font-semibold text-ink">Advanced Metrics Section</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse text-sm">
                    <thead>
                      <tr className="text-left text-ink-muted">
                        <th className="border-b border-white/[0.06] px-3 py-2">Form</th>
                        <th className="border-b border-white/[0.06] px-3 py-2">Engagement Rate</th>
                        <th className="border-b border-white/[0.06] px-3 py-2">Consistency</th>
                        <th className="border-b border-white/[0.06] px-3 py-2">Sentiment Score</th>
                        <th className="border-b border-white/[0.06] px-3 py-2">Peak Contribution</th>
                        <th className="border-b border-white/[0.06] px-3 py-2">Drop-off</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeReport.metrics.map((metric) => (
                        <tr key={`advanced-${metric.campaignId}`} className="text-ink">
                          <td className="border-b border-white/[0.05] px-3 py-2">{metric.campaignName}</td>
                          <td className="border-b border-white/[0.05] px-3 py-2">{metric.engagementRate.toFixed(2)} / day</td>
                          <td className="border-b border-white/[0.05] px-3 py-2">{metric.consistencyLevel} ({metric.consistencyScore.toFixed(2)})</td>
                          <td className="border-b border-white/[0.05] px-3 py-2">{metric.sentimentScore.toFixed(1)}</td>
                          <td className="border-b border-white/[0.05] px-3 py-2">{metric.peakContributionPct.toFixed(1)}%</td>
                          <td className="border-b border-white/[0.05] px-3 py-2">{metric.dropOffPct.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
                <h3 className="mb-3 text-lg font-semibold text-ink">Comparative Analysis</h3>
                <div className="space-y-2 text-sm text-ink-dim">
                  {activeReport.comparativeAnalysis.map((paragraph) => (
                    <p key={paragraph} className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
                <h3 className="mb-3 text-lg font-semibold text-ink">Pattern Observations</h3>
                <ul className="space-y-2 text-sm text-ink-dim">
                  {activeReport.patternObservations.map((observation) => (
                    <li key={observation} className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                      {observation}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
                <h3 className="mb-3 text-lg font-semibold text-ink">Final Recommendation</h3>
                <p className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-sm text-ink-dim">
                  {activeReport.finalRecommendation}
                </p>
              </div>

              <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-4">
                <h3 className="mb-3 text-lg font-semibold text-ink">Final Summarization</h3>
                <div className="space-y-2 text-sm text-ink-dim">
                  {activeReport.finalSummary.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {pdfReport ? (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "794px",
              background: "#ffffff",
              zIndex: -1,
              pointerEvents: "none",
            }}
          >
            <AnalyticsPDFTemplate
              report={pdfReport}
              campaignLabel={pdfCampaignLabel}
              lineChartData={pdfLineChartData}
              barChartData={pdfBarChartData}
              responseDistributionData={pdfResponseDistributionData}
              sentimentTrendData={pdfSentimentTrendData}
              responseVsSentimentData={pdfResponseVsSentimentData}
            />
          </div>
        ) : null}
      </main>
    </div>
  )
}

export default function ClientAnalyticsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <ClientAnalyticsPageContent />
    </Suspense>
  )
}
