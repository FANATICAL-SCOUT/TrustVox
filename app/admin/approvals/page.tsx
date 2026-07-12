"use client"

import { useState, useEffect } from "react"
import {
  CheckCircle2, XCircle, MessageSquare, Clock, Eye,
  Shield, RefreshCw, Star, Type, AlignLeft, List, CheckSquare,
  Tag, Mic, ChevronDown, ChevronUp, FileText,
  Check,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  getForms, approveForm, rejectForm, requestChanges, subscribeToFormsUpdates,
  type FeedbackForm,
  type FormStatus,
  type Question,
  type QuestionType,
} from "@/lib/feedback-store"
import {
  getApprovedCompanies, subscribeToApprovedCompanies,
  type ApprovedCompany,
} from "@/lib/approved-company-store"
import { logFlow } from "@/lib/debug-log"

type ApprovalFilterKey = "all" | "pending" | "changes" | "approved" | "rejected"

// Why a pending form can't be approved (bug #10). approveForm() returns null
// when the form's company is missing or not active — mirror that check here so
// the card can say *why* up-front instead of the admin re-clicking into a
// transient "blocked" toast. Returns null when the form is approvable.
// Ties into #7 (a company deactivated after its forms went pending).
function approvalBlockedReason(
  form: FeedbackForm,
  companiesById: Map<string, ApprovedCompany>,
): string | null {
  const companyId = String(form.companyId || "").trim()
  if (!companyId) {
    return "This form isn't linked to an approved company, so it can't be published."
  }
  const company = companiesById.get(companyId)
  if (!company) {
    return "This form's company no longer exists, so it can't be published."
  }
  if (company.status !== "active") {
    return `“${company.name}” is inactive, so this form can't be published. Reactivate the company first.`
  }
  return null
}

// A form the admin sent back for changes: it goes to "draft" status but keeps
// its requestChangesNote. Without this, those forms only showed under "All"
// and dropped out of every other tab + stat card after the admin acted.
const isChangesRequested = (f: FeedbackForm) => f.status === "draft" && !!f.requestChangesNote

// ── Helpers ───────────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  draft:    { label: "Draft",    color: "text-ink-muted", bg: "bg-white/[0.04]", border: "border-white/15" },
  pending:  { label: "Pending",  color: "text-gold",      bg: "bg-gold/10",      border: "border-gold/30" },
  approved: { label: "Live",     color: "text-mint",      bg: "bg-mint/10",      border: "border-mint/30" },
  rejected: { label: "Rejected", color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/30" },
}

const QT_ICONS: Record<QuestionType, LucideIcon> = {
  "star-rating":     Star,
  "text-short":      Type,
  "text-long":       AlignLeft,
  "multiple-choice": List,
  "multi-select":    CheckSquare,
  "tag-selection":   Tag,
  "voice-feedback":  Mic,
}

const QT_LABELS: Record<QuestionType, string> = {
  "star-rating":     "Star Rating",
  "text-short":      "Short Text",
  "text-long":       "Long Text",
  "multiple-choice": "Multiple Choice",
  "multi-select":    "Multi-Select",
  "tag-selection":   "Tag Selection",
  "voice-feedback":  "Voice Feedback",
}

const FILTER_TABS: Array<{ key: ApprovalFilterKey; label: string }> = [
  { key: "all",      label: "All" },
  { key: "pending",  label: "Pending" },
  { key: "changes",  label: "Changes Requested" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
]

function StatusBadge({ status }: { status: FormStatus }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.bg} ${cfg.border} ${cfg.color}`}>
      {cfg.label}
    </span>
  )
}

// ── Preview Dialog ─────────────────────────────────────────────────────────────
function FormPreviewDialog({
  form,
  open,
  onClose,
}: {
  form: FeedbackForm | null
  open: boolean
  onClose: () => void
}) {
  if (!form) return null
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose() }}>
      <DialogContent className="bg-surface-raised border-white/10 max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-ink flex items-center gap-2">
            <Eye size={18} className="text-gold" />
            Form Preview
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.07]">
            <h3 className="text-base font-semibold text-ink">{form.title}</h3>
            {form.description && (
              <p className="text-sm text-ink-dim mt-1">{form.description}</p>
            )}
            <div className="flex gap-2 mt-3 flex-wrap">
              <Badge variant="outline" className="border-gold/30 text-gold text-xs">
                {form.product}
              </Badge>
              <Badge variant="outline" className="border-white/15 text-ink-dim text-xs">
                {form.category}
              </Badge>
            </div>
          </div>

          {form.questions.map((q: Question, i: number) => {
            const Icon = QT_ICONS[q.type] || FileText
            return (
              <div key={q.id} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.07]">
                <div className="flex items-start gap-2 mb-2">
                  <span className="text-xs text-ink-muted shrink-0 mt-0.5">Q{i + 1}</span>
                  <div className="flex-1">
                    <p className="text-sm text-ink font-medium">
                      {q.title}
                      {q.required && <span className="text-destructive ml-1 text-xs">*</span>}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <Icon size={11} className="text-ink-muted" />
                      <span className="text-[10px] text-ink-muted">{QT_LABELS[q.type]}</span>
                    </div>
                    {q.options.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {q.options.map((opt: string) => (
                          <span key={opt} className="px-2 py-0.5 rounded bg-white/[0.04] text-xs text-ink-dim border border-white/[0.07]">
                            {opt}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="text-ink-dim hover:text-ink">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Reject / Request Changes Dialog ──────────────────────────────────────────
function ActionDialog({
  open,
  onClose,
  title,
  description,
  placeholder,
  onConfirm,
  confirmLabel,
  confirmClass,
}: {
  open: boolean
  onClose: () => void
  title: string
  description: string
  placeholder: string
  onConfirm: (note: string) => void
  confirmLabel: string
  confirmClass: string
}) {
  const [reason, setReason] = useState("")
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setReason(""); onClose() } }}>
      <DialogContent className="bg-surface-raised border-white/10 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-ink">{title}</DialogTitle>
        </DialogHeader>
        <div>
          <p className="text-sm text-ink-dim mb-3">{description}</p>
          <Label className="text-xs text-ink-dim mb-1.5 block">Note (optional)</Label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={placeholder}
            className="bg-white/[0.04] border-white/[0.08] text-ink placeholder:text-ink-muted min-h-[80px] resize-none"
          />
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => { setReason(""); onClose() }} className="text-ink-dim">
            Cancel
          </Button>
          <Button
            onClick={() => { onConfirm(reason); setReason(""); onClose() }}
            className={confirmClass}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Approve confirmation ─────────────────────────────────────────────────────
// Bug #8a: "Approve & Publish" is the higher-stakes action (makes the form
// public AND turns on the TVX reward payout), yet it used to fire on a single
// click while Reject/Request-Changes both had a dialog. This adds a lightweight
// confirm — no note field, since approve carries no message to the client.
function ApproveConfirmDialog({
  form,
  open,
  onClose,
  onConfirm,
}: {
  form: FeedbackForm | null
  open: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="bg-surface-raised border-white/10 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-ink flex items-center gap-2">
            <CheckCircle2 size={18} className="text-mint" />
            Approve &amp; Publish
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-ink-dim">
          Publish <span className="text-ink font-medium">“{form?.title || "this form"}”</span> live to users?
          It becomes public immediately and starts paying the TVX reward on every accepted response.
        </p>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose} className="text-ink-dim">
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            className="bg-mint/20 hover:bg-mint/30 text-mint border border-mint/30"
          >
            <CheckCircle2 size={14} className="mr-1.5" />
            Approve &amp; Publish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Review Card ───────────────────────────────────────────────────────────────
function ReviewCard({
  form,
  blockedReason,
  onApprove,
  onReject,
  onRequestChanges,
  onPreview,
}: {
  form: FeedbackForm
  blockedReason: string | null
  onApprove: (form: FeedbackForm) => void
  onReject: (form: FeedbackForm) => void
  onRequestChanges: (form: FeedbackForm) => void
  onPreview: (form: FeedbackForm) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const isPending = form.status === "pending"

  return (
    <div className={`rounded-2xl border bg-white/[0.02] overflow-hidden transition-all duration-200 ${
      isPending ? "border-gold/30" : "border-white/[0.07]"
    }`}>
      {/* Card header */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <StatusBadge status={form.status} />
              <span className="text-xs text-ink-muted">
                by <span className="text-ink-dim">{form.clientName}</span>
              </span>
            </div>
            <h3 className="text-base font-semibold text-ink truncate">{form.title}</h3>
            {form.description && (
              <p className="text-xs text-ink-dim mt-0.5 line-clamp-1">{form.description}</p>
            )}
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="text-ink-dim hover:text-gold gap-1 shrink-0 text-xs border border-white/[0.07] hover:border-gold/40"
            onClick={() => onPreview(form)}
          >
            <Eye size={13} />
            Preview
          </Button>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-3 mt-3 text-xs text-ink-muted flex-wrap">
          <span>{form.questions.length} question{form.questions.length !== 1 ? "s" : ""}</span>
          <span>·</span>
          <span className="text-ink-dim">{form.product}</span>
          <span>·</span>
          <span className="text-ink-dim">{form.category}</span>
          {form.submittedAt && (
            <>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Clock size={10} />
                Submitted {new Date(form.submittedAt).toLocaleDateString()}
              </span>
            </>
          )}
        </div>

        {/* Question summary toggle */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 flex items-center gap-1 text-xs text-ink-muted hover:text-ink-dim transition-colors"
        >
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {expanded ? "Hide" : "Show"} questions
        </button>

        {expanded && (
          <div className="mt-3 space-y-2">
            {form.questions.map((q: Question, i: number) => {
              const Icon = QT_ICONS[q.type] || FileText
              return (
                <div key={q.id} className="flex items-center gap-2 p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.07]">
                  <span className="text-[10px] text-ink-muted w-4 shrink-0">Q{i + 1}</span>
                  <Icon size={12} className="text-gold shrink-0" />
                  <span className="text-xs text-ink-dim flex-1 truncate">{q.title || "Untitled"}</span>
                  {q.required && <span className="text-[10px] text-destructive">Required</span>}
                </div>
              )
            })}
          </div>
        )}

        {/* Rejection / changes message */}
        {form.rejectionReason && (
          <div className="mt-3 p-2.5 rounded-lg bg-destructive/5 border border-destructive/20 text-xs text-destructive">
            <span className="font-medium">Rejection reason: </span>{form.rejectionReason}
          </div>
        )}
        {form.requestChangesNote && (
          <div className="mt-3 p-2.5 rounded-lg bg-gold/5 border border-gold/20 text-xs text-gold">
            <span className="font-medium">Changes requested: </span>{form.requestChangesNote}
          </div>
        )}

        {/* Blocked-from-approval notice (bug #10): a pending form whose company
            is missing/inactive can't be published — say so here instead of a
            transient toast the admin only sees after clicking. */}
        {isPending && blockedReason && (
          <div className="mt-3 p-2.5 rounded-lg bg-destructive/5 border border-destructive/20 text-xs text-destructive">
            <span className="font-medium">Can&apos;t publish: </span>{blockedReason}
          </div>
        )}
      </div>

      {/* Action bar — only for pending */}
      {isPending && (
        <div className="px-5 py-4 border-t border-white/[0.07] bg-white/[0.01] flex items-center gap-2 flex-wrap">
          <button
            disabled={!!blockedReason}
            title={blockedReason ?? undefined}
            aria-label={blockedReason ? `Approve disabled: ${blockedReason}` : undefined}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-b from-[#f2c877] to-gold-deep px-3 py-2 text-xs font-semibold text-[#241a06] transition hover:brightness-105 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:brightness-100"
            onClick={() => onApprove(form)}
          >
            <CheckCircle2 size={14} />
            Approve & Publish
          </button>
          <Button
            size="sm"
            variant="ghost"
            className="text-gold hover:text-gold hover:bg-gold/10 border border-gold/30 gap-1.5 text-xs"
            onClick={() => onRequestChanges(form)}
          >
            <MessageSquare size={14} />
            Request Changes
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive hover:bg-destructive/10 border border-destructive/30 gap-1.5 text-xs ml-auto"
            onClick={() => onReject(form)}
          >
            <XCircle size={14} />
            Reject
          </Button>
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AdminApprovalsPage() {
  const [forms, setForms] = useState<FeedbackForm[]>([])
  const [companies, setCompanies] = useState<ApprovedCompany[]>([])
  const [filter, setFilter] = useState<ApprovalFilterKey>("pending")
  const [previewForm, setPreviewForm] = useState<FeedbackForm | null>(null)
  const [approveTarget, setApproveTarget] = useState<FeedbackForm | null>(null)
  const [rejectTarget, setRejectTarget] = useState<FeedbackForm | null>(null)
  const [changesTarget, setChangesTarget] = useState<FeedbackForm | null>(null)
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  const loadForms = async () => {
    const allForms = await getForms()
    logFlow("admin-page-load-forms", {
      total: allForms.length,
      pending: allForms.filter((f) => f.status === "pending").length,
      approved: allForms.filter((f) => f.status === "approved").length,
    })
    setForms(allForms)
  }

  // Companies drive the per-card blocked-from-approval notice (bug #10). Loaded
  // + subscribed alongside forms so deactivating a company reflects live.
  const loadCompanies = async () => {
    setCompanies(await getApprovedCompanies())
  }

  useEffect(() => {
    void loadForms()
    void loadCompanies()
    const unsubForms = subscribeToFormsUpdates(() => void loadForms())
    const unsubCompanies = subscribeToApprovedCompanies(() => void loadCompanies())
    return () => { unsubForms(); unsubCompanies() }
  }, [])

  const companiesById = new Map(companies.map((c) => [c.id, c]))

  const showToast = (msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 3000)
  }

  const filtered =
    filter === "all"
      ? forms
      : filter === "changes"
        ? forms.filter(isChangesRequested)
        : forms.filter((f) => f.status === filter)

  const counts: Record<ApprovalFilterKey, number> = {
    all:      forms.length,
    pending:  forms.filter((f) => f.status === "pending").length,
    changes:  forms.filter(isChangesRequested).length,
    approved: forms.filter((f) => f.status === "approved").length,
    rejected: forms.filter((f) => f.status === "rejected").length,
  }

  // Open the confirm step (bug #8a). A blocked form never gets here — the card's
  // Approve button is disabled — but guard anyway so a stale click can't slip a
  // blocked form into the dialog.
  function requestApprove(form: FeedbackForm) {
    if (approvalBlockedReason(form, companiesById)) return
    setApproveTarget(form)
  }

  async function handleApprove() {
    if (!approveTarget) return
    const id = approveTarget.id
    setApproveTarget(null)
    const updated = await approveForm(id)
    logFlow("admin-approve-click", {
      formId: id,
      statusAfter: updated?.status,
    })
    if (!updated) {
      // approveForm re-checks the company server-side; if it refuses, the
      // company changed since the card rendered — reload so the notice appears.
      await loadCompanies()
      showToast("Approval blocked: company is inactive or not approved.")
      return
    }
    await loadForms()
    showToast("Form approved and published!")
  }

  async function handleReject(reason: string) {
    if (!rejectTarget) return
    await rejectForm(rejectTarget.id, reason || "No reason provided.")
    setRejectTarget(null)
    await loadForms()
    showToast("Form rejected.")
  }

  async function handleRequestChanges(note: string) {
    if (!changesTarget) return
    await requestChanges(changesTarget.id, note || "Please review and update your form.")
    setChangesTarget(null)
    await loadForms()
    showToast("Change request sent to client.")
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl border border-gold/40 bg-surface-raised text-gold text-sm font-medium shadow-2xl">
          <Check size={15} />
          {toastMsg}
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink mb-1">Feedback Approvals</h1>
          <p className="text-sm text-ink-dim">Review, approve, or reject client feedback forms before they go live to users.</p>
        </div>
        <button onClick={loadForms} className="p-2 text-ink-muted hover:text-gold transition-colors" title="Refresh">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Forms", value: counts.all, color: "text-ink" },
          { label: "Awaiting Review", value: counts.pending, color: "text-gold" },
          { label: "Published Live", value: counts.approved, color: "text-mint" },
          { label: "Rejected", value: counts.rejected, color: "text-destructive" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
            <p className={`tvx-num text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-ink-muted mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 border-b border-white/[0.07] overflow-x-auto">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap border-b-2 -mb-px ${
              filter === tab.key
                ? "border-gold text-gold"
                : "border-transparent text-ink-dim hover:text-ink"
            }`}
          >
            {tab.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              filter === tab.key ? "bg-gold/20 text-gold" : "bg-white/[0.06] text-ink-muted"
            }`}>
              {counts[tab.key] ?? forms.length}
            </span>
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/[0.07] flex items-center justify-center mb-4">
            <Shield size={28} className="text-ink-muted" />
          </div>
          <h3 className="text-base font-semibold text-ink-dim mb-2">Nothing to review</h3>
          <p className="text-sm text-ink-muted">
            {filter === "pending"
              ? "All caught up! No pending forms right now."
              : filter === "changes"
                ? "No forms are waiting on client changes."
                : `No ${filter} forms found.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((form) => (
            <ReviewCard
              key={form.id}
              form={form}
              blockedReason={form.status === "pending" ? approvalBlockedReason(form, companiesById) : null}
              onApprove={requestApprove}
              onReject={(f: FeedbackForm) => setRejectTarget(f)}
              onRequestChanges={(f: FeedbackForm) => setChangesTarget(f)}
              onPreview={(f: FeedbackForm) => setPreviewForm(f)}
            />
          ))}
        </div>
      )}

      {/* Preview dialog */}
      <FormPreviewDialog
        form={previewForm}
        open={!!previewForm}
        onClose={() => setPreviewForm(null)}
      />

      {/* Approve confirmation (bug #8a) */}
      <ApproveConfirmDialog
        form={approveTarget}
        open={!!approveTarget}
        onClose={() => setApproveTarget(null)}
        onConfirm={handleApprove}
      />

      {/* Reject dialog */}
      <ActionDialog
        open={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        title="Reject Form"
        description={`Rejecting "${rejectTarget?.title || "this form"}". The client will be notified.`}
        placeholder="Optional: Tell the client why this form was rejected…"
        confirmLabel="Reject Form"
        confirmClass="bg-destructive/20 hover:bg-destructive/30 text-destructive border border-destructive/30"
        onConfirm={handleReject}
      />

      {/* Request Changes dialog */}
      <ActionDialog
        open={!!changesTarget}
        onClose={() => setChangesTarget(null)}
        title="Request Changes"
        description={`The form will be returned to the client as draft.`}
        placeholder="Describe what changes are needed…"
        confirmLabel="Send Request"
        confirmClass="bg-gold/20 hover:bg-gold/30 text-gold border border-gold/30"
        onConfirm={handleRequestChanges}
      />
    </div>
  )
}
