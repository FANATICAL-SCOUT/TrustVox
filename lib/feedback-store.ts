// ─── TrustVox Feedback Store ───────────────────────────────────────────────
// Supabase-backed store for the feedback builder / distribution system
// (migrated in Phase 8.3 — see docs/backend/ARCHITECTURE.md §4, §6, §8).
// All functions are async and run through the RLS-gated browser client;
// column names are snake_case in the DB and mapped to the camelCase shape
// the UI expects at the boundary in this file.
import { createClient, nextChannelId } from "@/lib/supabase/client";
import type { Json, Tables, TablesInsert, TablesUpdate } from "@/lib/supabase/types";
import { logFlow } from "@/lib/debug-log";
import type { RealtimeChannel } from "@supabase/supabase-js";

export type QuestionType =
  | "star-rating"
  | "text-short"
  | "text-long"
  | "multiple-choice"
  | "multi-select"
  | "tag-selection"
  | "voice-feedback";

export type FormStatus = "draft" | "pending" | "approved" | "rejected";
export type FormVisibility = "private" | "public" | "link";

export interface Question {
  id: string;
  type: QuestionType;
  title: string;
  required: boolean;
  options: string[]; // for multiple-choice / multi-select / tag-selection
}

// Loosely-shaped feedback/opportunity object passed between dashboard UI
// components (landing, suggested, history, company modal, profile). The real
// shape varies by call site -- sometimes a full opportunity card, sometimes
// just {id, formId}, sometimes a saved draft or a completed-feedback record --
// so every field beyond `id` is optional by design, not an oversight.
export interface FeedbackHandoff {
  id: string | number;
  formId?: string;
  company?: string;
  product?: string;
  category?: string;
  description?: string;
  feedback?: string;
  reward?: number;
  rating?: number;
  totalFeedbacks?: number;
  participants?: number;
  estimatedTime?: string;
  tags?: string[];
  badges?: string[];
  status?: string;
  date?: string;
  tokensEarned?: number;
  interactions?: number;
}

export interface FeedbackForm {
  id: string;
  title: string;
  description: string;
  product: string;
  category: string;
  categoryDetails?: string;
  companyId?: string;
  formVisibility?: FormVisibility;
  responseLimit?: number;
  allowAnonymous?: boolean;
  enableRatings?: boolean;
  autoCloseDate?: string;
  questions: Question[];
  status: FormStatus;
  clientId: string;
  clientName: string;
  createdAt: string;
  submittedAt?: string;
  approvedAt?: string;
  rejectionReason?: string;
  requestChangesNote?: string;
  rewardTokens: number;
  responseCount: number;
}

export interface FormResponse {
  id: string;
  formId: string;
  answers: Record<string, unknown>;
  submittedAt: string;
  userId?: string;
  rewardTokens?: number;
}

const DEFAULT_FORM_REWARD_TOKENS = 24;
// Upper bound on a form's per-response reward. Mirrors the `reward_tokens
// between 1 and 1000` CHECK in migration 0008 — the DB is authoritative, this
// keeps the app from ever sending a value the insert would reject. See the 8.8
// self-mint remediation in docs/backend/ARCHITECTURE.md §4.
const MAX_FORM_REWARD_TOKENS = 1000;

type FormRow = Tables<"forms">;
type ResponseRow = Tables<"responses">;
type SupabaseClient = ReturnType<typeof createClient>;

function normalizeRewardTokens(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_FORM_REWARD_TOKENS;
  const rounded = Math.floor(parsed);
  return Math.min(MAX_FORM_REWARD_TOKENS, Math.max(1, rounded));
}

function mapFormRow(row: FormRow, responseCount: number): FeedbackForm {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    product: row.product,
    category: row.category,
    categoryDetails: row.category_details ?? undefined,
    companyId: row.company_id ?? undefined,
    formVisibility: row.visibility,
    responseLimit: row.response_limit ?? undefined,
    allowAnonymous: row.allow_anonymous,
    enableRatings: row.enable_ratings,
    autoCloseDate: row.auto_close_date ?? undefined,
    questions: Array.isArray(row.questions) ? (row.questions as unknown as Question[]) : [],
    status: row.status,
    clientId: row.client_id,
    clientName: row.client_name,
    createdAt: row.created_at,
    submittedAt: row.submitted_at ?? undefined,
    approvedAt: row.approved_at ?? undefined,
    rejectionReason: row.rejection_reason ?? undefined,
    requestChangesNote: row.request_changes_note ?? undefined,
    rewardTokens: row.reward_tokens,
    responseCount,
  };
}

function mapResponseRow(row: ResponseRow): FormResponse {
  return {
    id: row.id,
    formId: row.form_id,
    answers: (row.answers as Record<string, unknown>) ?? {},
    submittedAt: row.submitted_at,
    userId: row.user_id,
    rewardTokens: row.reward_tokens ?? undefined,
  };
}

function sortFormsByLatest(forms: FeedbackForm[]) {
  return [...forms].sort((left, right) => {
    const leftTime = Date.parse(left.approvedAt || left.submittedAt || left.createdAt || "") || 0;
    const rightTime = Date.parse(right.approvedAt || right.submittedAt || right.createdAt || "") || 0;
    return rightTime - leftTime;
  });
}

// response_count is derived (form_response_counts view), never stored, so it
// can't drift from the real number of response rows.
async function fetchResponseCounts(supabase: SupabaseClient, formIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (formIds.length === 0) return map;
  const { data, error } = await supabase
    .from("form_response_counts")
    .select("form_id, response_count")
    .in("form_id", formIds);
  if (error) throw error;
  for (const row of data ?? []) {
    if (row.form_id) map.set(row.form_id, row.response_count ?? 0);
  }
  return map;
}

async function currentUserId(supabase: SupabaseClient): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

// Validates a company id against the real `companies` table. Since 8.5, the
// picker in lib/approved-company-store.ts returns real DB UUIDs, so
// forms.company_id is set directly from the caller's selection — this just
// confirms the company still exists and is active before the write goes in.
async function resolveActiveCompanyId(supabase: SupabaseClient, companyId?: string): Promise<string | null> {
  const trimmed = String(companyId || "").trim();
  if (!trimmed) return null;
  const { data, error } = await supabase
    .from("companies")
    .select("id")
    .eq("id", trimmed)
    .eq("status", "active")
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

function buildFormInsert(partial: Partial<FeedbackForm>, clientId: string, companyId: string | null): TablesInsert<"forms"> {
  return {
    title: partial.title ?? "",
    description: partial.description ?? "",
    product: partial.product ?? "",
    category: partial.category ?? "",
    category_details: partial.categoryDetails ?? null,
    company_id: companyId,
    client_id: clientId,
    client_name: partial.clientName ?? "",
    status: partial.status ?? "draft",
    visibility: partial.formVisibility ?? "private",
    response_limit: partial.responseLimit ?? null,
    allow_anonymous: typeof partial.allowAnonymous === "boolean" ? partial.allowAnonymous : true,
    enable_ratings: typeof partial.enableRatings === "boolean" ? partial.enableRatings : true,
    auto_close_date: partial.autoCloseDate ?? null,
    questions: (partial.questions ?? []) as unknown as Json,
    reward_tokens: normalizeRewardTokens(partial.rewardTokens),
  };
}

// ── Public API ────────────────────────────────────────────────────────────────
export async function getForms(): Promise<FeedbackForm[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("forms").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  const rows = data ?? [];
  const counts = await fetchResponseCounts(supabase, rows.map((row) => row.id));
  return rows.map((row) => mapFormRow(row, counts.get(row.id) ?? 0));
}

export async function getFormById(id: string): Promise<FeedbackForm | undefined> {
  const supabase = createClient();
  const { data, error } = await supabase.from("forms").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return undefined;
  const counts = await fetchResponseCounts(supabase, [data.id]);
  return mapFormRow(data, counts.get(data.id) ?? 0);
}

export async function getApprovedForms(): Promise<FeedbackForm[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("forms").select("*").eq("status", "approved");
  if (error) throw error;
  const rows = data ?? [];
  const counts = await fetchResponseCounts(supabase, rows.map((row) => row.id));
  const sorted = sortFormsByLatest(rows.map((row) => mapFormRow(row, counts.get(row.id) ?? 0)));
  logFlow("query-approved-forms", {
    approvedCount: sorted.length,
    approvedFormIds: sorted.map((form) => form.id),
  });
  return sorted;
}

export async function getClientForms(clientId?: string): Promise<FeedbackForm[]> {
  const supabase = createClient();
  const resolvedClientId = clientId ?? (await currentUserId(supabase));
  if (!resolvedClientId) return [];
  const { data, error } = await supabase
    .from("forms")
    .select("*")
    .eq("client_id", resolvedClientId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = data ?? [];
  const counts = await fetchResponseCounts(supabase, rows.map((row) => row.id));
  return rows.map((row) => mapFormRow(row, counts.get(row.id) ?? 0));
}

export async function getPendingForms(): Promise<FeedbackForm[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("forms")
    .select("*")
    .eq("status", "pending")
    .order("submitted_at", { ascending: false });
  if (error) throw error;
  const rows = data ?? [];
  const counts = await fetchResponseCounts(supabase, rows.map((row) => row.id));
  return rows.map((row) => mapFormRow(row, counts.get(row.id) ?? 0));
}

export async function createForm(partial: Partial<FeedbackForm>): Promise<FeedbackForm> {
  const supabase = createClient();
  const clientId = partial.clientId ?? (await currentUserId(supabase));
  if (!clientId) throw new Error("A signed-in client account is required to create a form.");

  const resolvedCompanyId = await resolveActiveCompanyId(supabase, partial.companyId);
  if (!resolvedCompanyId) {
    logFlow("create-blocked-invalid-company", { companyId: partial.companyId });
    throw new Error("No active approved company selected. Cannot create form.");
  }

  const insertRow = buildFormInsert(partial, clientId, resolvedCompanyId);
  const { data, error } = await supabase.from("forms").insert(insertRow).select("*").single();
  if (error) throw error;

  const mapped = mapFormRow(data, 0);
  logFlow("client-created-form", { formId: mapped.id, status: mapped.status, title: mapped.title });
  return mapped;
}

export async function updateForm(id: string, updates: Partial<FeedbackForm>): Promise<FeedbackForm | null> {
  const supabase = createClient();
  const patch: TablesUpdate<"forms"> = {};

  if ("title" in updates) patch.title = updates.title ?? "";
  if ("description" in updates) patch.description = updates.description ?? "";
  if ("product" in updates) patch.product = updates.product ?? "";
  if ("category" in updates) patch.category = updates.category ?? "";
  if ("categoryDetails" in updates) patch.category_details = updates.categoryDetails ?? null;
  if ("formVisibility" in updates) patch.visibility = updates.formVisibility ?? "private";
  if ("responseLimit" in updates) patch.response_limit = updates.responseLimit ?? null;
  if ("allowAnonymous" in updates) patch.allow_anonymous = updates.allowAnonymous ?? true;
  if ("enableRatings" in updates) patch.enable_ratings = updates.enableRatings ?? true;
  if ("autoCloseDate" in updates) patch.auto_close_date = updates.autoCloseDate ?? null;
  if ("questions" in updates) patch.questions = (updates.questions ?? []) as unknown as Json;
  if ("rewardTokens" in updates) patch.reward_tokens = normalizeRewardTokens(updates.rewardTokens);
  if ("status" in updates) patch.status = updates.status ?? "draft";
  if ("submittedAt" in updates) patch.submitted_at = updates.submittedAt ?? null;
  if ("approvedAt" in updates) patch.approved_at = updates.approvedAt ?? null;
  if ("rejectionReason" in updates) patch.rejection_reason = updates.rejectionReason ?? null;
  if ("requestChangesNote" in updates) patch.request_changes_note = updates.requestChangesNote ?? null;
  if ("clientName" in updates) patch.client_name = updates.clientName ?? "";
  if ("companyId" in updates) patch.company_id = await resolveActiveCompanyId(supabase, updates.companyId);

  const { data, error } = await supabase.from("forms").update(patch).eq("id", id).select("*").maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const counts = await fetchResponseCounts(supabase, [data.id]);
  const mapped = mapFormRow(data, counts.get(data.id) ?? 0);
  logFlow("form-updated", { formId: id, nextStatus: mapped.status });
  return mapped;
}

export async function deleteForm(id: string): Promise<boolean> {
  const supabase = createClient();
  const { data, error } = await supabase.from("forms").delete().eq("id", id).select("id");
  if (error) throw error;
  const deleted = (data?.length ?? 0) > 0;
  if (deleted) {
    logFlow("form-deleted", { formId: id });
  }
  return deleted;
}

export async function submitFormForApproval(id: string): Promise<FeedbackForm | null> {
  const supabase = createClient();
  const existing = await getFormById(id);
  if (!existing) return null;

  const resolvedCompanyId = await resolveActiveCompanyId(supabase, existing.companyId);
  if (!resolvedCompanyId) {
    logFlow("submit-blocked-invalid-company", { formId: id, reason: "Company is not active/approved" });
    return null;
  }

  const updated = await updateForm(id, {
    status: "pending",
    submittedAt: new Date().toISOString(),
    rejectionReason: undefined,
    requestChangesNote: undefined,
  });
  if (updated) {
    logFlow("client-submitted-to-admin", {
      formId: updated.id,
      status: updated.status,
      submittedAt: updated.submittedAt,
    });
  }
  return updated;
}

export async function approveForm(id: string): Promise<FeedbackForm | null> {
  const supabase = createClient();
  const existing = await getFormById(id);
  if (!existing) return null;

  const resolvedCompanyId = await resolveActiveCompanyId(supabase, existing.companyId);
  if (!resolvedCompanyId) {
    logFlow("approve-blocked-invalid-company", {
      formId: id,
      reason: "Company is not active/approved",
      companyId: existing.companyId,
    });
    return null;
  }

  const updated = await updateForm(id, {
    status: "approved",
    approvedAt: new Date().toISOString(),
    rejectionReason: undefined,
  });
  if (updated) {
    logFlow("admin-approved-form", {
      formId: updated.id,
      status: updated.status,
      companyId: updated.companyId,
      clientName: updated.clientName,
      approvedAt: updated.approvedAt,
    });
  }
  return updated;
}

export async function rejectForm(id: string, reason: string): Promise<FeedbackForm | null> {
  const updated = await updateForm(id, {
    status: "rejected",
    rejectionReason: reason,
  });
  if (updated) {
    logFlow("admin-rejected-form", { formId: updated.id, status: updated.status, reason });
  }
  return updated;
}

export async function requestChanges(id: string, note: string): Promise<FeedbackForm | null> {
  const updated = await updateForm(id, {
    status: "draft",
    requestChangesNote: note,
    rejectionReason: undefined,
  });
  if (updated) {
    logFlow("admin-requested-changes", { formId: updated.id, status: updated.status, note });
  }
  return updated;
}

export async function addResponse(
  formId: string,
  answers: Record<string, unknown>,
  options?: { userId?: string; rewardTokens?: number }
): Promise<FormResponse> {
  const supabase = createClient();
  const userId = options?.userId?.trim();
  if (!userId) {
    throw new Error("A signed-in account is required to submit feedback.");
  }

  const form = await getFormById(formId);

  if (form?.autoCloseDate) {
    const closeAt = Date.parse(form.autoCloseDate);
    if (!Number.isNaN(closeAt) && Date.now() > closeAt) {
      logFlow("response-blocked-autoclose", { formId, autoCloseDate: form.autoCloseDate });
      throw new Error("This feedback form is closed.");
    }
  }

  if (form?.responseLimit && form.responseCount >= form.responseLimit) {
    logFlow("response-blocked-response-limit", {
      formId,
      responseCount: form.responseCount,
      responseLimit: form.responseLimit,
    });
    throw new Error("This feedback form reached its response limit.");
  }

  if (await hasUserSubmittedForm(formId, userId)) {
    logFlow("response-blocked-duplicate", { formId, userId, reason: "user-already-submitted" });
    throw new Error("Feedback already submitted by this account.");
  }

  const rewardTokens = normalizeRewardTokens(options?.rewardTokens);
  const { data, error } = await supabase
    .from("responses")
    .insert({
      form_id: formId,
      user_id: userId,
      answers: answers as unknown as Json,
      reward_tokens: rewardTokens,
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("Feedback already submitted by this account.");
    }
    throw error;
  }

  const mapped = mapResponseRow(data);
  logFlow("user-submitted-response", { formId, responseId: mapped.id });
  return mapped;
}

export async function getResponsesByFormId(formId: string): Promise<FormResponse[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("responses")
    .select("*")
    .eq("form_id", formId)
    .order("submitted_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapResponseRow);
}

export async function getResponsesByUser(userId: string): Promise<FormResponse[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("responses")
    .select("*")
    .eq("user_id", userId)
    .order("submitted_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapResponseRow);
}

export async function getSubmittedFormIdsByUser(userId: string): Promise<string[]> {
  const normalizedUserId = String(userId || "").trim();
  if (!normalizedUserId) return [];

  const supabase = createClient();
  const { data, error } = await supabase.from("responses").select("form_id").eq("user_id", normalizedUserId);
  if (error) throw error;

  return Array.from(new Set((data ?? []).map((row) => row.form_id)));
}

export async function hasUserSubmittedForm(formId: string, userId: string): Promise<boolean> {
  const normalizedUserId = String(userId || "").trim();
  if (!formId || !normalizedUserId) return false;

  const supabase = createClient();
  const { data, error } = await supabase
    .from("responses")
    .select("id")
    .eq("form_id", formId)
    .eq("user_id", normalizedUserId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

// Utility: generate a unique question id
export function newQuestionId() {
  return `q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

// Realtime replaces the old same-tab CustomEvent bus (Phase 8.7): any insert/
// update/delete on `forms`, or new rows on `responses` (which move the derived
// response_count), notifies every subscriber — across tabs and users, gated by
// the same RLS policies that already scope reads (§6). `postgres_changes`
// requires these tables to be added to the `supabase_realtime` publication in
// the dashboard (see docs/backend/TRACKER.md).
export function subscribeToFormsUpdates(onUpdate: () => void) {
  if (typeof window === "undefined") return () => {};

  const supabase = createClient();
  const channel: RealtimeChannel = supabase
    // Unique per subscription (see nextChannelId) — never reuse a channel name.
    .channel(`forms-updates-${nextChannelId()}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "forms" }, () => onUpdate())
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "responses" }, () => onUpdate())
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
