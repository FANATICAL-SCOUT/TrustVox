"use client"

import { useEffect, useMemo, useState } from "react"
import { BarChart3, Download, RefreshCcw, Eye, FileText } from "lucide-react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const REPORTS_STORAGE_KEY = "trustvox.client.analytics.reports.v1"

function formatDateLabel(value) {
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) return value
  return new Date(parsed).toLocaleString("en-US")
}

export default function ClientAnalyticsHistoryPage() {
  const router = useRouter()
  const [reports, setReports] = useState([])

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
              ? entry.campaignIds.filter((id) => typeof id === "string")
              : [],
            metrics: Array.isArray(entry.metrics)
              ? entry.metrics
                  .filter((metric) => typeof metric?.campaignId === "string" && typeof metric?.campaignName === "string")
                  .map((metric) => ({
                    campaignId: metric.campaignId,
                    campaignName: metric.campaignName,
                  }))
              : [],
            summaryLines: Array.isArray(entry.summaryLines)
              ? entry.summaryLines.filter((line) => typeof line === "string")
              : [],
            finalSummary: Array.isArray(entry.finalSummary)
              ? entry.finalSummary.filter((line) => typeof line === "string")
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
    <div className="min-h-screen bg-[#090b14]">
      <main className="mx-auto max-w-7xl px-4 py-8">
        <header className="mb-8 rounded-2xl border border-[#2b3150] bg-[linear-gradient(160deg,rgba(53,45,92,0.55),rgba(18,21,38,0.95))] p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-[#f5f7ff]">Analytics History</h1>
              <p className="mt-1 text-sm text-[#a5accb]">
                View previously generated campaign analytics reports, re-open analysis context, and trigger downloads.
              </p>
            </div>
            <Badge className="border border-[#60a5fa]/40 bg-[#60a5fa]/15 text-[#bfdbfe]">Report Archive</Badge>
          </div>
        </header>

        {sortedReports.length === 0 ? (
          <Card className="rounded-2xl border border-[#2b3150] bg-[#121526]">
            <CardContent className="py-12 text-sm text-[#a5accb]">
              No analytics history found yet. Generate reports from Analytics to build your history.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {sortedReports.map((report) => {
              const metricNames = report.metrics.map((metric) => metric.campaignName)
              const campaignLabel = metricNames.length > 0 ? metricNames.join(" vs ") : report.campaignIds.join(" vs ")
              const summary = report.finalSummary?.[0] || report.summaryLines?.[0] || "Comparative report ready for review."
              const campaignsParam = encodeURIComponent(report.campaignIds.join(","))

              return (
                <Card key={report.id} className="rounded-2xl border border-[#2b3150] bg-[#121526]">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base text-[#f5f7ff]">{campaignLabel || "Untitled report"}</CardTitle>
                    <p className="text-xs text-[#9ba4c8]">Generated: {formatDateLabel(report.generatedAt)}</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="rounded-xl border border-[#2b3150] bg-[#0f1328] px-3 py-2 text-sm text-[#d7def8]">{summary}</p>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        className="border-[#3b4675] bg-transparent text-[#d5dcfb] hover:bg-[#222c52]"
                        onClick={() => router.push(`/client/analytics?mode=compare&reportId=${report.id}`)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View
                      </Button>

                      <Button
                        className="bg-[#3b82f6] text-white hover:bg-[#2563eb]"
                        onClick={() => router.push(`/client/analytics?mode=compare&reportId=${report.id}&download=1`)}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download PDF
                      </Button>

                      <Button
                        className="bg-[#22c55e] text-[#062112] hover:bg-[#16a34a]"
                        onClick={() => router.push(`/client/analytics?mode=compare&campaigns=${campaignsParam}`)}
                      >
                        <RefreshCcw className="mr-2 h-4 w-4" />
                        Re-analyze
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        <section className="mt-8 rounded-2xl border border-[#2b3150] bg-[#121526] p-4">
          <div className="flex items-center gap-2 text-[#dbe1ff]">
            <FileText className="h-4 w-4 text-[#a78bfa]" />
            <h2 className="text-sm font-semibold">Tip</h2>
          </div>
          <p className="mt-2 text-sm text-[#9ca8d0]">
            Use Re-analyze when campaign data has changed and you want a fresh report with the same campaign selection.
          </p>
          <Button
            className="mt-3 bg-[#2563eb] text-white hover:bg-[#1d4ed8]"
            onClick={() => router.push("/client/analytics")}
          >
            <BarChart3 className="mr-2 h-4 w-4" />
            Open Analytics
          </Button>
        </section>
      </main>
    </div>
  )
}
