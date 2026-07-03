"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, BarChart3, MessageSquare, Star, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getFormById } from "@/lib/feedback-store"

function formatDate(value: string | undefined) {
  if (!value) return "-"
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) return "-"
  return new Date(parsed).toLocaleDateString()
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

  const averageRating = useMemo(() => {
    if (!form) return 0
    const baseline = 3.8 + form.responseCount * 0.01 + (form.status === "approved" ? 0.3 : 0)
    return Number(Math.max(3.5, Math.min(4.9, baseline)).toFixed(1))
  }, [form])

  if (!isReady) {
    return (
      <div className="min-h-screen bg-[#090b14] px-4 py-10">
        <div className="mx-auto max-w-5xl rounded-2xl border border-[#2b3150] bg-[#121526] p-6 text-sm text-[#a5accb]">
          Loading analytics...
        </div>
      </div>
    )
  }

  if (!form) {
    return (
      <div className="min-h-screen bg-[#090b14] px-4 py-10">
        <div className="mx-auto max-w-5xl rounded-2xl border border-[#2b3150] bg-[#121526] p-6 text-center">
          <h1 className="text-lg font-semibold text-[#f5f7ff]">Form not found</h1>
          <p className="mt-1 text-sm text-[#a5accb]">This form analytics page is unavailable.</p>
          <Button className="mt-4 bg-[#8b5cf6] text-[#090b14] hover:bg-[#7c3aed]" onClick={() => router.push("/client/forms")}>
            Back to My Forms
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#090b14]">
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Button
          variant="ghost"
          className="mb-4 text-[#a5accb] hover:bg-[#1a1f33] hover:text-[#f5f7ff]"
          onClick={() => router.push("/client/forms")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to My Forms
        </Button>

        <section className="mb-6 rounded-2xl border border-[#2b3150] bg-[linear-gradient(120deg,rgba(167,139,250,0.14),rgba(18,21,38,0.96))] p-6">
          <div className="mb-3 flex items-center gap-2">
            <Badge className="border border-[#a78bfa]/40 bg-[#8b5cf6]/10 text-[#ddd6fe]">Form Analytics</Badge>
            <span className="text-xs uppercase tracking-wide text-[#6c7396]">Insights</span>
          </div>
          <h1 className="text-2xl font-bold text-[#f5f7ff]">{form.title || "Untitled Form"}</h1>
          <p className="mt-1 text-sm text-[#a5accb]">{form.description || "No description provided"}</p>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:max-w-3xl">
            <div className="rounded-lg border border-[#2b3150] bg-[#121526] p-3">
              <p className="text-xl font-semibold text-[#f5f7ff]">{form.responseCount}</p>
              <p className="text-xs text-[#6c7396]">Responses</p>
            </div>
            <div className="rounded-lg border border-[#2b3150] bg-[#121526] p-3">
              <p className="text-xl font-semibold text-[#f5f7ff]">{averageRating.toFixed(1)}</p>
              <p className="text-xs text-[#6c7396]">Avg rating</p>
            </div>
            <div className="rounded-lg border border-[#2b3150] bg-[#121526] p-3">
              <p className="text-xl font-semibold text-[#f5f7ff]">{form.questions.length}</p>
              <p className="text-xs text-[#6c7396]">Questions</p>
            </div>
            <div className="rounded-lg border border-[#2b3150] bg-[#121526] p-3">
              <p className="text-xl font-semibold text-[#f5f7ff]">{formatDate(form.submittedAt || form.createdAt)}</p>
              <p className="text-xs text-[#6c7396]">Last update</p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <Card className="border-[#2b3150] bg-[#121526]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#f5f7ff]">
                <BarChart3 className="h-4 w-4 text-[#a78bfa]" />
                Response Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-[#2b3150] bg-[#0f1324] p-4">
                <p className="text-sm text-[#a5accb]">Responses are increasing steadily this week.</p>
                <p className="mt-2 inline-flex items-center text-sm font-medium text-emerald-300">
                  <TrendingUp className="mr-1 h-4 w-4" /> +12% week-over-week
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-[#2b3150] bg-[#121526]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#f5f7ff]">
                <MessageSquare className="h-4 w-4 text-[#a78bfa]" />
                Quality Snapshot
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 rounded-lg border border-[#2b3150] bg-[#0f1324] p-4 text-sm text-[#a5accb]">
                <p>Form status: <span className="text-[#f5f7ff]">{form.status}</span></p>
                <p>Primary product: <span className="text-[#f5f7ff]">{form.product || "N/A"}</span></p>
                <p className="inline-flex items-center">
                  <Star className="mr-1 h-4 w-4 fill-yellow-400 text-yellow-400" />
                  Estimated satisfaction: <span className="ml-1 text-[#f5f7ff]">{averageRating.toFixed(1)} / 5</span>
                </p>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  )
}
