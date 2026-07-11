"use client"

import { useEffect, useMemo, useState } from "react"
import { BarChart3, Download, RefreshCcw, Eye, FileText } from "lucide-react"
import { useRouter } from "next/navigation"

const REPORTS_STORAGE_KEY = "trustvox.client.analytics.reports.v1"

type HistoryReportMetric = { campaignId: string; campaignName: string }
type HistoryReport = {
  id: string
  generatedAt: string
  campaignIds: string[]
  metrics: HistoryReportMetric[]
  summaryLines: string[]
  finalSummary: string[]
}

function formatDateLabel(value: string) {
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) return value
  return new Date(parsed).toLocaleString("en-US")
}

export default function ClientAnalyticsHistoryPage() {
  const router = useRouter()
  const [reports, setReports] = useState<HistoryReport[]>([])

  useEffect(() => {
    const loadReports = () => {
      try {
        const raw = window.localStorage.getItem(REPORTS_STORAGE_KEY)
        if (!raw) {
          setReports([])
          return
        }

        const parsed = JSON.parse(raw)
        if (!Array.isArray(parsed)) {
          setReports([])
          return
        }

        const normalized = parsed
          .filter((entry) => typeof entry?.id === "string")
          .map((entry) => ({
            id: entry.id,
            generatedAt: typeof entry.generatedAt === "string" ? entry.generatedAt : new Date().toISOString(),
            campaignIds: Array.isArray(entry.campaignIds)
              ? entry.campaignIds.filter((id: unknown) => typeof id === "string")
              : [],
            metrics: Array.isArray(entry.metrics)
              ? entry.metrics
                  .filter((metric: Record<string, unknown>) => typeof metric?.campaignId === "string" && typeof metric?.campaignName === "string")
                  .map((metric: HistoryReportMetric) => ({
                    campaignId: metric.campaignId,
                    campaignName: metric.campaignName,
                  }))
              : [],
            summaryLines: Array.isArray(entry.summaryLines)
              ? entry.summaryLines.filter((line: unknown) => typeof line === "string")
              : [],
            finalSummary: Array.isArray(entry.finalSummary)
              ? entry.finalSummary.filter((line: unknown) => typeof line === "string")
              : [],
          }))

        setReports(normalized)
      } catch {
        setReports([])
      }
    }

    loadReports()
    window.addEventListener("focus", loadReports)

    return () => {
      window.removeEventListener("focus", loadReports)
    }
  }, [])

  const sortedReports = useMemo(
    () => [...reports].sort((left, right) => Date.parse(right.generatedAt) - Date.parse(left.generatedAt)),
    [reports],
  )

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-7xl px-4 py-8">
        <header className="tvx-card-gold mb-8 rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="font-display text-2xl font-bold text-ink">Analytics History</h1>
              <p className="mt-1 text-sm text-ink-dim">
                View previously generated campaign analytics reports, re-open analysis context, and trigger downloads.
              </p>
            </div>
            <span className="inline-flex items-center rounded-full border border-gold/30 bg-gold/10 px-2.5 py-0.5 text-xs font-semibold text-gold">Report Archive</span>
          </div>
        </header>

        {sortedReports.length === 0 ? (
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] py-12 text-center text-sm text-ink-dim">
            No analytics history found yet. Generate reports from Analytics to build your history.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {sortedReports.map((report) => {
              const metricNames = report.metrics.map((metric) => metric.campaignName)
              const campaignLabel = metricNames.length > 0 ? metricNames.join(" vs ") : report.campaignIds.join(" vs ")
              const summary = report.finalSummary?.[0] || report.summaryLines?.[0] || "Comparative report ready for review."
              const campaignsParam = encodeURIComponent(report.campaignIds.join(","))

              return (
                <div key={report.id} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
                  <h3 className="text-base font-semibold text-ink">{campaignLabel || "Untitled report"}</h3>
                  <p className="mb-3 text-xs text-ink-muted">Generated: {formatDateLabel(report.generatedAt)}</p>
                  <p className="mb-4 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-ink-dim">{summary}</p>

                  <div className="flex flex-wrap gap-2">
                    <button
                      className="inline-flex items-center rounded-lg border border-white/15 bg-white/[0.04] px-3 py-1.5 text-sm font-medium text-ink-dim transition hover:bg-white/[0.08]"
                      onClick={() => router.push(`/client/analytics?mode=compare&reportId=${report.id}`)}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View
                    </button>

                    <button
                      className="inline-flex items-center rounded-lg border border-white/15 bg-white/[0.04] px-3 py-1.5 text-sm font-medium text-ink-dim transition hover:bg-white/[0.08]"
                      onClick={() => router.push(`/client/analytics?mode=compare&reportId=${report.id}&download=1`)}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download PDF
                    </button>

                    <button
                      className="inline-flex items-center rounded-lg border border-mint/30 bg-mint/10 px-3 py-1.5 text-sm font-medium text-mint transition hover:bg-mint/20"
                      onClick={() => router.push(`/client/analytics?mode=compare&campaigns=${campaignsParam}`)}
                    >
                      <RefreshCcw className="mr-2 h-4 w-4" />
                      Re-analyze
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <section className="mt-8 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
          <div className="flex items-center gap-2 text-ink">
            <FileText className="h-4 w-4 text-gold" />
            <h2 className="text-sm font-semibold">Tip</h2>
          </div>
          <p className="mt-2 text-sm text-ink-muted">
            Use Re-analyze when campaign data has changed and you want a fresh report with the same campaign selection.
          </p>
          <button
            className="mt-3 inline-flex items-center rounded-lg bg-gradient-to-b from-[#f2c877] to-gold-deep px-4 py-2 text-sm font-semibold text-[#241a06] transition hover:brightness-105"
            onClick={() => router.push("/client/analytics")}
          >
            <BarChart3 className="mr-2 h-4 w-4" />
            Open Analytics
          </button>
        </section>
      </main>
    </div>
  )
}
