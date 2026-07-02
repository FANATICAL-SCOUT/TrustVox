"use client"

import { useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, BarChart3, Edit2, Eye, MessageSquare } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getCampaignDetails } from "@/lib/client-campaigns"

const FORM_STATUS_LABEL = {
  draft: "Draft",
  pending: "Pending",
  approved: "Live",
  rejected: "Draft",
}

const FORM_STATUS_STYLE = {
  draft: "border-slate-400/35 bg-slate-500/10 text-slate-300",
  pending: "border-amber-400/35 bg-amber-500/10 text-amber-200",
  approved: "border-emerald-400/35 bg-emerald-500/10 text-emerald-200",
  rejected: "border-slate-400/35 bg-slate-500/10 text-slate-300",
}

export default function CampaignDetailsPage() {
  const params = useParams()
  const router = useRouter()

  const campaign = useMemo(() => {
    const id = Array.isArray(params?.campaignId) ? params.campaignId[0] : params?.campaignId
    if (!id) return null
    return getCampaignDetails(id)
  }, [params?.campaignId])

  if (!campaign) {
    return (
      <div className="min-h-screen bg-[#090b14] px-4 py-10">
        <div className="mx-auto max-w-5xl rounded-2xl border border-[#2b3150] bg-[#121526] p-6 text-center">
          <h1 className="text-lg font-semibold text-[#f5f7ff]">Campaign not found</h1>
          <p className="mt-1 text-sm text-[#a5accb]">This campaign may have been removed or is unavailable.</p>
          <Button className="mt-4 bg-[#8b5cf6] text-[#090b14] hover:bg-[#7c3aed]" onClick={() => router.push("/client/campaigns")}>
            Back to Campaigns
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
          onClick={() => router.push("/client/campaigns")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Campaigns
        </Button>

        <section className="mb-6 rounded-2xl border border-[#2b3150] bg-[linear-gradient(120deg,rgba(167,139,250,0.14),rgba(18,21,38,0.96))] p-6">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge className="border border-[#a78bfa]/40 bg-[#8b5cf6]/10 text-[#ddd6fe]">{campaign.status}</Badge>
            <span className="text-xs uppercase tracking-wide text-[#6c7396]">Campaign details</span>
          </div>
          <h1 className="text-2xl font-bold text-[#f5f7ff]">{campaign.name}</h1>
          <p className="mt-1 max-w-3xl text-sm text-[#a5accb]">{campaign.description}</p>

          <div className="mt-5 grid grid-cols-3 gap-3 sm:max-w-xl">
            <div className="rounded-lg border border-[#2b3150] bg-[#121526] p-3">
              <p className="text-xl font-semibold text-[#f5f7ff]">{campaign.formsCount}</p>
              <p className="text-xs text-[#6c7396]">Forms</p>
            </div>
            <div className="rounded-lg border border-[#2b3150] bg-[#121526] p-3">
              <p className="text-xl font-semibold text-[#f5f7ff]">{campaign.totalResponses}</p>
              <p className="text-xs text-[#6c7396]">Responses</p>
            </div>
            <div className="rounded-lg border border-[#2b3150] bg-[#121526] p-3">
              <p className="text-xl font-semibold text-[#f5f7ff]">{campaign.averageRating.toFixed(1)}</p>
              <p className="text-xs text-[#6c7396]">Avg rating</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-[#f5f7ff]">Forms in this campaign</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {campaign.forms.map((form) => (
              <Card key={form.id} className="border-[#2b3150] bg-[#121526]">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="truncate text-base text-[#f5f7ff]">{form.title || "Untitled Form"}</CardTitle>
                    <Badge className={`border ${FORM_STATUS_STYLE[form.status]}`}>{FORM_STATUS_LABEL[form.status]}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-[#a5accb]">
                    <span className="inline-flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" /> {form.responseCount} responses</span>
                    <span>·</span>
                    <span>{new Date(form.createdAt).toLocaleDateString()}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {(form.status === "draft" || form.status === "rejected") ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="border border-[#2b3150] text-[#a5accb] hover:bg-[#8b5cf6]/10 hover:text-[#d7ddf5]"
                        onClick={() => router.push(`/client/create-feedback?edit=${form.id}`)}
                      >
                        <Edit2 className="mr-1.5 h-3.5 w-3.5" />
                        Edit
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="border border-[#2b3150] text-[#a5accb] hover:bg-[#1a1f33] hover:text-[#f5f7ff]"
                      onClick={() => router.push("/client/forms")}
                    >
                      <Eye className="mr-1.5 h-3.5 w-3.5" />
                      View
                    </Button>
                    {form.status === "approved" ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="ml-auto border border-[#a78bfa]/30 text-[#a78bfa] hover:bg-[#8b5cf6]/10"
                        onClick={() => router.push(`/client/forms/${form.id}/analytics`)}
                      >
                        <BarChart3 className="mr-1.5 h-3.5 w-3.5" />
                        Analytics
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {campaign.forms.length === 0 ? (
            <div className="mt-3 rounded-xl border border-[#2b3150] bg-[#121526] p-8 text-center text-sm text-[#a5accb]">
              No forms added to this campaign yet.
            </div>
          ) : null}
        </section>
      </main>
    </div>
  )
}
