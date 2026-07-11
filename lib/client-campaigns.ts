// ─── TrustVox Client Campaigns ───────────────────────────────────────────────
// Supabase-backed campaigns (migrated in Phase 8.6 — see ARCHITECTURE.md §4,
// §6, §8). There is still no create/edit-campaign UI, so each client's 3
// template campaigns are auto-provisioned (idempotent insert-if-missing) into
// their own real `campaigns` rows on first read, instead of living in a
// shared in-memory constant. Forms are bucketed into a campaign by the same
// keyword heuristic as before; the CampaignSummary aggregates (formsCount,
// totalResponses, averageRating) stay derived from real forms/responses, not
// stored.
import { createClient, getCachedUser } from "@/lib/supabase/client"
import type { Tables } from "@/lib/supabase/types"
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

type SupabaseClient = ReturnType<typeof createClient>
type CampaignTemplateKey = "product-launch-2026" | "customer-experience-q2" | "mobile-ux-revamp"

const DEFAULT_CAMPAIGN_TEMPLATES: Record<
  CampaignTemplateKey,
  { name: string; description: string; defaultStatus: CampaignStatus }
> = {
  "product-launch-2026": {
    name: "Product Launch 2026",
    description: "Collect launch readiness and product quality feedback across flagship offerings.",
    defaultStatus: "active",
  },
  "customer-experience-q2": {
    name: "Customer Experience Q2",
    description: "Track service quality, support satisfaction, and customer journey friction points.",
    defaultStatus: "draft",
  },
  "mobile-ux-revamp": {
    name: "Mobile UX Revamp",
    description: "Measure usability gains and adoption patterns for the latest mobile redesign.",
    defaultStatus: "completed",
  },
}

function inferTemplateKey(form: FeedbackForm): CampaignTemplateKey {
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

async function getCurrentUserId(): Promise<string | null> {
  const supabase = createClient()
  const user = await getCachedUser(supabase)
  return user?.id ?? null
}

function mapCampaignRow(row: Tables<"campaigns">): ClientCampaign {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    defaultStatus: row.status,
  }
}

// Idempotent insert-if-missing: every client always has exactly these 3
// template campaigns, now as real rows instead of a shared in-memory list.
async function ensureClientCampaigns(supabase: SupabaseClient, clientId: string): Promise<Tables<"campaigns">[]> {
  const { data: existing, error } = await supabase.from("campaigns").select("*").eq("client_id", clientId)
  if (error) throw error

  const existingNames = new Set((existing ?? []).map((row) => row.name))
  const missingTemplates = Object.values(DEFAULT_CAMPAIGN_TEMPLATES).filter(
    (template) => !existingNames.has(template.name),
  )

  if (missingTemplates.length === 0) return existing ?? []

  const { data: inserted, error: insertError } = await supabase
    .from("campaigns")
    .insert(
      missingTemplates.map((template) => ({
        client_id: clientId,
        name: template.name,
        description: template.description,
        status: template.defaultStatus,
      })),
    )
    .select("*")

  if (insertError) throw insertError
  return [...(existing ?? []), ...(inserted ?? [])]
}

function deriveStatus(forms: FeedbackForm[], fallback: CampaignStatus): CampaignStatus {
  if (forms.length === 0) return fallback
  if (forms.some((form) => form.status === "pending" || form.status === "approved")) return "active"
  if (forms.every((form) => form.status === "approved")) return "completed"
  return "draft"
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

export async function listCampaigns(clientId?: string): Promise<ClientCampaign[]> {
  const supabase = createClient()
  const resolvedClientId = clientId ?? (await getCurrentUserId())
  if (!resolvedClientId) return []

  const rows = await ensureClientCampaigns(supabase, resolvedClientId)
  return rows.map(mapCampaignRow)
}

export async function getCampaignLabelById(campaignId: string, clientId?: string): Promise<string> {
  const campaigns = await listCampaigns(clientId)
  return campaigns.find((campaign) => campaign.id === campaignId)?.name || "Unassigned Campaign"
}

// Sync/pure by design: called from per-form render loops, so it takes the
// already-loaded campaign list instead of fetching (see client/forms page).
export function getCampaignForForm(form: FeedbackForm, campaigns: ClientCampaign[]): ClientCampaign | null {
  const templateName = DEFAULT_CAMPAIGN_TEMPLATES[inferTemplateKey(form)].name
  return campaigns.find((campaign) => campaign.name === templateName) ?? null
}

async function getClientCampaignsWithForms(clientId?: string) {
  const campaigns = await listCampaigns(clientId)
  const formsByCampaignId = new Map<string, FeedbackForm[]>()
  if (campaigns.length === 0) return { campaigns, formsByCampaignId }

  const campaignIdByTemplateKey = new Map<CampaignTemplateKey, string>()
  for (const campaign of campaigns) {
    const templateKey = (Object.keys(DEFAULT_CAMPAIGN_TEMPLATES) as CampaignTemplateKey[]).find(
      (key) => DEFAULT_CAMPAIGN_TEMPLATES[key].name === campaign.name,
    )
    if (templateKey) campaignIdByTemplateKey.set(templateKey, campaign.id)
  }

  const forms = await getClientForms(clientId)
  for (const form of forms) {
    const campaignId = campaignIdByTemplateKey.get(inferTemplateKey(form))
    if (!campaignId) continue
    const bucket = formsByCampaignId.get(campaignId) ?? []
    bucket.push(form)
    formsByCampaignId.set(campaignId, bucket)
  }

  return { campaigns, formsByCampaignId }
}

export async function getCampaignSummaries(clientId?: string): Promise<CampaignSummary[]> {
  const { campaigns, formsByCampaignId } = await getClientCampaignsWithForms(clientId)

  return Promise.all(
    campaigns.map(async (campaign) => {
      const campaignForms = formsByCampaignId.get(campaign.id) ?? []
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
  const { campaigns, formsByCampaignId } = await getClientCampaignsWithForms(clientId)
  const campaign = campaigns.find((item) => item.id === campaignId)
  if (!campaign) return null

  const forms = formsByCampaignId.get(campaign.id) ?? []
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
