"use client"

import { useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, BarChart3, Edit2, Eye, MessageSquare } from "lucide-react"
import { getCampaignDetails } from "@/lib/client-campaigns"

const FORM_STATUS_LABEL = {
  draft: "Draft",
  pending: "Pending",
  approved: "Live",
  rejected: "Draft",
}

const FORM_STATUS_STYLE = {
  draft: "border-white/15 bg-white/[0.04] text-ink-muted",
  pending: "border-gold/30 bg-gold/10 text-gold",
  approved: "border-mint/30 bg-mint/10 text-mint",
  rejected: "border-white/15 bg-white/[0.04] text-ink-muted",
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
      <div className="min-h-screen bg-background px-4 py-10">
        <div className="mx-auto max-w-5xl rounded-xl border border-white/[0.07] bg-white/[0.02] p-6 text-center">
          <h1 className="text-lg font-semibold text-ink">Campaign not found</h1>
          <p className="mt-1 text-sm text-ink-dim">This campaign may have been removed or is unavailable.</p>
          <button
            className="mt-4 inline-flex items-center justify-center rounded-lg bg-gradient-to-b from-[#f2c877] to-gold-deep px-4 py-2 text-sm font-semibold text-[#241a06] transition hover:brightness-105"
            onClick={() => router.push("/client/campaigns")}
          >
            Back to Campaigns
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-6xl px-4 py-8">
        <button
          className="mb-4 inline-flex items-center rounded-lg px-3 py-2 text-sm text-ink-dim transition hover:bg-white/[0.06] hover:text-ink"
          onClick={() => router.push("/client/campaigns")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Campaigns
        </button>

        <section className="tvx-card-gold mb-6 rounded-2xl border border-white/[0.08] bg-gradient-to-b from-surface to-[#0e1017] p-6">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-gold/30 bg-gold/10 px-2.5 py-0.5 text-xs font-semibold text-gold">{campaign.status}</span>
            <span className="text-xs uppercase tracking-wide text-ink-muted">Campaign details</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-ink">{campaign.name}</h1>
          <p className="mt-1 max-w-3xl text-sm text-ink-dim">{campaign.description}</p>

          <div className="mt-5 grid grid-cols-3 gap-3 sm:max-w-xl">
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
              <p className="tvx-num text-xl font-semibold text-ink">{campaign.formsCount}</p>
              <p className="text-xs text-ink-muted">Forms</p>
            </div>
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
              <p className="tvx-num text-xl font-semibold text-ink">{campaign.totalResponses}</p>
              <p className="text-xs text-ink-muted">Responses</p>
            </div>
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
              <p className="tvx-num text-xl font-semibold text-ink">{campaign.averageRating > 0 ? campaign.averageRating.toFixed(1) : "—"}</p>
              <p className="text-xs text-ink-muted">Avg rating</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-ink">Forms in this campaign</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {campaign.forms.map((form) => (
              <div key={form.id} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h3 className="truncate text-base font-semibold text-ink">{form.title || "Untitled Form"}</h3>
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${FORM_STATUS_STYLE[form.status]}`}>{FORM_STATUS_LABEL[form.status]}</span>
                </div>

                <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-ink-dim">
                  <span className="inline-flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" /> {form.responseCount} responses</span>
                  <span>·</span>
                  <span>{new Date(form.createdAt).toLocaleDateString()}</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {(form.status === "draft" || form.status === "rejected") ? (
                    <button
                      className="inline-flex items-center rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-ink-dim transition hover:bg-gold/10 hover:text-gold"
                      onClick={() => router.push(`/client/create-feedback?edit=${form.id}`)}
                    >
                      <Edit2 className="mr-1.5 h-3.5 w-3.5" />
                      Edit
                    </button>
                  ) : null}
                  <button
                    className="inline-flex items-center rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-ink-dim transition hover:bg-white/[0.06] hover:text-ink"
                    onClick={() => router.push("/client/forms")}
                  >
                    <Eye className="mr-1.5 h-3.5 w-3.5" />
                    View
                  </button>
                  {form.status === "approved" ? (
                    <button
                      className="ml-auto inline-flex items-center rounded-lg border border-mint/30 bg-mint/10 px-3 py-1.5 text-xs font-medium text-mint transition hover:bg-mint/20"
                      onClick={() => router.push(`/client/forms/${form.id}/analytics`)}
                    >
                      <BarChart3 className="mr-1.5 h-3.5 w-3.5" />
                      Analytics
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          {campaign.forms.length === 0 ? (
            <div className="mt-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-8 text-center text-sm text-ink-dim">
              No forms added to this campaign yet.
            </div>
          ) : null}
        </section>
      </main>
    </div>
  )
}
