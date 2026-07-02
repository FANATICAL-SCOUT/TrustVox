import { getClientForms, type FeedbackForm } from "@/lib/feedback-store"

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

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

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

function calculateAverageRating(forms: FeedbackForm[]): number {
  const totalResponses = forms.reduce((sum, form) => sum + form.responseCount, 0)
  const approvedCount = forms.filter((form) => form.status === "approved").length
  const pendingCount = forms.filter((form) => form.status === "pending").length

  const score = 3.7 + totalResponses * 0.01 + approvedCount * 0.08 - pendingCount * 0.03
  return Number(clamp(score, 3.5, 4.9).toFixed(1))
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

export function getCampaignSummaries(clientId = "client-1"): CampaignSummary[] {
  const forms = getClientForms(clientId)

  return CAMPAIGNS.map((campaign) => {
    const campaignForms = forms.filter((form) => inferCampaignId(form) === campaign.id)
    const totalResponses = campaignForms.reduce((sum, form) => sum + form.responseCount, 0)

    return {
      ...campaign,
      status: deriveStatus(campaignForms, campaign.defaultStatus),
      formsCount: campaignForms.length,
      totalResponses,
      averageRating: calculateAverageRating(campaignForms),
    }
  })
}

export function getCampaignDetails(campaignId: string, clientId = "client-1") {
  const campaign = CAMPAIGNS.find((item) => item.id === campaignId)
  if (!campaign) return null

  const forms = getClientForms(clientId).filter((form) => inferCampaignId(form) === campaignId)
  const totalResponses = forms.reduce((sum, form) => sum + form.responseCount, 0)

  return {
    ...campaign,
    status: deriveStatus(forms, campaign.defaultStatus),
    formsCount: forms.length,
    totalResponses,
    averageRating: calculateAverageRating(forms),
    forms,
  }
}
