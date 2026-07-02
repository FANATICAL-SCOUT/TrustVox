"use client"

import { Suspense, useEffect, useMemo, useRef, useState } from "react"
import {
  Activity,
  BarChart3,
  ChevronDown,
  Download,
  FileText,
  LineChart as LineChartIcon,
  Loader2,
  Trash2,
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getClientForms, getResponsesByFormId, subscribeToFormsUpdates, type FeedbackForm, type FormResponse } from "@/lib/feedback-store"
import AnalyticsPDFTemplate from "@/components/analytics-pdf-template"
import { useSearchParams } from "next/navigation"

const REPORTS_STORAGE_KEY = "trustvox.client.analytics.reports.v1"
const DISTRIBUTION_COLORS = ["#22d3ee", "#a78bfa", "#34d399", "#f59e0b", "#f472b6", "#60a5fa"]

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

const FALLBACK_CAMPAIGNS: AnalyticsCampaign[] = [
  {
    id: "cmp1",
    name: "Campaign A",
    date: "2026-03-01",
    responses: [
      { date: "2026-03-01", total: 50, positive: 30, negative: 20 },
      { date: "2026-03-02", total: 80, positive: 50, negative: 30 },
      { date: "2026-03-03", total: 85, positive: 56, negative: 29 },
      { date: "2026-03-04", total: 66, positive: 40, negative: 26 },
    ],
  },
  {
    id: "cmp2",
    name: "Campaign B",
    date: "2026-03-05",
    responses: [
      { date: "2026-03-05", total: 44, positive: 31, negative: 13 },
      { date: "2026-03-06", total: 59, positive: 43, negative: 16 },
      { date: "2026-03-07", total: 74, positive: 55, negative: 19 },
      { date: "2026-03-08", total: 92, positive: 65, negative: 27 },
    ],
  },
  {
    id: "cmp3",
    name: "Campaign C",
    date: "2026-03-10",
    responses: [
      { date: "2026-03-10", total: 63, positive: 34, negative: 29 },
      { date: "2026-03-11", total: 72, positive: 37, negative: 35 },
      { date: "2026-03-12", total: 70, positive: 36, negative: 34 },
      { date: "2026-03-13", total: 68, positive: 34, negative: 34 },
    ],
  },
  {
    id: "cmp4",
    name: "Campaign D",
    date: "2026-03-14",
    responses: [
      { date: "2026-03-14", total: 38, positive: 29, negative: 9 },
      { date: "2026-03-15", total: 49, positive: 38, negative: 11 },
      { date: "2026-03-16", total: 57, positive: 43, negative: 14 },
      { date: "2026-03-17", total: 61, positive: 45, negative: 16 },
    ],
  },
  {
    id: "cmp5",
    name: "Campaign E",
    date: "2026-03-18",
    responses: [
      { date: "2026-03-18", total: 55, positive: 30, negative: 25 },
      { date: "2026-03-19", total: 73, positive: 40, negative: 33 },
      { date: "2026-03-20", total: 101, positive: 52, negative: 49 },
      { date: "2026-03-21", total: 62, positive: 33, negative: 29 },
    ],
  },
]

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
    insightLines.push("No major anomalies detected. Campaign performance remains stable across the selected period.")
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
    return ["Comparative analysis requires at least two campaigns. Add another campaign to unlock side-by-side interpretation."]
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
    `${mostVolatile?.campaignName || "Campaign"} is the most volatile pattern with consistency score ${mostVolatile?.consistencyScore.toFixed(2) || "0.00"}.`,
    `${highestPeak?.campaignName || "Campaign"} has the strongest peak concentration (${highestPeak?.peakContributionPct.toFixed(1) || "0.0"}% of responses on ${formatDateLabel(highestPeak?.trend.peakDay || "-")}).`,
    `${biggestDropOff?.campaignName || "Campaign"} shows the sharpest post-peak decline at ${biggestDropOff?.dropOffPct.toFixed(1) || "0.0"}%.`,
  ]
}

function buildFinalRecommendation(metrics: CampaignMetric[]): string {
  if (metrics.length === 0) return "No recommendation available because no campaign metrics are present."
  const best = [...metrics].sort((first, second) => first.rank - second.rank)[0]
  if (!best) return "No recommendation available."
  return `Recommended campaign for scale: ${best.campaignName} (rank #${best.rank}) due to engagement ${best.engagementRate.toFixed(1)} responses/day, sentiment score ${best.sentimentScore.toFixed(1)}, and ${best.consistencyLevel.toLowerCase()} consistency.`
}

function buildFinalSummary(metrics: CampaignMetric[]): string[] {
  if (metrics.length === 0) {
    return [
      "Comparative output is currently limited by missing campaign activity.",
      "Add campaign responses to unlock engagement and sentiment conclusions.",
      "Once data is available, this section will produce a final recommendation.",
      "Current state indicates insufficient volume for strategic decision-making.",
    ]
  }

  const best = [...metrics].sort((first, second) => first.rank - second.rank)[0]
  const bestSentiment = [...metrics].sort((first, second) => second.sentimentScore - first.sentimentScore)[0]
  const mostVolatile = [...metrics].sort((first, second) => second.consistencyScore - first.consistencyScore)[0]

  return [
    `${best?.campaignName || "Top campaign"} leads overall performance with ${best?.engagementRate.toFixed(1) || "0.0"} responses/day and rank #${best?.rank || 0}.`,
    `${bestSentiment?.campaignName || "Leading sentiment campaign"} delivers the strongest sentiment profile at ${bestSentiment?.sentimentScore.toFixed(1) || "0.0"} score.`,
    `${mostVolatile?.campaignName || "Most volatile campaign"} needs pacing optimization due to ${mostVolatile?.consistencyLevel.toLowerCase() || "moderate"} response volatility.`,
    "Overall campaign set shows positive audience reception with targeted room to improve post-peak retention.",
    `${best?.campaignName || "The leading campaign"} is recommended for scale while sentiment-leading variants can be used for precision targeting.`,
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
    campaignId: raw.campaignId || "unknown-campaign",
    campaignName: raw.campaignName || "Unknown Campaign",
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
    `Overall campaign health score is ${healthScore.toFixed(1)}/100, indicating ${healthScore >= 70 ? "strong" : healthScore >= 50 ? "moderate" : "at-risk"} performance quality.`,
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
    `${bestCampaign.campaignName} is the best-performing campaign with ${bestCampaign.totalResponses} total responses and ${formatPercent(bestCampaign.positiveRate)} positive feedback.`,
    topShift
      ? `Largest comparative shift: ${topShift.currentCampaignName} vs ${topShift.previousCampaignName} (${formatDeltaPercent(topShift.responseChangePct)} response change).`
      : "Comparative shifts are limited due to fewer campaign combinations.",
    risingCount > decliningCount
      ? "Overall trend indicates broader engagement growth across selected campaigns."
      : decliningCount > risingCount
      ? "Overall trend indicates engagement softening across selected campaigns."
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

function deriveResponseScore(response: FormResponse): number {
  const values = Object.values(response.answers || {})
  const numeric = values.find((value) => typeof value === "number")
  if (typeof numeric === "number") return numeric

  const text = values.find((value) => typeof value === "string")
  if (typeof text === "string") {
    const normalized = text.toLowerCase()
    if (normalized.includes("excellent") || normalized.includes("great") || normalized.includes("good")) return 4
    if (normalized.includes("bad") || normalized.includes("poor") || normalized.includes("terrible")) return 2
  }

  return 3
}

function hashSeed(input: string): number {
  return Array.from(input).reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
}

function addDaysIso(dateIso: string, days: number): string {
  const base = Date.parse(dateIso)
  if (Number.isNaN(base)) return new Date().toISOString()
  return new Date(base + days * 24 * 60 * 60 * 1000).toISOString()
}

function buildCampaignResponsesFromForm(form: FeedbackForm): CampaignResponse[] {
  const responses = [...getResponsesByFormId(form.id)].sort(
    (left, right) => Date.parse(left.submittedAt) - Date.parse(right.submittedAt),
  )

  if (responses.length === 0) {
    const seed = hashSeed(form.id || form.title || form.product || "trustvox")
    const baseTotal = form.responseCount && form.responseCount > 0 ? form.responseCount : 18 + (seed % 36)
    const dailyIncrements = [0.35, 0.6, 0.82, 1]
    const positiveRatio = 0.58 + (seed % 20) / 100

    return dailyIncrements.map((ratio, index) => {
      const total = Math.max(1, Math.round(baseTotal * ratio))
      const positive = Math.max(0, Math.round(total * positiveRatio))
      const negative = Math.max(0, total - positive)

      return {
        date: addDaysIso(form.submittedAt || form.createdAt, index),
        total,
        positive,
        negative,
      }
    })
  }

  let positive = 0
  let negative = 0

  return responses.map((response, index) => {
    const score = deriveResponseScore(response)
    if (score >= 4) positive += 1
    else if (score <= 2) negative += 1

    return {
      date: response.submittedAt,
      total: index + 1,
      positive,
      negative,
    }
  })
}

function buildAnalyticsCampaigns(): AnalyticsCampaign[] {
  const forms = getClientForms("client-1")
  if (forms.length === 0) return FALLBACK_CAMPAIGNS

  const formCampaigns = forms
    .map((form, index) => ({
      id: form.id,
      name: form.title || form.product || `Campaign ${index + 1}`,
      date: form.submittedAt || form.createdAt,
      responses: buildCampaignResponsesFromForm(form),
    }))

  // Keep legacy fallback campaigns so previously generated report IDs still resolve.
  const existingIds = new Set(formCampaigns.map((campaign) => campaign.id))
  const legacyCampaigns = FALLBACK_CAMPAIGNS.filter((campaign) => !existingIds.has(campaign.id))

  return [...formCampaigns, ...legacyCampaigns].sort(
    (left, right) => Date.parse(right.date) - Date.parse(left.date),
  )
}

function ClientAnalyticsPageContent() {
  const searchParams = useSearchParams()
  const reportSectionRef = useRef<HTMLElement | null>(null)
  const autoDownloadTokenRef = useRef<string>("")

  const [campaigns, setCampaigns] = useState<AnalyticsCampaign[]>([])
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>("compare")
  const [singleCampaignId, setSingleCampaignId] = useState<string>("")
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<CampaignSlots>([null, null, null])
  const [draggingCampaignId, setDraggingCampaignId] = useState<string | null>(null)
  const [hoveredSlot, setHoveredSlot] = useState<number | null>(null)
  const [warning, setWarning] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [reports, setReports] = useState<AnalyticsReport[]>([])
  const [activeReportId, setActiveReportId] = useState<string | null>(null)
  const [singleReportId, setSingleReportId] = useState<string | null>(null)
  const [pdfReportId, setPdfReportId] = useState<string | null>(null)
  const [isHydrated, setIsHydrated] = useState(false)

  const campaignMap = useMemo(() => new Map(campaigns.map((campaign) => [campaign.id, campaign])), [campaigns])

  useEffect(() => {
    const loadCampaigns = () => {
      setCampaigns(buildAnalyticsCampaigns())
    }

    loadCampaigns()
    const unsubscribe = subscribeToFormsUpdates(loadCampaigns)
    window.addEventListener("focus", loadCampaigns)

    return () => {
      unsubscribe()
      window.removeEventListener("focus", loadCampaigns)
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

  useEffect(() => {
    if (!draggingCampaignId) return

    const edgeThresholdPx = 120
    const maxSpeedPxPerFrame = 26
    const smoothing = 0.2
    let targetVelocity = 0
    let currentVelocity = 0
    let rafId: number | null = null

    const handleAutoScrollOnDrag = (event: DragEvent) => {
      const pointerY = event.clientY
      const viewportHeight = window.innerHeight

      let nextTargetVelocity = 0

      if (pointerY < edgeThresholdPx) {
        const intensity = (edgeThresholdPx - pointerY) / edgeThresholdPx
        nextTargetVelocity = -(maxSpeedPxPerFrame * intensity * intensity)
      } else if (pointerY > viewportHeight - edgeThresholdPx) {
        const intensity = (pointerY - (viewportHeight - edgeThresholdPx)) / edgeThresholdPx
        nextTargetVelocity = maxSpeedPxPerFrame * intensity * intensity
      }

      targetVelocity = nextTargetVelocity
    }

    const animateAutoScroll = () => {
      // Ease toward the target speed for smoother continuous scrolling.
      currentVelocity += (targetVelocity - currentVelocity) * smoothing

      if (Math.abs(currentVelocity) < 0.1 && Math.abs(targetVelocity) < 0.1) {
        currentVelocity = 0
      } else {
        window.scrollBy({ top: currentVelocity, behavior: "auto" })
      }

      rafId = window.requestAnimationFrame(animateAutoScroll)
    }

    rafId = window.requestAnimationFrame(animateAutoScroll)
    window.addEventListener("dragover", handleAutoScrollOnDrag, true)

    return () => {
      targetVelocity = 0
      currentVelocity = 0
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId)
      }
      window.removeEventListener("dragover", handleAutoScrollOnDrag, true)
    }
  }, [draggingCampaignId])

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
  }, [reports, searchParams])

  const handleDropToSlot = (slotIndex: number, droppedCampaignId: string | null) => {
    if (!droppedCampaignId) return

    setSelectedCampaignIds((current) => {
      if (current.includes(droppedCampaignId)) {
        setWarning("Duplicate selection is not allowed. Choose a different campaign.")
        return current
      }

      const next: CampaignSlots = [...current] as CampaignSlots
      next[slotIndex] = droppedCampaignId
      setWarning("")
      return next
    })

    setDraggingCampaignId(null)
    setHoveredSlot(null)
  }

  const handleRemoveFromSlot = (slotIndex: number) => {
    setSelectedCampaignIds((current) => {
      const next: CampaignSlots = [...current] as CampaignSlots
      next[slotIndex] = null
      return next
    })
  }

  const scrollToReportOutput = () => {
    window.setTimeout(() => {
      reportSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    }, 120)
  }

  const runReportGeneration = () => {
    const uniqueCampaignIds = Array.from(new Set(selectedCampaigns.map((campaign) => campaign.id)))

    if (uniqueCampaignIds.length < 2) {
      setWarning("Select at least 2 campaigns to generate a comparison report.")
      return
    }

    setWarning("")
    setIsGenerating(true)

    window.setTimeout(() => {
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
      setIsGenerating(false)
      scrollToReportOutput()
    }, 2000)
  }

  const analyzeSingleCampaign = () => {
    if (!singleCampaignId) {
      setWarning("Select a campaign to run single analysis.")
      return
    }

    const selected = campaignMap.get(singleCampaignId)
    if (!selected) {
      setWarning("Selected campaign could not be found.")
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
    scrollToReportOutput()
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
    <div className="min-h-screen bg-[#090b14]">
      <main className="mx-auto max-w-7xl px-4 py-8">
        <header className="mb-8 rounded-2xl border border-[#2b3150] bg-[linear-gradient(160deg,rgba(53,45,92,0.55),rgba(18,21,38,0.95))] p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-[#f5f7ff]">Campaign Analytics</h1>
              <p className="mt-1 text-sm text-[#a5accb]">
                Compare up to 3 campaigns, analyze trends, generate insight-rich reports, and download PDF summaries.
              </p>
            </div>
            <Badge className="border border-[#60a5fa]/40 bg-[#60a5fa]/15 text-[#bfdbfe]">
              Frontend Analytics Module
            </Badge>
          </div>
        </header>

        <section className="mb-8 rounded-2xl border border-[#2b3150] bg-[#121526] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[#dbe1ff]">
              <BarChart3 className="h-4 w-4 text-[#34d399]" />
              <h2 className="text-base font-semibold">Analysis Mode</h2>
            </div>
            <div className="inline-flex items-center rounded-xl border border-[#2b3150] bg-[#0f1328] p-1">
              <button
                type="button"
                onClick={() => {
                  setAnalysisMode("single")
                  setWarning("")
                }}
                className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                  analysisMode === "single" ? "bg-[#1f2a4f] text-[#e5edff]" : "text-[#9ca8d0] hover:text-[#d3dcff]"
                }`}
              >
                Single Campaign
              </button>
              <button
                type="button"
                onClick={() => {
                  setAnalysisMode("compare")
                  setWarning("")
                }}
                className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                  analysisMode === "compare" ? "bg-[#1f2a4f] text-[#e5edff]" : "text-[#9ca8d0] hover:text-[#d3dcff]"
                }`}
              >
                Compare Campaigns
              </button>
            </div>
          </div>
          <p className="mt-2 text-sm text-[#9ca8d0]">
            Choose single mode for deep analysis of one campaign, or compare mode for side-by-side campaign reporting.
          </p>
        </section>

        {analysisMode === "compare" ? (
          <>
            <section className="mb-8">
          <div className="mb-3 flex items-center gap-2 text-[#dbe1ff]">
            <Activity className="h-4 w-4 text-[#a78bfa]" />
            <h2 className="text-base font-semibold">Campaign Library</h2>
          </div>

          {campaigns.length === 0 ? (
            <Card className="rounded-2xl border border-[#2b3150] bg-[#121526]">
              <CardContent className="py-10 text-sm text-[#a5accb]">No campaign data is available.</CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {campaigns.map((campaign) => {
                const totalResponses = getCampaignTotalResponses(campaign)

                return (
                  <Card
                    key={campaign.id}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData("text/plain", campaign.id)
                      event.dataTransfer.effectAllowed = "copyMove"
                      setDraggingCampaignId(campaign.id)
                      setWarning("")
                    }}
                    onDragEnd={() => {
                      setDraggingCampaignId(null)
                      setHoveredSlot(null)
                    }}
                    className="cursor-grab rounded-2xl border border-[#2b3150] bg-[linear-gradient(180deg,rgba(27,32,58,0.95),rgba(18,21,38,0.95))] active:cursor-grabbing"
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg text-[#f5f7ff]">{campaign.name}</CardTitle>
                      <p className="text-xs text-[#8f98bb]">Launch Date: {formatDateLabel(campaign.date)}</p>
                    </CardHeader>
                    <CardContent>
                      <div className="rounded-xl border border-[#2b3150] bg-[#0f1328] p-3">
                        <p className="text-[11px] uppercase tracking-wide text-[#7d86a9]">Total Responses</p>
                        <p className="text-xl font-semibold text-[#f5f7ff]">{totalResponses}</p>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
            </section>

            <section className="mb-8">
          <div className="mb-3 flex items-center gap-2 text-[#dbe1ff]">
            <LineChartIcon className="h-4 w-4 text-[#22d3ee]" />
            <h2 className="text-base font-semibold">Drag and Drop Comparison Zone</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {selectedCampaignIds.map((campaignId, slotIndex) => {
              const slotCampaign = campaignId ? campaignMap.get(campaignId) : null

              return (
                <div
                  key={`comparison-slot-${slotIndex}`}
                  onDragOver={(event) => {
                    event.preventDefault()
                    setHoveredSlot(slotIndex)
                  }}
                  onDragLeave={() => setHoveredSlot((current) => (current === slotIndex ? null : current))}
                  onDrop={(event) => {
                    event.preventDefault()
                    const payloadId = event.dataTransfer.getData("text/plain")
                    handleDropToSlot(slotIndex, draggingCampaignId || payloadId)
                  }}
                  className={`min-h-[140px] rounded-2xl border border-dashed p-4 transition-all ${
                    hoveredSlot === slotIndex
                      ? "border-[#22d3ee] bg-[#22d3ee]/10"
                      : "border-[#2b3150] bg-[#121526]"
                  }`}
                >
                  <p className="mb-3 text-xs uppercase tracking-wide text-[#7f87aa]">Slot {slotIndex + 1}</p>
                  {slotCampaign ? (
                    <div className="rounded-xl border border-[#2b3150] bg-[#0f1328] p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-[#f5f7ff]">{slotCampaign.name}</p>
                          <p className="text-xs text-[#8f98bb]">{formatDateLabel(slotCampaign.date)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveFromSlot(slotIndex)}
                          className="rounded-md border border-[#3e466c] p-1.5 text-[#c4c9e2] transition-colors hover:border-[#ef4444] hover:text-[#fecaca]"
                          aria-label={`Remove ${slotCampaign.name} from slot ${slotIndex + 1}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-[80px] items-center justify-center rounded-xl border border-[#2b3150] bg-[#0f1328]/70 text-sm text-[#93a0d3]">
                      Drop Campaign Here
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button onClick={runReportGeneration} className="bg-[#22c55e] text-[#062112] hover:bg-[#16a34a]">
              <TrendingUp className="mr-2 h-4 w-4" />
              Generate Comparison
            </Button>
            {isGenerating ? (
              <p className="inline-flex items-center gap-2 text-sm text-[#7dd3fc]">
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating report... (~2 seconds)
              </p>
            ) : null}
            {warning ? <p className="text-sm text-[#fca5a5]">{warning}</p> : null}
          </div>
            </section>
          </>
        ) : (
          <>
            <section className="mb-8 rounded-2xl border border-[#2b3150] bg-[#121526] p-4">
              <div className="mb-3 flex items-center gap-2 text-[#dbe1ff]">
                <Activity className="h-4 w-4 text-[#a78bfa]" />
                <h2 className="text-base font-semibold">Single Campaign Selection</h2>
              </div>
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <div className="relative w-full md:max-w-md">
                  <select
                    value={singleCampaignId}
                    onChange={(event) => {
                      setSingleCampaignId(event.target.value)
                      setWarning("")
                    }}
                    className="w-full appearance-none rounded-xl border border-[#2b3150] bg-[#0f1328] px-3 py-2 pr-10 text-sm text-[#e5edff]"
                  >
                    <option value="">Select a campaign</option>
                    {campaigns.map((campaign) => (
                      <option key={campaign.id} value={campaign.id}>
                        {campaign.name} ({formatDateLabel(campaign.date)})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca8d0]" />
                </div>
                <Button onClick={analyzeSingleCampaign} className="bg-[#22c55e] text-[#062112] hover:bg-[#16a34a]">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Analyze Campaign
                </Button>
              </div>
              {warning ? <p className="mt-3 text-sm text-[#fca5a5]">{warning}</p> : null}
            </section>

            {singleCampaign && singleMetric ? (
              <section ref={reportSectionRef} className="pb-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-[#dbe1ff]">
                    <BarChart3 className="h-4 w-4 text-[#34d399]" />
                    <h2 className="text-base font-semibold">Single Campaign Analysis</h2>
                  </div>
                  {singleReport ? (
                    <Button className="bg-[#2563eb] text-white hover:bg-[#1d4ed8]" onClick={() => void exportReportToPdf(singleReport)}>
                      <Download className="mr-2 h-4 w-4" />
                      Download Detailed PDF
                    </Button>
                  ) : null}
                </div>

                <div className="space-y-5 rounded-2xl border border-[#2b3150] bg-[#11152b] p-5">
                  <Card className="rounded-2xl border border-[#2f3b66] bg-[#121735]">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg text-[#f5f7ff]">Campaign Overview</CardTitle>
                      <p className="text-xs text-[#9ca8d0]">
                        {singleCampaign.name} | Launch Date: {formatDateLabel(singleCampaign.date)}
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm text-[#d4dbfb]">
                      {singleSummaryLines.map((line) => (
                        <p key={line}>{line}</p>
                      ))}
                    </CardContent>
                  </Card>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <Card className="rounded-2xl border border-[#2f3b66] bg-[#121735]">
                      <CardContent className="p-4">
                        <p className="text-xs uppercase tracking-wide text-[#9ca8d0]">Campaign Score</p>
                        <p className="mt-2 text-xl font-semibold text-[#f5f7ff]">{singleHealthScore.toFixed(1)} / 100</p>
                      </CardContent>
                    </Card>
                    <Card className="rounded-2xl border border-[#2f3b66] bg-[#121735]">
                      <CardContent className="p-4">
                        <p className="text-xs uppercase tracking-wide text-[#9ca8d0]">Total Responses</p>
                        <p className="mt-2 text-xl font-semibold text-[#f5f7ff]">{singleMetric.totalResponses}</p>
                      </CardContent>
                    </Card>
                    <Card className="rounded-2xl border border-[#2f3b66] bg-[#121735]">
                      <CardContent className="p-4">
                        <p className="text-xs uppercase tracking-wide text-[#9ca8d0]">Engagement / Day</p>
                        <p className="mt-2 text-xl font-semibold text-[#f5f7ff]">{singleMetric.engagementRate.toFixed(1)}</p>
                      </CardContent>
                    </Card>
                    <Card className="rounded-2xl border border-[#2f3b66] bg-[#121735]">
                      <CardContent className="p-4">
                        <p className="text-xs uppercase tracking-wide text-[#9ca8d0]">Sentiment Score</p>
                        <p className="mt-2 text-xl font-semibold text-[#f5f7ff]">{singleMetric.sentimentScore.toFixed(1)}</p>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="rounded-2xl border border-[#2b3150] bg-[#121735]">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg text-[#f5f7ff]">Response Trend</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {singleTrendRows.length > 0 ? (
                        <div className="h-[290px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={singleTrendRows} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                              <CartesianGrid stroke="#2b3150" strokeDasharray="3 3" />
                              <XAxis dataKey="label" stroke="#9ca8d0" tick={{ fill: "#9ca8d0", fontSize: 12 }} />
                              <YAxis stroke="#9ca8d0" tick={{ fill: "#9ca8d0", fontSize: 12 }} />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: "#0f1430",
                                  border: "1px solid #2b3150",
                                  borderRadius: "10px",
                                }}
                              />
                              <Line
                                type="monotone"
                                dataKey={singleCampaign.name}
                                stroke="#38bdf8"
                                strokeWidth={2}
                                dot={{ r: 2 }}
                                activeDot={{ r: 4 }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <p className="text-sm text-[#9ca8d0]">No response timeline available for this campaign.</p>
                      )}
                    </CardContent>
                  </Card>

                  {singleReport ? (
                    <>
                      <Card className="rounded-2xl border border-[#2b3150] bg-[#121735]">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg text-[#f5f7ff]">Detailed KPI Snapshot</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="overflow-x-auto">
                            <table className="min-w-full border-collapse text-sm">
                              <thead>
                                <tr className="text-left text-[#9ca8d0]">
                                  <th className="border-b border-[#2b3150] px-3 py-2">Campaign</th>
                                  <th className="border-b border-[#2b3150] px-3 py-2">Responses</th>
                                  <th className="border-b border-[#2b3150] px-3 py-2">Engagement / Day</th>
                                  <th className="border-b border-[#2b3150] px-3 py-2">Positive %</th>
                                  <th className="border-b border-[#2b3150] px-3 py-2">Negative %</th>
                                  <th className="border-b border-[#2b3150] px-3 py-2">Consistency</th>
                                  <th className="border-b border-[#2b3150] px-3 py-2">Drop-off</th>
                                </tr>
                              </thead>
                              <tbody>
                                {singleReport.metrics.map((metric) => (
                                  <tr key={`single-kpi-${metric.campaignId}`} className="text-[#e6ebff]">
                                    <td className="border-b border-[#232946] px-3 py-2">{metric.campaignName}</td>
                                    <td className="border-b border-[#232946] px-3 py-2">{metric.totalResponses}</td>
                                    <td className="border-b border-[#232946] px-3 py-2">{metric.engagementRate.toFixed(2)}</td>
                                    <td className="border-b border-[#232946] px-3 py-2 text-[#4ade80]">{formatPercent(metric.positiveRate)}</td>
                                    <td className="border-b border-[#232946] px-3 py-2 text-[#f87171]">{formatPercent(metric.negativeRate)}</td>
                                    <td className="border-b border-[#232946] px-3 py-2">{metric.consistencyLevel}</td>
                                    <td className="border-b border-[#232946] px-3 py-2">{metric.dropOffPct.toFixed(1)}%</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="rounded-2xl border border-[#2b3150] bg-[#121735]">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg text-[#f5f7ff]">Auto-Generated Insights</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2 text-sm text-[#d4dbfb]">
                            {singleReport.insights.map((insight) => (
                              <li key={insight} className="rounded-xl border border-[#2b3150] bg-[#0f1430] px-3 py-2">
                                {insight}
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>

                      <Card className="rounded-2xl border border-[#2b3150] bg-[#121735]">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg text-[#f5f7ff]">Pattern Observations</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2 text-sm text-[#d4dbfb]">
                            {singleReport.patternObservations.map((observation) => (
                              <li key={observation} className="rounded-xl border border-[#2b3150] bg-[#0f1430] px-3 py-2">
                                {observation}
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>

                      <Card className="rounded-2xl border border-[#2b3150] bg-[#121735]">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg text-[#f5f7ff]">Final Recommendation</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="rounded-xl border border-[#2b3150] bg-[#0f1430] px-3 py-2 text-sm text-[#d4dbfb]">
                            {singleReport.finalRecommendation}
                          </p>
                        </CardContent>
                      </Card>

                      <Card className="rounded-2xl border border-[#2b3150] bg-[#101a38]">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg text-[#d9e5ff]">Final Summary</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 text-sm text-[#dbe5ff]">
                            {singleReport.finalSummary.map((line) => (
                              <p key={line}>{line}</p>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
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
              <div className="flex items-center gap-2 text-[#dbe1ff]">
                <BarChart3 className="h-4 w-4 text-[#34d399]" />
                <h2 className="text-base font-semibold">Report Output</h2>
              </div>
              <Button className="bg-[#2563eb] text-white hover:bg-[#1d4ed8]" onClick={() => void exportReportToPdf()}>
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </Button>
            </div>

            <div className="space-y-5 rounded-2xl border border-[#2b3150] bg-[#11152b] p-5">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <Card className="rounded-2xl border border-[#2f3b66] bg-[#121735]">
                  <CardContent className="p-4">
                    <p className="text-xs uppercase tracking-wide text-[#9ca8d0]">Best Performing</p>
                    <p className="mt-2 text-sm font-semibold text-[#f5f7ff]">{activeReport.highlights.bestPerforming}</p>
                  </CardContent>
                </Card>
                <Card className="rounded-2xl border border-[#2f3b66] bg-[#121735]">
                  <CardContent className="p-4">
                    <p className="text-xs uppercase tracking-wide text-[#9ca8d0]">Highest Engagement</p>
                    <p className="mt-2 text-sm font-semibold text-[#f5f7ff]">{activeReport.highlights.highestEngagement}</p>
                  </CardContent>
                </Card>
                <Card className="rounded-2xl border border-[#2f3b66] bg-[#121735]">
                  <CardContent className="p-4">
                    <p className="text-xs uppercase tracking-wide text-[#9ca8d0]">Best Sentiment</p>
                    <p className="mt-2 text-sm font-semibold text-[#f5f7ff]">{activeReport.highlights.bestSentiment}</p>
                  </CardContent>
                </Card>
                <Card className="rounded-2xl border border-[#2f3b66] bg-[#121735]">
                  <CardContent className="p-4">
                    <p className="text-xs uppercase tracking-wide text-[#9ca8d0]">Most Volatile</p>
                    <p className="mt-2 text-sm font-semibold text-[#f5f7ff]">{activeReport.highlights.mostVolatile}</p>
                  </CardContent>
                </Card>
              </div>

              <Card className="rounded-2xl border border-[#355087] bg-[#132040]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm uppercase tracking-wide text-[#bcd7ff]">Comparative Highlights</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-[#d4e3ff]">
                  {comparativeHighlights.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </CardContent>
              </Card>

              <div className="rounded-xl border border-[#2b3150] bg-[#0f1430] px-3 py-2 text-xs uppercase tracking-[0.14em] text-[#8ea4df]">
                Page 1 - Executive Comparison Snapshot
              </div>

              <Card className="rounded-2xl border border-[#2b3150] bg-[#121735]">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-[#f5f7ff]">Executive Summary</CardTitle>
                  <p className="text-xs text-[#9ca8d0]">
                    Comparative report for {reportCampaignLabel} | Generated on {formatDateLabel(activeReport.generatedAt)}
                  </p>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-[#d4dbfb]">
                  {activeReport.summaryLines.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </CardContent>
              </Card>

              <Card className="rounded-2xl border border-[#2b3150] bg-[#121735]">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-[#f5f7ff]">KPI Table</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse text-sm">
                      <thead>
                        <tr className="text-left text-[#9ca8d0]">
                          <th className="border-b border-[#2b3150] px-3 py-2">Campaign Name</th>
                          <th className="border-b border-[#2b3150] px-3 py-2">Total Responses</th>
                          <th className="border-b border-[#2b3150] px-3 py-2">Engagement / Day</th>
                          <th className="border-b border-[#2b3150] px-3 py-2">Positive %</th>
                          <th className="border-b border-[#2b3150] px-3 py-2">Negative %</th>
                          <th className="border-b border-[#2b3150] px-3 py-2">Sentiment Score</th>
                          <th className="border-b border-[#2b3150] px-3 py-2">Rank</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeReport.metrics.map((metric) => (
                          <tr key={metric.campaignId} className="text-[#e6ebff]">
                            <td className="border-b border-[#232946] px-3 py-2">{metric.campaignName}</td>
                            <td className="border-b border-[#232946] px-3 py-2">{metric.totalResponses}</td>
                            <td className="border-b border-[#232946] px-3 py-2">{metric.engagementRate.toFixed(1)}</td>
                            <td className="border-b border-[#232946] px-3 py-2 text-[#4ade80]">
                              {formatPercent(metric.positiveRate)}
                            </td>
                            <td className="border-b border-[#232946] px-3 py-2 text-[#f87171]">
                              {formatPercent(metric.negativeRate)}
                            </td>
                            <td className="border-b border-[#232946] px-3 py-2 text-[#93c5fd]">{metric.sentimentScore.toFixed(1)}</td>
                            <td className="border-b border-[#232946] px-3 py-2">#{metric.rank}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-5 xl:grid-cols-2">
                <Card className="rounded-2xl border border-[#2b3150] bg-[#121735]">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg text-[#f5f7ff]">Responses Over Time</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {lineChartData.length > 0 ? (
                      <div className="h-[290px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={lineChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid stroke="#2b3150" strokeDasharray="3 3" />
                            <XAxis dataKey="label" stroke="#9ca8d0" tick={{ fill: "#9ca8d0", fontSize: 12 }} />
                            <YAxis
                              stroke="#9ca8d0"
                              tick={{ fill: "#9ca8d0", fontSize: 12 }}
                              label={{ value: "Responses", angle: -90, position: "insideLeft", fill: "#9ca8d0", fontSize: 11 }}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "#0f1430",
                                border: "1px solid #2b3150",
                                borderRadius: "10px",
                              }}
                              labelStyle={{ color: "#dbe4ff" }}
                              formatter={(value: number, name: string) => [`${value} responses`, name]}
                            />
                            <Legend />
                            {activeReportCampaigns.map((campaign, index) => {
                              const colors = ["#38bdf8", "#a78bfa", "#34d399"]
                              return (
                                <Line
                                  key={campaign.id}
                                  type="monotone"
                                  dataKey={campaign.name}
                                  stroke={colors[index]}
                                  strokeWidth={2}
                                  dot={{ r: 2 }}
                                  activeDot={{ r: 4 }}
                                />
                              )
                            })}
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <p className="text-sm text-[#9ca8d0]">No timeline data available for selected campaigns.</p>
                    )}
                    <p className="mt-3 text-xs text-[#9ca8d0]">
                      This chart compares how response volume changed across each selected campaign date by date.
                    </p>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border border-[#2b3150] bg-[#121735]">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg text-[#f5f7ff]">Positive vs Negative Responses</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {barChartData.length > 0 ? (
                      <div className="h-[290px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={barChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid stroke="#2b3150" strokeDasharray="3 3" />
                            <XAxis dataKey="name" stroke="#9ca8d0" tick={{ fill: "#9ca8d0", fontSize: 12 }} />
                            <YAxis
                              stroke="#9ca8d0"
                              tick={{ fill: "#9ca8d0", fontSize: 12 }}
                              label={{ value: "Responses", angle: -90, position: "insideLeft", fill: "#9ca8d0", fontSize: 11 }}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "#0f1430",
                                border: "1px solid #2b3150",
                                borderRadius: "10px",
                              }}
                              formatter={(value: number, name: string) => [`${value} responses`, name]}
                            />
                            <Legend />
                            <Bar dataKey="positive" name="Positive" fill="#22c55e" radius={[5, 5, 0, 0]} />
                            <Bar dataKey="negative" name="Negative" fill="#ef4444" radius={[5, 5, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <p className="text-sm text-[#9ca8d0]">No sentiment totals available for selected campaigns.</p>
                    )}
                    <p className="mt-3 text-xs text-[#9ca8d0]">
                      Bars highlight positive (green) and negative (red) totals to expose sentiment quality gaps.
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card className="rounded-2xl border border-[#2b3150] bg-[#121735]">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-[#f5f7ff]">Analytics Summary Visuals</CardTitle>
                  <p className="text-xs text-[#9ca8d0]">
                    Response distribution, sentiment movement over time, and response-vs-sentiment pattern mapping.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-5 xl:grid-cols-3">
                    <div className="rounded-xl border border-[#2b3150] bg-[#0f1430] p-3">
                      <p className="mb-2 text-sm font-medium text-[#dbe1ff]">Response Distribution</p>
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
                                    fill={DISTRIBUTION_COLORS[index % DISTRIBUTION_COLORS.length]}
                                  />
                                ))}
                              </Pie>
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: "#0f1430",
                                  border: "1px solid #2b3150",
                                  borderRadius: "10px",
                                }}
                                labelStyle={{ color: "#dbe4ff" }}
                                formatter={(value: number, _name: string, payload) => {
                                  const share = Number(payload?.payload?.sharePct || 0)
                                  return [`${value} responses (${share.toFixed(1)}%)`, payload?.name || "Campaign"]
                                }}
                              />
                              <Legend wrapperStyle={{ color: "#c9d6ff", fontSize: "12px" }} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <p className="text-sm text-[#9ca8d0]">No distribution data available.</p>
                      )}
                    </div>

                    <div className="rounded-xl border border-[#2b3150] bg-[#0f1430] p-3">
                      <p className="mb-2 text-sm font-medium text-[#dbe1ff]">Sentiment Trend Over Time</p>
                      {sentimentTrendData.length > 0 ? (
                        <div className="h-[270px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={sentimentTrendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                              <CartesianGrid stroke="#2b3150" strokeDasharray="3 3" />
                              <XAxis dataKey="label" stroke="#9ca8d0" tick={{ fill: "#9ca8d0", fontSize: 12 }} />
                              <YAxis stroke="#9ca8d0" tick={{ fill: "#9ca8d0", fontSize: 12 }} />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: "#0f1430",
                                  border: "1px solid #2b3150",
                                  borderRadius: "10px",
                                }}
                                labelStyle={{ color: "#dbe4ff" }}
                              />
                              <Legend wrapperStyle={{ color: "#c9d6ff", fontSize: "12px" }} />
                              <Area
                                type="monotone"
                                dataKey="sentimentScore"
                                name="Sentiment Score"
                                stroke="#22d3ee"
                                fill="#22d3ee"
                                fillOpacity={0.26}
                                strokeWidth={2}
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <p className="text-sm text-[#9ca8d0]">No sentiment trend data available.</p>
                      )}
                    </div>

                    <div className="rounded-xl border border-[#2b3150] bg-[#0f1430] p-3">
                      <p className="mb-2 text-sm font-medium text-[#dbe1ff]">Responses vs Sentiment Score</p>
                      {responseVsSentimentData.length > 0 ? (
                        <div className="h-[270px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                              <CartesianGrid stroke="#2b3150" strokeDasharray="3 3" />
                              <XAxis
                                type="number"
                                dataKey="responses"
                                name="Responses"
                                stroke="#9ca8d0"
                                tick={{ fill: "#9ca8d0", fontSize: 12 }}
                              />
                              <YAxis
                                type="number"
                                dataKey="sentimentScore"
                                name="Sentiment Score"
                                stroke="#9ca8d0"
                                tick={{ fill: "#9ca8d0", fontSize: 12 }}
                              />
                              <Tooltip
                                cursor={{ strokeDasharray: "3 3" }}
                                contentStyle={{
                                  backgroundColor: "#0f1430",
                                  border: "1px solid #2b3150",
                                  borderRadius: "10px",
                                }}
                                labelStyle={{ color: "#dbe4ff" }}
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
                                    <div className="rounded-lg border border-[#2b3150] bg-[#0f1430] p-2 text-xs text-[#dbe4ff]">
                                      <p className="font-semibold text-[#f5f7ff]">{point.campaignName}</p>
                                      <p>Responses: {point.responses}</p>
                                      <p>Sentiment Score: {point.sentimentScore}</p>
                                      <p>Engagement/Day: {point.engagementRate}</p>
                                    </div>
                                  )
                                }}
                              />
                              <Legend wrapperStyle={{ color: "#c9d6ff", fontSize: "12px" }} />
                              <Scatter
                                name="Campaign Points"
                                data={responseVsSentimentData}
                                fill="#a78bfa"
                              />
                            </ScatterChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <p className="text-sm text-[#9ca8d0]">No scatter data available.</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border border-[#2b3150] bg-[#121735]">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-[#f5f7ff]">Comparative Trend Deltas</CardTitle>
                </CardHeader>
                <CardContent>
                  {activeReport.pairwise.length > 0 ? (
                    <div className="space-y-2">
                      {activeReport.pairwise.map((comparison) => (
                        <div
                          key={`${comparison.previousCampaignId}-${comparison.currentCampaignId}`}
                          className="rounded-xl border border-[#2b3150] bg-[#0f1430] p-3 text-sm"
                        >
                          <p className="font-medium text-[#e3e9ff]">
                            {comparison.currentCampaignName} vs {comparison.previousCampaignName}
                          </p>
                          <p className="mt-1 text-[#aeb8db]">
                            Response change: {formatDeltaPercent(comparison.responseChangePct)} | Negative-rate change: {formatDeltaPercent(comparison.negativeRateChangePct)}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[#9ca8d0]">Not enough campaigns selected for comparative pair analysis.</p>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-2xl border border-[#2b3150] bg-[#121735]">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-[#f5f7ff]">Auto-Generated Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-[#d4dbfb]">
                    {activeReport.insights.map((insight) => (
                      <li key={insight} className="rounded-xl border border-[#2b3150] bg-[#0f1430] px-3 py-2">
                        {insight}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <div className="rounded-xl border border-[#2b3150] bg-[#0f1430] px-3 py-2 text-xs uppercase tracking-[0.14em] text-[#8ea4df]">
                Page 2 - Advanced Analytics Interpretation
              </div>

              <Card className="rounded-2xl border border-[#2b3150] bg-[#121735]">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-[#f5f7ff]">Advanced Metrics Section</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse text-sm">
                      <thead>
                        <tr className="text-left text-[#9ca8d0]">
                          <th className="border-b border-[#2b3150] px-3 py-2">Campaign</th>
                          <th className="border-b border-[#2b3150] px-3 py-2">Engagement Rate</th>
                          <th className="border-b border-[#2b3150] px-3 py-2">Consistency</th>
                          <th className="border-b border-[#2b3150] px-3 py-2">Sentiment Score</th>
                          <th className="border-b border-[#2b3150] px-3 py-2">Peak Contribution</th>
                          <th className="border-b border-[#2b3150] px-3 py-2">Drop-off</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeReport.metrics.map((metric) => (
                          <tr key={`advanced-${metric.campaignId}`} className="text-[#e6ebff]">
                            <td className="border-b border-[#232946] px-3 py-2">{metric.campaignName}</td>
                            <td className="border-b border-[#232946] px-3 py-2">{metric.engagementRate.toFixed(2)} / day</td>
                            <td className="border-b border-[#232946] px-3 py-2">{metric.consistencyLevel} ({metric.consistencyScore.toFixed(2)})</td>
                            <td className="border-b border-[#232946] px-3 py-2">{metric.sentimentScore.toFixed(1)}</td>
                            <td className="border-b border-[#232946] px-3 py-2">{metric.peakContributionPct.toFixed(1)}%</td>
                            <td className="border-b border-[#232946] px-3 py-2">{metric.dropOffPct.toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border border-[#2b3150] bg-[#121735]">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-[#f5f7ff]">Comparative Analysis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-[#d4dbfb]">
                  {activeReport.comparativeAnalysis.map((paragraph) => (
                    <p key={paragraph} className="rounded-xl border border-[#2b3150] bg-[#0f1430] px-3 py-2">
                      {paragraph}
                    </p>
                  ))}
                </CardContent>
              </Card>

              <Card className="rounded-2xl border border-[#2b3150] bg-[#121735]">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-[#f5f7ff]">Pattern Observations</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-[#d4dbfb]">
                    {activeReport.patternObservations.map((observation) => (
                      <li key={observation} className="rounded-xl border border-[#2b3150] bg-[#0f1430] px-3 py-2">
                        {observation}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border border-[#2b3150] bg-[#121735]">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-[#f5f7ff]">Final Recommendation</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="rounded-xl border border-[#2b3150] bg-[#0f1430] px-3 py-2 text-sm text-[#d4dbfb]">
                    {activeReport.finalRecommendation}
                  </p>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border border-[#2b3150] bg-[#101a38]">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-[#d9e5ff]">Final Summarization</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-[#dbe5ff]">
                    {activeReport.finalSummary.map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                  </div>
                </CardContent>
              </Card>
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
    <Suspense fallback={<div className="min-h-screen bg-[#090b14]" />}>
      <ClientAnalyticsPageContent />
    </Suspense>
  )
}
