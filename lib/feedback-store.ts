// ─── TrustVox Feedback Store ───────────────────────────────────────────────
// Shared localStorage-based store for the feedback builder / distribution system.
// All functions are client-safe (guard against SSR window access).
import { getActiveApprovedCompanies } from "@/lib/approved-company-store";
import { logFlow } from "@/lib/debug-log";

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

// ── Keys ──────────────────────────────────────────────────────────────────────
const FORMS_KEY = "trustvox_feedback_forms";
const RESPONSES_KEY = "trustvox_feedback_responses";
const FORMS_UPDATED_EVENT = "trustvox:forms-updated";

// ── Seed data ─────────────────────────────────────────────────────────────────
const SEED_FORMS: FeedbackForm[] = [
  {
    id: "form-seed-1",
    title: "Product Experience Survey",
    description: "Help us understand your experience with our latest product release.",
    product: "TrustVox Pro",
    category: "Software",
    companyId: "co-software-1",
    status: "approved",
    clientId: "client-1",
    clientName: "Microsoft",
    createdAt: "2026-03-10T09:00:00Z",
    submittedAt: "2026-03-11T10:00:00Z",
    approvedAt: "2026-03-12T14:00:00Z",
    rewardTokens: 40,
    responseCount: 47,
    questions: [
      {
        id: "q1",
        type: "star-rating",
        title: "How would you rate your overall experience?",
        required: true,
        options: [],
      },
      {
        id: "q2",
        type: "multiple-choice",
        title: "How did you hear about us?",
        required: false,
        options: ["Social Media", "Friend/Colleague", "Search Engine", "Advertisement"],
      },
      {
        id: "q3",
        type: "tag-selection",
        title: "What features do you love?",
        required: false,
        options: ["Easy to use", "Fast", "Reliable", "Great support", "Good value"],
      },
      {
        id: "q4",
        type: "text-long",
        title: "Any additional comments or suggestions?",
        required: false,
        options: [],
      },
    ],
  },
  {
    id: "form-seed-2",
    title: "Customer Support Feedback",
    description: "Rate your recent interaction with our support team.",
    product: "Support Services",
    category: "Service",
    companyId: "co-service-6",
    status: "pending",
    clientId: "client-1",
    clientName: "Unilever",
    createdAt: "2026-03-14T11:00:00Z",
    submittedAt: "2026-03-15T09:00:00Z",
    rewardTokens: 28,
    responseCount: 0,
    questions: [
      {
        id: "q1",
        type: "star-rating",
        title: "Rate the support agent's helpfulness",
        required: true,
        options: [],
      },
      {
        id: "q2",
        type: "text-short",
        title: "What issue were you contacting us about?",
        required: true,
        options: [],
      },
    ],
  },
  {
    id: "form-seed-3",
    title: "Mobile App Usability Check",
    description: "Quick usability check for our new mobile app.",
    product: "TrustVox Mobile",
    category: "Mobile App",
    companyId: "co-mobile-app-4",
    status: "draft",
    clientId: "client-1",
    clientName: "Samsung",
    createdAt: "2026-03-16T08:00:00Z",
    rewardTokens: 24,
    responseCount: 0,
    questions: [
      {
        id: "q1",
        type: "star-rating",
        title: "How easy is the app to navigate?",
        required: true,
        options: [],
      },
    ],
  },
  {
    id: "form-seed-4",
    title: "Seller Dashboard Feedback",
    description: "Help us improve the seller dashboard you use every day.",
    product: "Flipkart Seller Hub",
    category: "E-Commerce",
    companyId: "co-e-commerce-4",
    status: "approved",
    clientId: "client-1",
    clientName: "Flipkart",
    createdAt: "2026-05-02T09:00:00Z",
    submittedAt: "2026-05-03T10:00:00Z",
    approvedAt: "2026-05-04T13:00:00Z",
    rewardTokens: 32,
    responseCount: 63,
    questions: [
      {
        id: "q1",
        type: "star-rating",
        title: "How would you rate the new seller dashboard?",
        required: true,
        options: [],
      },
      {
        id: "q2",
        type: "multi-select",
        title: "Which sections do you use most?",
        required: false,
        options: ["Orders", "Inventory", "Payments", "Analytics", "Returns"],
      },
      {
        id: "q3",
        type: "text-short",
        title: "What's one thing that would make the dashboard faster to use?",
        required: false,
        options: [],
      },
    ],
  },
  {
    id: "form-seed-5",
    title: "Rewards App Experience",
    description: "Share your experience with the redesigned Rewards app.",
    product: "Starbucks Rewards App",
    category: "Food & Beverage",
    companyId: "co-food-beverage-4",
    status: "approved",
    clientId: "client-1",
    clientName: "Starbucks",
    createdAt: "2026-05-10T09:00:00Z",
    submittedAt: "2026-05-11T10:00:00Z",
    approvedAt: "2026-05-12T13:00:00Z",
    rewardTokens: 20,
    responseCount: 89,
    questions: [
      {
        id: "q1",
        type: "star-rating",
        title: "How satisfied are you with the Rewards app?",
        required: true,
        options: [],
      },
      {
        id: "q2",
        type: "multiple-choice",
        title: "How often do you redeem rewards?",
        required: false,
        options: ["Every visit", "Weekly", "Monthly", "Rarely"],
      },
      {
        id: "q3",
        type: "voice-feedback",
        title: "Tell us about your last redemption experience",
        required: false,
        options: [],
      },
      {
        id: "q4",
        type: "text-long",
        title: "Anything you'd like to see added to the app?",
        required: false,
        options: [],
      },
    ],
  },
];

// Sample submitted responses so History reads as populated in the demo.
// Tied to distinct seed userIds (never "anonymous") so they never block the
// live demo user from submitting any approved form themselves.
const SEED_RESPONSES: FormResponse[] = [
  {
    id: "resp-seed-1",
    formId: "form-seed-1",
    userId: "seed-user-1",
    submittedAt: "2026-06-20T14:32:00Z",
    rewardTokens: 40,
    answers: {
      q4: "The dashboard redesign feels a lot snappier than before. Great work on the loading times!",
      q1: 5,
      q2: "Search Engine",
      q3: ["Easy to use", "Reliable"],
    },
  },
  {
    id: "resp-seed-2",
    formId: "form-seed-1",
    userId: "seed-user-2",
    submittedAt: "2026-06-25T09:10:00Z",
    rewardTokens: 40,
    answers: {
      q4: "Support resolved my billing question within minutes. Would love a dark mode toggle though.",
      q1: 4,
      q2: "Friend/Colleague",
      q3: ["Fast", "Great support"],
    },
  },
  {
    id: "resp-seed-3",
    formId: "form-seed-4",
    userId: "seed-user-3",
    submittedAt: "2026-06-22T11:05:00Z",
    rewardTokens: 32,
    answers: {
      q1: 4,
      q2: ["Orders", "Analytics"],
      q3: "Bulk-editing prices across listings would save me a ton of time.",
    },
  },
  {
    id: "resp-seed-4",
    formId: "form-seed-5",
    userId: "seed-user-4",
    submittedAt: "2026-06-28T16:45:00Z",
    rewardTokens: 20,
    answers: {
      q4: "Would love seasonal drink previews inside the app before they launch in stores.",
      q1: 5,
      q2: "Every visit",
      q3: "Redeemed a free drink this morning, the scan-to-pay flow was seamless.",
    },
  },
  {
    id: "resp-seed-5",
    formId: "form-seed-5",
    userId: "seed-user-5",
    submittedAt: "2026-06-30T08:20:00Z",
    rewardTokens: 20,
    answers: {
      q4: "Star balance sometimes takes a day to update after purchase.",
      q1: 3,
      q2: "Monthly",
    },
  },
];

// ── Low-level storage helpers ─────────────────────────────────────────────────
function readForms(): FeedbackForm[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(FORMS_KEY);
    if (!raw) {
      const seeded = SEED_FORMS.map((form) => normalizeForm(form));
      localStorage.setItem(FORMS_KEY, JSON.stringify(seeded));
      return seeded;
    }
    const parsed = JSON.parse(raw) as Array<Partial<FeedbackForm>>;
    if (!Array.isArray(parsed)) {
      const seeded = SEED_FORMS.map((form) => normalizeForm(form));
      localStorage.setItem(FORMS_KEY, JSON.stringify(seeded));
      return seeded;
    }

    const normalized = parsed.map((form) => normalizeForm(form));
    localStorage.setItem(FORMS_KEY, JSON.stringify(normalized));
    return normalized;
  } catch {
    return SEED_FORMS.map((form) => normalizeForm(form));
  }
}

function normalizeRewardTokens(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_FORM_REWARD_TOKENS;
  const rounded = Math.floor(parsed);
  return Math.max(1, rounded);
}

function normalizeForm(form: Partial<FeedbackForm>): FeedbackForm {
  const parsedResponseLimit = Number(form.responseLimit);
  const normalizedResponseLimit = Number.isFinite(parsedResponseLimit) && parsedResponseLimit > 0
    ? Math.floor(parsedResponseLimit)
    : undefined;

  const normalizedVisibility =
    form.formVisibility === "public" || form.formVisibility === "link" ? form.formVisibility : "private";

  return {
    id: String(form.id || `form-${Date.now()}`),
    title: String(form.title || ""),
    description: String(form.description || ""),
    product: String(form.product || ""),
    category: String(form.category || ""),
    categoryDetails: form.categoryDetails,
    companyId: form.companyId,
    formVisibility: normalizedVisibility,
    responseLimit: normalizedResponseLimit,
    allowAnonymous: typeof form.allowAnonymous === "boolean" ? form.allowAnonymous : true,
    enableRatings: typeof form.enableRatings === "boolean" ? form.enableRatings : true,
    autoCloseDate: typeof form.autoCloseDate === "string" ? form.autoCloseDate : undefined,
    questions: Array.isArray(form.questions) ? form.questions : [],
    status: (form.status || "draft") as FormStatus,
    clientId: String(form.clientId || "client-1"),
    clientName: String(form.clientName || ""),
    createdAt: String(form.createdAt || new Date().toISOString()),
    submittedAt: form.submittedAt,
    approvedAt: form.approvedAt,
    rejectionReason: form.rejectionReason,
    requestChangesNote: form.requestChangesNote,
    rewardTokens: normalizeRewardTokens(form.rewardTokens),
    responseCount: Number.isFinite(Number(form.responseCount)) ? Math.max(0, Number(form.responseCount)) : 0,
  };
}

function normalizeText(value?: string | null) {
  return String(value || "")
    .toLowerCase()
    .trim();
}

function findMatchingApprovedCompany(form?: Pick<FeedbackForm, "companyId" | "clientName"> | null) {
  if (!form) return null;

  const activeCompanies = getActiveApprovedCompanies();
  const normalizedCompanyId = normalizeText(form.companyId);
  const normalizedClientName = normalizeText(form.clientName);

  const matchedCompany = activeCompanies.find((company) => {
    const companyIdMatches = normalizedCompanyId && company.id === normalizedCompanyId;
    const companyNameMatches = normalizedClientName && normalizeText(company.name) === normalizedClientName;
    return Boolean(companyIdMatches || companyNameMatches);
  });

  return {
    activeCompanies,
    matchedCompany: matchedCompany || null,
  };
}

function sortFormsByLatest(forms: FeedbackForm[]) {
  return [...forms].sort((left, right) => {
    const leftTime = Date.parse(left.approvedAt || left.submittedAt || left.createdAt || "") || 0;
    const rightTime = Date.parse(right.approvedAt || right.submittedAt || right.createdAt || "") || 0;
    return rightTime - leftTime;
  });
}

function emitFormsUpdated(eventType: string, form?: FeedbackForm) {
  if (typeof window === "undefined") return;
  const detail = {
    eventType,
    formId: form?.id,
    status: form?.status,
    at: new Date().toISOString(),
  };
  window.dispatchEvent(new CustomEvent(FORMS_UPDATED_EVENT, { detail }));
  logFlow("forms-updated", detail);
}

function writeForms(forms: FeedbackForm[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(FORMS_KEY, JSON.stringify(forms));
  const persisted = localStorage.getItem(FORMS_KEY);
  logFlow("forms-persisted", { count: forms.length, persisted: Boolean(persisted) });
}

function readResponses(): FormResponse[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RESPONSES_KEY);
    if (!raw) {
      localStorage.setItem(RESPONSES_KEY, JSON.stringify(SEED_RESPONSES));
      return SEED_RESPONSES;
    }
    return JSON.parse(raw) as FormResponse[];
  } catch {
    return SEED_RESPONSES;
  }
}

function writeResponses(responses: FormResponse[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(RESPONSES_KEY, JSON.stringify(responses));
}

// ── Public API ────────────────────────────────────────────────────────────────
export function getForms(): FeedbackForm[] {
  return readForms();
}

export function getFormById(id: string): FeedbackForm | undefined {
  return readForms().find((f) => f.id === id);
}

export function getApprovedForms(): FeedbackForm[] {
  const forms = readForms();
  const approved = forms.filter((form) => normalizeText(form.status) === "approved");
  const sortedApproved = sortFormsByLatest(approved);

  const unmatchedApproved = sortedApproved
    .map((form) => {
      const companyState = findMatchingApprovedCompany(form);
      return {
        form,
        matchedCompany: companyState?.matchedCompany,
      };
    })
    .filter((entry) => !entry.matchedCompany)
    .map((entry) => ({
      formId: entry.form.id,
      companyId: entry.form.companyId,
      clientName: entry.form.clientName,
      status: entry.form.status,
    }));

  logFlow("query-approved-forms", {
    totalForms: forms.length,
    approvedCount: sortedApproved.length,
    unmatchedApprovedCount: unmatchedApproved.length,
    approvedFormIds: sortedApproved.map((form) => form.id),
    unmatchedApproved,
  });
  return sortedApproved;
}

export function getClientForms(clientId = "client-1"): FeedbackForm[] {
  return readForms().filter((f) => f.clientId === clientId);
}

export function getPendingForms(): FeedbackForm[] {
  return readForms().filter((f) => f.status === "pending");
}

export function createForm(partial: Partial<FeedbackForm>): FeedbackForm {
  const forms = readForms();
  const activeCompanies = getActiveApprovedCompanies();
  const defaultCompany = activeCompanies[0];

  if (!defaultCompany) {
    throw new Error("No active approved companies available. Cannot create form.");
  }

  const form = normalizeForm({
    id: `form-${Date.now()}`,
    title: "",
    description: "",
    product: "",
    category: "",
    formVisibility: "private",
    responseLimit: undefined,
    allowAnonymous: true,
    enableRatings: true,
    autoCloseDate: undefined,
    questions: [],
    status: "draft",
    clientId: "client-1",
    companyId: defaultCompany.id,
    clientName: defaultCompany.name,
    createdAt: new Date().toISOString(),
    rewardTokens: DEFAULT_FORM_REWARD_TOKENS,
    responseCount: 0,
    ...partial,
  });
  writeForms([...forms, form]);
  emitFormsUpdated("create", form);
  logFlow("client-created-form", { formId: form.id, status: form.status, title: form.title });
  return form;
}

export function updateForm(id: string, updates: Partial<FeedbackForm>): FeedbackForm | null {
  const forms = readForms();
  const idx = forms.findIndex((f) => f.id === id);
  if (idx === -1) return null;
  const before = forms[idx];
  const updated = normalizeForm({ ...forms[idx], ...updates });
  forms[idx] = updated;
  writeForms(forms);
  emitFormsUpdated("update", updated);
  logFlow("form-updated", {
    formId: id,
    previousStatus: before.status,
    nextStatus: updated.status,
  });
  return updated;
}

export function deleteForm(id: string): boolean {
  const forms = readForms();
  const deleted = forms.find((f) => f.id === id);
  const filtered = forms.filter((f) => f.id !== id);
  if (filtered.length === forms.length) return false;
  writeForms(filtered);
  emitFormsUpdated("delete", deleted);
  logFlow("form-deleted", { formId: id });
  return true;
}

export function submitFormForApproval(id: string): FeedbackForm | null {
  const existing = getFormById(id);
  const activeCompanies = getActiveApprovedCompanies();
  const isValidCompany = Boolean(
    existing &&
    activeCompanies.some(
      (company) => company.id === existing.companyId || company.name.toLowerCase() === (existing.clientName || "").toLowerCase()
    )
  );

  if (!existing || !isValidCompany) {
    logFlow("submit-blocked-invalid-company", { formId: id, reason: "Company is not active/approved" });
    return null;
  }

  const updated = updateForm(id, {
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

export function approveForm(id: string): FeedbackForm | null {
  const existing = getFormById(id);
  const companyState = findMatchingApprovedCompany(existing);
  const isValidCompany = Boolean(existing && companyState?.matchedCompany);

  if (!existing || !isValidCompany) {
    logFlow("approve-blocked-invalid-company", {
      formId: id,
      reason: "Company is not active/approved",
      companyId: existing?.companyId,
      clientName: existing?.clientName,
      activeCompanyCount: companyState?.activeCompanies.length || 0,
    });
    return null;
  }

  const updated = updateForm(id, {
    status: "approved",
    companyId: companyState?.matchedCompany?.id,
    clientName: companyState?.matchedCompany?.name || existing.clientName,
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

export function rejectForm(id: string, reason: string): FeedbackForm | null {
  const updated = updateForm(id, {
    status: "rejected",
    rejectionReason: reason,
  });
  if (updated) {
    logFlow("admin-rejected-form", {
      formId: updated.id,
      status: updated.status,
      reason,
    });
  }
  return updated;
}

export function requestChanges(id: string, note: string): FeedbackForm | null {
  const updated = updateForm(id, {
    status: "draft",
    requestChangesNote: note,
    rejectionReason: undefined,
  });
  if (updated) {
    logFlow("admin-requested-changes", {
      formId: updated.id,
      status: updated.status,
      note,
    });
  }
  return updated;
}

export function addResponse(
  formId: string,
  answers: Record<string, unknown>,
  options?: { userId?: string; rewardTokens?: number }
): FormResponse {
  const responses = readResponses();
  const forms = readForms();
  const form = forms.find((entry) => entry.id === formId);
  const userId = options?.userId?.trim();

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

  if (userId && responses.some((response) => response.formId === formId && response.userId === userId)) {
    logFlow("response-blocked-duplicate", {
      formId,
      userId,
      reason: "user-already-submitted",
    });
    throw new Error("Feedback already submitted by this account.");
  }

  const rewardTokens = normalizeRewardTokens(options?.rewardTokens);
  const response: FormResponse = {
    id: `resp-${Date.now()}`,
    formId,
    answers,
    submittedAt: new Date().toISOString(),
    userId,
    rewardTokens,
  };
  writeResponses([...responses, response]);
  // increment response count
  const idx = forms.findIndex((f) => f.id === formId);
  if (idx !== -1) {
    forms[idx] = { ...forms[idx], responseCount: forms[idx].responseCount + 1 };
    writeForms(forms);
    emitFormsUpdated("response", forms[idx]);
    logFlow("user-submitted-response", {
      formId,
      responseId: response.id,
      responseCount: forms[idx].responseCount,
    });
  }
  return response;
}

export function getResponsesByFormId(formId: string): FormResponse[] {
  return readResponses().filter((r) => r.formId === formId);
}

export function getResponsesByUser(userId: string): FormResponse[] {
  return readResponses().filter((r) => r.userId === userId);
}

export function getSubmittedFormIdsByUser(userId: string): string[] {
  const normalizedUserId = String(userId || "").trim();
  if (!normalizedUserId) return [];

  const uniqueFormIds = new Set(
    readResponses()
      .filter((response) => response.userId === normalizedUserId)
      .map((response) => response.formId)
  );

  return Array.from(uniqueFormIds);
}

export function hasUserSubmittedForm(formId: string, userId: string): boolean {
  const normalizedUserId = String(userId || "").trim();
  if (!formId || !normalizedUserId) return false;

  return readResponses().some((response) => response.formId === formId && response.userId === normalizedUserId);
}

// Utility: generate a unique question id
export function newQuestionId() {
  return `q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export function subscribeToFormsUpdates(onUpdate: () => void) {
  if (typeof window === "undefined") return () => {};

  const handleLocalUpdate = () => onUpdate();
  const handleStorage = (event: StorageEvent) => {
    if (event.key === FORMS_KEY) {
      onUpdate();
      logFlow("storage-sync-update", { key: event.key });
    }
  };

  window.addEventListener(FORMS_UPDATED_EVENT, handleLocalUpdate);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(FORMS_UPDATED_EVENT, handleLocalUpdate);
    window.removeEventListener("storage", handleStorage);
  };
}
