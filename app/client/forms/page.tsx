"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  FileText, BarChart2, Edit2, Trash2, Clock, CheckCircle2,
  XCircle, RefreshCw, ChevronRight,
  MessageSquare,
} from "lucide-react"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  getClientForms, deleteForm, submitFormForApproval, type FeedbackForm, type FormStatus,
} from "@/lib/feedback-store"
import { getCampaignForForm, listCampaigns, type ClientCampaign } from "@/lib/client-campaigns"

type FilterKey = "all" | FormStatus

// ── Status helpers ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  draft:    { label: "Draft",    color: "text-ink-muted", bg: "bg-white/[0.04]", border: "border-white/15", icon: FileText },
  pending:  { label: "Pending",  color: "text-gold",       bg: "bg-gold/10",      border: "border-gold/30", icon: Clock },
  approved: { label: "Live",     color: "text-mint",       bg: "bg-mint/10",      border: "border-mint/30", icon: CheckCircle2 },
  rejected: { label: "Rejected", color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/30", icon: XCircle },
}

const FILTER_TABS: Array<{ key: FilterKey; label: string }> = [
  { key: "all",      label: "All Forms" },
  { key: "draft",    label: "Drafts" },
  { key: "pending",  label: "Pending" },
  { key: "approved", label: "Live" },
  { key: "rejected", label: "Rejected" },
]

function StatusBadge({ status }: { status: FormStatus }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.bg} ${cfg.border} ${cfg.color}`}>
      <Icon size={10} />
      {cfg.label}
    </span>
  )
}

function FormCard({
  form,
  campaigns,
  onEdit,
  onDelete,
  onSubmit,
  onAnalytics,
}: {
  form: FeedbackForm
  campaigns: ClientCampaign[]
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onSubmit: (id: string) => void
  onAnalytics: (id: string) => void
}) {
  const canEdit   = ["draft", "rejected"].includes(form.status)
  const canSubmit = form.status === "draft"
  const isLive    = form.status === "approved"
  const isPending = form.status === "pending"
  const campaign = getCampaignForForm(form, campaigns)

  return (
    <div className="group rounded-xl border border-white/[0.07] bg-white/[0.02] p-5 transition-all duration-200 hover:border-white/20">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <StatusBadge status={form.status} />
            {form.status === "rejected" && form.rejectionReason && (
              <span className="text-[10px] text-destructive/70 truncate max-w-[180px]">
                &ldquo;{form.rejectionReason}&rdquo;
              </span>
            )}
            {form.requestChangesNote && (
              <span className="text-[10px] text-gold/70 truncate max-w-[180px]">
                Changes requested
              </span>
            )}
          </div>
          <h3 className="text-base font-semibold text-ink truncate group-hover:text-gold transition-colors">
            {form.title || "Untitled Form"}
          </h3>
          <p className="mt-1 text-[11px] text-ink-muted">
            Campaign: <span className="text-ink-dim">{campaign?.name ?? "Unassigned"}</span>
          </p>
          {form.description && (
            <p className="text-xs text-ink-dim mt-0.5 line-clamp-1">{form.description}</p>
          )}
        </div>
        <div className="shrink-0 flex flex-col items-end gap-1">
          <div className="w-10 h-10 rounded-xl bg-white/[0.03] flex items-center justify-center">
            <FileText size={18} className="text-ink-muted group-hover:text-gold transition-colors" />
          </div>
        </div>
      </div>

      {/* Meta */}
      <div className="flex items-center gap-3 text-xs text-ink-muted mb-4 flex-wrap">
        <span className="flex items-center gap-1">
          <MessageSquare size={11} />
          {form.responseCount} response{form.responseCount !== 1 ? "s" : ""}
        </span>
        <span>·</span>
        <span>{form.questions.length} question{form.questions.length !== 1 ? "s" : ""}</span>
        <span>·</span>
        <span>
          {form.product && <span className="text-ink-dim">{form.product}</span>}
        </span>
        <span>·</span>
        <span>{new Date(form.createdAt).toLocaleDateString()}</span>
      </div>

      {/* Rejection / changes note */}
      {form.requestChangesNote && (
        <div className="mb-3 p-2.5 rounded-lg bg-gold/5 border border-gold/20 text-xs text-gold">
          <span className="font-medium">Admin note: </span>{form.requestChangesNote}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        {isLive && (
          <button
            className="inline-flex items-center gap-1.5 rounded-lg border border-mint/30 bg-mint/10 px-3 py-1.5 text-xs font-medium text-mint transition hover:bg-mint/20"
            onClick={() => onAnalytics(form.id)}
          >
            <BarChart2 size={13} />
            Analytics
          </button>
        )}
        {canEdit && (
          <button
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-ink-dim transition hover:bg-gold/10 hover:text-gold"
            onClick={() => onEdit(form.id)}
          >
            <Edit2 size={13} />
            Edit
          </button>
        )}
        {canSubmit && (
          <button
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-b from-[#f2c877] to-gold-deep px-3 py-1.5 text-xs font-semibold text-[#241a06] transition hover:brightness-105"
            onClick={() => onSubmit(form.id)}
          >
            <ChevronRight size={13} />
            Submit to Admin
          </button>
        )}
        {isPending && (
          <span className="ml-auto text-xs text-gold flex items-center gap-1">
            <Clock size={12} /> Awaiting review
          </span>
        )}
        <button
          onClick={() => onDelete(form.id)}
          className="ml-auto p-1.5 rounded-lg text-ink-muted hover:text-destructive hover:bg-destructive/10 transition-colors"
          title="Delete form"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ClientFormsPage() {
  const router = useRouter()
  const [forms, setForms] = useState<FeedbackForm[]>([])
  const [campaigns, setCampaigns] = useState<ClientCampaign[]>([])
  const [filter, setFilter] = useState<FilterKey>("all")
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  const loadForms = async () => {
    setForms(await getClientForms())
  }

  useEffect(() => {
    void loadForms()
    void listCampaigns().then(setCampaigns)
  }, [])

  const showToast = (msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 2500)
  }

  const filtered = filter === "all" ? forms : forms.filter((f) => f.status === filter)

  const counts: Record<FilterKey, number> = {
    all:      forms.length,
    draft:    forms.filter((f) => f.status === "draft").length,
    pending:  forms.filter((f) => f.status === "pending").length,
    approved: forms.filter((f) => f.status === "approved").length,
    rejected: forms.filter((f) => f.status === "rejected").length,
  }

  function handleEdit(id: string) {
    router.push(`/client/create-feedback?edit=${id}`)
  }

  function handleDelete(id: string) {
    setDeleteTarget(id)
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    await deleteForm(deleteTarget)
    setDeleteTarget(null)
    await loadForms()
    showToast("Form deleted.")
  }

  async function handleSubmit(id: string) {
    const submitted = await submitFormForApproval(id)
    if (!submitted) {
      showToast("Submission blocked: company is inactive or not approved.")
      return
    }
    await loadForms()
    showToast("Form submitted for admin review!")
  }

  function handleAnalytics(id: string) {
    router.push(`/client/forms/${id}/analytics`)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl border border-gold/30 bg-surface-raised text-gold text-sm font-medium shadow-2xl">
          <CheckCircle2 size={15} />
          {toastMsg}
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 py-8 relative z-10">
        {/* Page title */}
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold text-ink mb-1">My Feedback Forms</h1>
          <p className="text-sm text-ink-dim">
            Create, submit, and track your feedback forms through the approval pipeline.
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Total Forms", value: counts.all, color: "text-ink" },
            { label: "Pending Review", value: counts.pending, color: "text-gold" },
            { label: "Live Forms", value: counts.approved, color: "text-mint" },
            { label: "Drafts", value: counts.draft, color: "text-ink-muted" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
              <p className={`tvx-num text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-ink-muted mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1 mb-6 border-b border-white/[0.07] overflow-x-auto">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap border-b-2 -mb-px ${
                filter === tab.key
                  ? "border-gold text-gold"
                  : "border-transparent text-ink-muted hover:text-ink-dim"
              }`}
            >
              {tab.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                filter === tab.key ? "bg-gold/20 text-gold" : "bg-white/[0.06] text-ink-muted"
              }`}>
                {counts[tab.key]}
              </span>
            </button>
          ))}
          <button
            onClick={loadForms}
            className="ml-auto p-2 text-ink-muted hover:text-gold transition-colors"
            title="Refresh"
          >
            <RefreshCw size={14} />
          </button>
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/[0.07] flex items-center justify-center mb-4">
              <FileText size={28} className="text-ink-muted" />
            </div>
            <h3 className="text-base font-semibold text-ink-dim mb-2">No forms here</h3>
            <p className="text-sm text-ink-muted mb-6">
              {filter === "all"
                ? "You haven't created any feedback forms yet."
                : `No ${filter} forms.`}
            </p>
            {filter === "all" && (
              <p className="text-xs text-gold">Use the Create Form tab in the top navbar to build your first form.</p>
            )}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((form) => (
              <FormCard
                key={form.id}
                form={form}
                campaigns={campaigns}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onSubmit={handleSubmit}
                onAnalytics={handleAnalytics}
              />
            ))}
          </div>
        )}
      </main>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-surface-raised border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-ink">Delete Form?</AlertDialogTitle>
            <AlertDialogDescription className="text-ink-dim">
              This action cannot be undone. The form and all its data will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/15 text-ink-dim hover:text-ink bg-transparent">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive/15 hover:bg-destructive/25 text-destructive border border-destructive/30"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
