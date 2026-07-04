import { getClientForms, getResponsesByFormId, type FeedbackForm } from "@/lib/feedback-store"

export type CampaignStatus = "active" | "draft" | "completed"

export interface ClientCampaign {
  id: string
  name: string
  description: string
  defaultStatus: CampaignStatus
}

export interface CampaignSummary extends ClientCampaign {
  status: CampaignStatus
  formsCount: number
  totalResponses: number
  averageRating: number
}

const CAMPAIGNS: ClientCampaign[] = [
  {
    id: "product-launch-2026",
    name: "Product Launch 2026",
    description: "Collect launch readiness and product quality feedback across flagship offerings.",
    defaultStatus: "active",
  },
  {
    id: "customer-experience-q2",
    name: "Customer Experience Q2",
    description: "Track service quality, support satisfaction, and customer journey friction points.",
    defaultStatus: "draft",
  },
  {
    id: "mobile-ux-revamp",
    name: "Mobile UX Revamp",
    description: "Measure usability gains and adoption patterns for the latest mobile redesign.",
    defaultStatus: "completed",
  },
]

function inferCampaignId(form: FeedbackForm): string {
  const category = (form.category || "").toLowerCase()
  const product = (form.product || "").toLowerCase()

  if (category.includes("mobile") || product.includes("mobile")) {
    return "mobile-ux-revamp"
  }
  if (category.includes("service") || product.includes("support")) {
    return "customer-experience-q2"
  }
  return "product-launch-2026"
}

// Real average of numeric star-rating answers across the campaign's real
// submitted responses. Returns 0 (rendered as "no ratings yet" by callers) when
// there's no real data — no formula-derived placeholder score.
async function calculateAverageRating(forms: FeedbackForm[]): Promise<number> {
  let sum = 0
  let count = 0

  const responsesByForm = await Promise.all(forms.map((form) => getResponsesByFormId(form.id)))
  responsesByForm.flat().forEach((response) => {
    const numeric = Object.values(response.answers || {}).find((value) => typeof value === "number")
    if (typeof numeric === "number") {
      sum += numeric
      count += 1
    }
  })

  return count > 0 ? Number((sum / count).toFixed(1)) : 0
}

function deriveStatus(forms: FeedbackForm[], fallback: CampaignStatus): CampaignStatus {
  if (forms.length === 0) return fallback
  if (forms.some((form) => form.status === "pending" || form.status === "approved")) return "active"
  if (forms.every((form) => form.status === "approved")) return "completed"
  return "draft"
}

export function listCampaigns(): ClientCampaign[] {
  return CAMPAIGNS
}

export function getCampaignLabelById(campaignId: string): string {
  return CAMPAIGNS.find((campaign) => campaign.id === campaignId)?.name || "Unassigned Campaign"
}

export function getCampaignForForm(form: FeedbackForm): ClientCampaign {
  const id = inferCampaignId(form)
  return CAMPAIGNS.find((campaign) => campaign.id === id) || CAMPAIGNS[0]
}

export async function getCampaignSummaries(clientId?: string): Promise<CampaignSummary[]> {
  const forms = await getClientForms(clientId)

  return Promise.all(
    CAMPAIGNS.map(async (campaign) => {
      const campaignForms = forms.filter((form) => inferCampaignId(form) === campaign.id)
      const totalResponses = campaignForms.reduce((sum, form) => sum + form.responseCount, 0)

      return {
        ...campaign,
        status: deriveStatus(campaignForms, campaign.defaultStatus),
        formsCount: campaignForms.length,
        totalResponses,
        averageRating: await calculateAverageRating(campaignForms),
      }
    }),
  )
}

export async function getCampaignDetails(campaignId: string, clientId?: string) {
  const campaign = CAMPAIGNS.find((item) => item.id === campaignId)
  if (!campaign) return null

  const clientForms = await getClientForms(clientId)
  const forms = clientForms.filter((form) => inferCampaignId(form) === campaignId)
  const totalResponses = forms.reduce((sum, form) => sum + form.responseCount, 0)

  return {
    ...campaign,
    status: deriveStatus(forms, campaign.defaultStatus),
    formsCount: forms.length,
    totalResponses,
    averageRating: await calculateAverageRating(forms),
    forms,
  }
}
