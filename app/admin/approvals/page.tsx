"use client"

import { useState, useEffect } from "react"
import {
  CheckCircle2, XCircle, MessageSquare, Clock, Eye,
  Shield, RefreshCw, Star, Type, AlignLeft, List, CheckSquare,
  Tag, Mic, ChevronDown, ChevronUp, Users, FileText, Sparkles,
  AlertTriangle, Check,
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

type ApprovalFilterKey = "all" | "pending" | "approved" | "rejected"

// ── Helpers ───────────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  draft:    { label: "Draft",    color: "text-[#a5accb]", bg: "bg-[#a5accb]/10", border: "border-[#a5accb]/30" },
  pending:  { label: "Pending",  color: "text-[#FBBF24]", bg: "bg-[#FBBF24]/10", border: "border-[#FBBF24]/30" },
  approved: { label: "Live",     color: "text-[#a78bfa]", bg: "bg-[#a78bfa]/10", border: "border-[#a78bfa]/30" },
  rejected: { label: "Rejected", color: "text-[#F87171]", bg: "bg-[#F87171]/10", border: "border-[#F87171]/30" },
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
      <DialogContent className="bg-[#121526] border-[#2b3150] max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#f5f7ff] flex items-center gap-2">
            <Eye size={18} className="text-[#8b5cf6]" />
            Form Preview
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-[#14182a] border border-[#2b3150]">
            <h3 className="text-base font-semibold text-[#f5f7ff]">{form.title}</h3>
            {form.description && (
              <p className="text-sm text-[#a5accb] mt-1">{form.description}</p>
            )}
            <div className="flex gap-2 mt-3 flex-wrap">
              <Badge variant="outline" className="border-[#8b5cf6]/30 text-[#8b5cf6] text-xs">
                {form.product}
              </Badge>
              <Badge variant="outline" className="border-[#2b3150] text-[#a5accb] text-xs">
                {form.category}
              </Badge>
            </div>
          </div>

          {form.questions.map((q: Question, i: number) => {
            const Icon = QT_ICONS[q.type] || FileText
            return (
              <div key={q.id} className="p-4 rounded-xl bg-[#14182a] border border-[#2b3150]">
                <div className="flex items-start gap-2 mb-2">
                  <span className="text-xs text-[#6c7396] shrink-0 mt-0.5">Q{i + 1}</span>
                  <div className="flex-1">
                    <p className="text-sm text-[#d7ddf5] font-medium">
                      {q.title}
                      {q.required && <span className="text-[#F87171] ml-1 text-xs">*</span>}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <Icon size={11} className="text-[#6c7396]" />
                      <span className="text-[10px] text-[#6c7396]">{QT_LABELS[q.type]}</span>
                    </div>
                    {q.options.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {q.options.map((opt: string) => (
                          <span key={opt} className="px-2 py-0.5 rounded bg-[#1a1f33] text-xs text-[#a5accb] border border-[#2b3150]">
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
          <Button variant="ghost" onClick={onClose} className="text-[#a5accb] hover:text-[#f5f7ff]">
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
      <DialogContent className="bg-[#121526] border-[#2b3150] max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#f5f7ff]">{title}</DialogTitle>
        </DialogHeader>
        <div>
          <p className="text-sm text-[#a5accb] mb-3">{description}</p>
          <Label className="text-xs text-[#a5accb] mb-1.5 block">Note (optional)</Label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={placeholder}
            className="bg-[#1a1f33] border-[#2b3150] text-[#f5f7ff] placeholder:text-[#6c7396] min-h-[80px] resize-none"
          />
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => { setReason(""); onClose() }} className="text-[#a5accb]">
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

// ── Review Card ───────────────────────────────────────────────────────────────
function ReviewCard({
  form,
  onApprove,
  onReject,
  onRequestChanges,
  onPreview,
}: {
  form: FeedbackForm
  onApprove: (id: string) => void
  onReject: (form: FeedbackForm) => void
  onRequestChanges: (form: FeedbackForm) => void
  onPreview: (form: FeedbackForm) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const isPending = form.status === "pending"

  return (
    <div className={`rounded-2xl border bg-[#121526] overflow-hidden transition-all duration-200 ${
      isPending ? "border-[#FBBF24]/30 shadow-[0_0_20px_#FBBF2408]" : "border-[#2b3150]"
    }`}>
      {/* Card header */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <StatusBadge status={form.status} />
              <span className="text-xs text-[#6c7396]">
                by <span className="text-[#a5accb]">{form.clientName}</span>
              </span>
            </div>
            <h3 className="text-base font-semibold text-[#f5f7ff] truncate">{form.title}</h3>
            {form.description && (
              <p className="text-xs text-[#a5accb] mt-0.5 line-clamp-1">{form.description}</p>
            )}
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="text-[#a5accb] hover:text-[#8b5cf6] gap-1 shrink-0 text-xs border border-[#2b3150] hover:border-[#8b5cf6]/40"
            onClick={() => onPreview(form)}
          >
            <Eye size={13} />
            Preview
          </Button>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-3 mt-3 text-xs text-[#6c7396] flex-wrap">
          <span>{form.questions.length} question{form.questions.length !== 1 ? "s" : ""}</span>
          <span>·</span>
          <span className="text-[#a5accb]">{form.product}</span>
          <span>·</span>
          <span className="text-[#a5accb]">{form.category}</span>
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
          className="mt-3 flex items-center gap-1 text-xs text-[#6c7396] hover:text-[#a5accb] transition-colors"
        >
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {expanded ? "Hide" : "Show"} questions
        </button>

        {expanded && (
          <div className="mt-3 space-y-2">
            {form.questions.map((q: Question, i: number) => {
              const Icon = QT_ICONS[q.type] || FileText
              return (
                <div key={q.id} className="flex items-center gap-2 p-2.5 rounded-lg bg-[#14182a] border border-[#2b3150]">
                  <span className="text-[10px] text-[#6c7396] w-4 shrink-0">Q{i + 1}</span>
                  <Icon size={12} className="text-[#8b5cf6] shrink-0" />
                  <span className="text-xs text-[#d7ddf5] flex-1 truncate">{q.title || "Untitled"}</span>
                  {q.required && <span className="text-[10px] text-[#F87171]">Required</span>}
                </div>
              )
            })}
          </div>
        )}

        {/* Rejection / changes message */}
        {form.rejectionReason && (
          <div className="mt-3 p-2.5 rounded-lg bg-[#F87171]/5 border border-[#F87171]/20 text-xs text-[#F87171]">
            <span className="font-medium">Rejection reason: </span>{form.rejectionReason}
          </div>
        )}
        {form.requestChangesNote && (
          <div className="mt-3 p-2.5 rounded-lg bg-[#FBBF24]/5 border border-[#FBBF24]/20 text-xs text-[#FBBF24]">
            <span className="font-medium">Changes requested: </span>{form.requestChangesNote}
          </div>
        )}
      </div>

      {/* Action bar — only for pending */}
      {isPending && (
        <div className="px-5 py-4 border-t border-[#2b3150] bg-[#090b14]/40 flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            className="bg-[#a78bfa] hover:bg-[#7c3aed] text-[#090b14] font-semibold gap-1.5 text-xs"
            onClick={() => onApprove(form.id)}
          >
            <CheckCircle2 size={14} />
            Approve & Publish
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-[#FBBF24] hover:text-[#FBBF24] hover:bg-[#FBBF24]/10 border border-[#FBBF24]/30 gap-1.5 text-xs"
            onClick={() => onRequestChanges(form)}
          >
            <MessageSquare size={14} />
            Request Changes
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-[#F87171] hover:text-[#F87171] hover:bg-[#F87171]/10 border border-[#F87171]/30 gap-1.5 text-xs ml-auto"
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
  const [filter, setFilter] = useState<ApprovalFilterKey>("pending")
  const [previewForm, setPreviewForm] = useState<FeedbackForm | null>(null)
  const [rejectTarget, setRejectTarget] = useState<FeedbackForm | null>(null)
  const [changesTarget, setChangesTarget] = useState<FeedbackForm | null>(null)
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  const loadForms = () => {
    const allForms = getForms()
    console.debug("[TrustVoxFlow] admin-page-load-forms", {
      total: allForms.length,
      pending: allForms.filter((f) => f.status === "pending").length,
      approved: allForms.filter((f) => f.status === "approved").length,
    })
    setForms(allForms)
  }

  useEffect(() => {
    loadForms()
    const unsubscribe = subscribeToFormsUpdates(loadForms)
    return () => unsubscribe()
  }, [])

  const showToast = (msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 3000)
  }

  const filtered = filter === "all" ? forms : forms.filter((f) => f.status === filter)

  const counts: Record<ApprovalFilterKey, number> = {
    all:      forms.length,
    pending:  forms.filter((f) => f.status === "pending").length,
    approved: forms.filter((f) => f.status === "approved").length,
    rejected: forms.filter((f) => f.status === "rejected").length,
  }

  function handleApprove(id: string) {
    const updated = approveForm(id)
    console.debug("[TrustVoxFlow] admin-approve-click", {
      formId: id,
      statusAfter: updated?.status,
    })
    if (!updated) {
      showToast("Approval blocked: company is inactive or not approved.")
      return
    }
    loadForms()
    showToast("Form approved and published!")
  }

  function handleReject(reason: string) {
    if (!rejectTarget) return
    rejectForm(rejectTarget.id, reason || "No reason provided.")
    setRejectTarget(null)
    loadForms()
    showToast("Form rejected.")
  }

  function handleRequestChanges(note: string) {
    if (!changesTarget) return
    requestChanges(changesTarget.id, note || "Please review and update your form.")
    setChangesTarget(null)
    loadForms()
    showToast("Change request sent to client.")
  }

  return (
    <div className="min-h-screen app-page bg-[#090b14] relative">
      {/* Ambient */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-80 bg-[#A78BFA]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-[#8b5cf6]/5 rounded-full blur-3xl" />
      </div>

      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl border border-[#8b5cf6]/40 bg-[#140f24] text-[#8b5cf6] text-sm font-medium shadow-2xl">
          <Check size={15} />
          {toastMsg}
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 py-8 relative z-10">
        <div className="mb-8 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#f5f7ff] mb-1">Feedback Approvals</h1>
            <p className="text-sm text-[#a5accb]">Review, approve, or reject client feedback forms before they go live to users.</p>
          </div>
          <button onClick={loadForms} className="p-2 text-[#6c7396] hover:text-[#8b5cf6] transition-colors" title="Refresh">
            <RefreshCw size={16} />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Total Forms", value: counts.all, color: "#a5accb" },
            { label: "Awaiting Review", value: counts.pending, color: "#FBBF24", pulse: counts.pending > 0 },
            { label: "Published Live", value: counts.approved, color: "#a78bfa" },
            { label: "Rejected", value: counts.rejected, color: "#F87171" },
          ].map((s) => (
            <div
              key={s.label}
              className={`rounded-xl border border-[#2b3150] bg-[#121526] p-4 ${
                s.pulse ? "border-[#FBBF24]/30 shadow-[0_0_20px_#FBBF2408]" : ""
              }`}
            >
              <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs text-[#6c7396] mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1 mb-6 border-b border-[#2b3150] overflow-x-auto">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap border-b-2 -mb-px ${
                filter === tab.key
                  ? "border-[#8b5cf6] text-[#8b5cf6]"
                  : "border-transparent text-[#a5accb] hover:text-[#d7ddf5]"
              }`}
            >
              {tab.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                filter === tab.key ? "bg-[#8b5cf6]/20 text-[#8b5cf6]" : "bg-[#1a1f33] text-[#6c7396]"
              }`}>
                {counts[tab.key] ?? forms.length}
              </span>
            </button>
          ))}
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#121526] border border-[#2b3150] flex items-center justify-center mb-4">
              <Shield size={28} className="text-[#6c7396]" />
            </div>
            <h3 className="text-base font-semibold text-[#a5accb] mb-2">Nothing to review</h3>
            <p className="text-sm text-[#6c7396]">
              {filter === "pending"
                ? "All caught up! No pending forms right now."
                : `No ${filter} forms found.`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((form) => (
              <ReviewCard
                key={form.id}
                form={form}
                onApprove={handleApprove}
                onReject={(f: FeedbackForm) => setRejectTarget(f)}
                onRequestChanges={(f: FeedbackForm) => setChangesTarget(f)}
                onPreview={(f: FeedbackForm) => setPreviewForm(f)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Preview dialog */}
      <FormPreviewDialog
        form={previewForm}
        open={!!previewForm}
        onClose={() => setPreviewForm(null)}
      />

      {/* Reject dialog */}
      <ActionDialog
        open={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        title="Reject Form"
        description={`Rejecting "${rejectTarget?.title || "this form"}". The client will be notified.`}
        placeholder="Optional: Tell the client why this form was rejected…"
        confirmLabel="Reject Form"
        confirmClass="bg-[#F87171]/20 hover:bg-[#F87171]/30 text-[#F87171] border border-[#F87171]/30"
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
        confirmClass="bg-[#FBBF24]/20 hover:bg-[#FBBF24]/30 text-[#FBBF24] border border-[#FBBF24]/30"
        onConfirm={handleRequestChanges}
      />
    </div>
  )
}

