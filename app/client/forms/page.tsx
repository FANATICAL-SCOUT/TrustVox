"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Plus, FileText, BarChart2, Edit2, Trash2, Clock, CheckCircle2,
  XCircle, AlertCircle, Eye, RefreshCw, Sparkles, ChevronRight,
  MessageSquare,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  getClientForms, deleteForm, submitFormForApproval, type FeedbackForm, type FormStatus,
} from "@/lib/feedback-store"
import { getCampaignForForm } from "@/lib/client-campaigns"

type FilterKey = "all" | FormStatus

// ── Status helpers ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  draft:    { label: "Draft",    color: "text-[#a5accb]", bg: "bg-[#a5accb]/10", border: "border-[#a5accb]/30", icon: FileText },
  pending:  { label: "Pending",  color: "text-[#FBBF24]", bg: "bg-[#FBBF24]/10", border: "border-[#FBBF24]/30", icon: Clock },
  approved: { label: "Live",     color: "text-[#a78bfa]", bg: "bg-[#a78bfa]/10", border: "border-[#a78bfa]/30", icon: CheckCircle2 },
  rejected: { label: "Rejected", color: "text-[#F87171]", bg: "bg-[#F87171]/10", border: "border-[#F87171]/30", icon: XCircle },
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
  onEdit,
  onDelete,
  onSubmit,
  onAnalytics,
}: {
  form: FeedbackForm
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onSubmit: (id: string) => void
  onAnalytics: (id: string) => void
}) {
  const canEdit   = ["draft", "rejected"].includes(form.status)
  const canSubmit = form.status === "draft"
  const isLive    = form.status === "approved"
  const isPending = form.status === "pending"
  const router    = useRouter()
  const campaign = getCampaignForForm(form)

  return (
    <div className="group rounded-2xl border border-[#2b3150] bg-[#121526] p-5 hover:border-[#6c7396] transition-all duration-200 hover:shadow-lg hover:shadow-black/20">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <StatusBadge status={form.status} />
            {form.status === "rejected" && form.rejectionReason && (
              <span className="text-[10px] text-[#F87171]/70 truncate max-w-[180px]">
                "{form.rejectionReason}"
              </span>
            )}
            {form.requestChangesNote && (
              <span className="text-[10px] text-[#FBBF24]/70 truncate max-w-[180px]">
                Changes requested
              </span>
            )}
          </div>
          <h3 className="text-base font-semibold text-[#f5f7ff] truncate group-hover:text-[#8b5cf6] transition-colors">
            {form.title || "Untitled Form"}
          </h3>
          <p className="mt-1 text-[11px] text-[#a78bfa]">
            Campaign: <span className="text-[#c8b7ff]">{campaign.name}</span>
          </p>
          {form.description && (
            <p className="text-xs text-[#a5accb] mt-0.5 line-clamp-1">{form.description}</p>
          )}
        </div>
        <div className="shrink-0 flex flex-col items-end gap-1">
          <div className="w-10 h-10 rounded-xl bg-[#1a1f33] flex items-center justify-center">
            <FileText size={18} className="text-[#6c7396] group-hover:text-[#8b5cf6] transition-colors" />
          </div>
        </div>
      </div>

      {/* Meta */}
      <div className="flex items-center gap-3 text-xs text-[#6c7396] mb-4 flex-wrap">
        <span className="flex items-center gap-1">
          <MessageSquare size={11} />
          {form.responseCount} response{form.responseCount !== 1 ? "s" : ""}
        </span>
        <span>·</span>
        <span>{form.questions.length} question{form.questions.length !== 1 ? "s" : ""}</span>
        <span>·</span>
        <span>
          {form.product && <span className="text-[#a5accb]">{form.product}</span>}
        </span>
        <span>·</span>
        <span>{new Date(form.createdAt).toLocaleDateString()}</span>
      </div>

      {/* Rejection / changes note */}
      {form.requestChangesNote && (
        <div className="mb-3 p-2.5 rounded-lg bg-[#FBBF24]/5 border border-[#FBBF24]/20 text-xs text-[#FBBF24]">
          <span className="font-medium">Admin note: </span>{form.requestChangesNote}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        {isLive && (
          <Button
            size="sm"
            className="bg-[#a78bfa]/10 hover:bg-[#a78bfa]/20 text-[#a78bfa] border border-[#a78bfa]/30 gap-1.5 text-xs"
            variant="ghost"
            onClick={() => onAnalytics(form.id)}
          >
            <BarChart2 size={13} />
            Analytics
          </Button>
        )}
        {canEdit && (
          <Button
            size="sm"
            variant="ghost"
            className="text-[#a5accb] hover:text-[#8b5cf6] hover:bg-[#8b5cf6]/10 gap-1.5 text-xs border border-[#2b3150]"
            onClick={() => onEdit(form.id)}
          >
            <Edit2 size={13} />
            Edit
          </Button>
        )}
        {canSubmit && (
          <Button
            size="sm"
            className="bg-[#8b5cf6] hover:bg-[#7c3aed] text-[#090b14] font-semibold gap-1.5 text-xs ml-auto"
            onClick={() => onSubmit(form.id)}
          >
            <ChevronRight size={13} />
            Submit to Admin
          </Button>
        )}
        {isPending && (
          <span className="ml-auto text-xs text-[#FBBF24] flex items-center gap-1">
            <Clock size={12} /> Awaiting review
          </span>
        )}
        <button
          onClick={() => onDelete(form.id)}
          className="ml-auto p-1.5 rounded-lg text-[#6c7396] hover:text-[#F87171] hover:bg-[#F87171]/10 transition-colors"
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
  const [filter, setFilter] = useState<FilterKey>("all")
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  const loadForms = () => {
    setForms(getClientForms())
  }

  useEffect(() => {
    loadForms()
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

  function confirmDelete() {
    if (!deleteTarget) return
    deleteForm(deleteTarget)
    setDeleteTarget(null)
    loadForms()
    showToast("Form deleted.")
  }

  function handleSubmit(id: string) {
    const submitted = submitFormForApproval(id)
    if (!submitted) {
      showToast("Submission blocked: company is inactive or not approved.")
      return
    }
    loadForms()
    showToast("Form submitted for admin review!")
  }

  function handleAnalytics(id: string) {
    router.push(`/client/forms/${id}/analytics`)
  }

  return (
    <div className="min-h-screen app-page bg-[#090b14] relative">
      {/* Ambient */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-0 right-1/3 w-80 h-80 bg-[#8b5cf6]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-[#A78BFA]/5 rounded-full blur-3xl" />
      </div>

      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl border border-[#8b5cf6]/40 bg-[#140f24] text-[#8b5cf6] text-sm font-medium shadow-2xl">
          <CheckCircle2 size={15} />
          {toastMsg}
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 py-8 relative z-10">
        {/* Page title */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#f5f7ff] mb-1">My Feedback Forms</h1>
          <p className="text-sm text-[#a5accb]">
            Create, submit, and track your feedback forms through the approval pipeline.
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Total Forms", value: counts.all, color: "#a5accb" },
            { label: "Pending Review", value: counts.pending, color: "#FBBF24" },
            { label: "Live Forms", value: counts.approved, color: "#a78bfa" },
            { label: "Drafts", value: counts.draft, color: "#60A5FA" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-[#2b3150] bg-[#121526] p-4">
              <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
              <p className="text-xs text-[#6c7396] mt-0.5">{stat.label}</p>
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
                {counts[tab.key]}
              </span>
            </button>
          ))}
          <button
            onClick={loadForms}
            className="ml-auto p-2 text-[#6c7396] hover:text-[#8b5cf6] transition-colors"
            title="Refresh"
          >
            <RefreshCw size={14} />
          </button>
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#121526] border border-[#2b3150] flex items-center justify-center mb-4">
              <FileText size={28} className="text-[#6c7396]" />
            </div>
            <h3 className="text-base font-semibold text-[#a5accb] mb-2">No forms here</h3>
            <p className="text-sm text-[#6c7396] mb-6">
              {filter === "all"
                ? "You haven't created any feedback forms yet."
                : `No ${filter} forms.`}
            </p>
            {filter === "all" && (
              <p className="text-xs text-[#8b5cf6]">Use the Create Form tab in the top navbar to build your first form.</p>
            )}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((form) => (
              <FormCard
                key={form.id}
                form={form}
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
        <AlertDialogContent className="bg-[#121526] border-[#2b3150]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#f5f7ff]">Delete Form?</AlertDialogTitle>
            <AlertDialogDescription className="text-[#a5accb]">
              This action cannot be undone. The form and all its data will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#2b3150] text-[#a5accb] hover:text-[#f5f7ff] bg-transparent">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-[#F87171]/20 hover:bg-[#F87171]/30 text-[#F87171] border border-[#F87171]/30"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

