"use client"

import { Suspense, useState, useEffect, useCallback, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Plus, Trash2, ChevronUp, ChevronDown, Eye, Save, Send,
  Star, Type, AlignLeft, List, CheckSquare, Mic,
  GripVertical, X, Check, AlertCircle, Settings, Search,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  createForm, updateForm, submitFormForApproval,
  getFormById, newQuestionId,
  type Question, type QuestionType, type FormVisibility,
} from "@/lib/feedback-store"
import { logFlow } from "@/lib/debug-log"
import { getActiveApprovedCompanies, subscribeToApprovedCompanies, type ApprovedCompany } from "@/lib/approved-company-store"

type ToastState = { msg: string; type: "success" | "error" }

// Upper bound on the per-response TVX reward. Mirrors the DB `reward_tokens
// between 1 and 1000` CHECK (migration 0008) so the form can't submit a value
// the insert would reject — part of the 8.8 self-mint remediation.
const MAX_REWARD_TOKENS = 1000

const QUESTION_TYPES = [
  { value: "star-rating",      label: "Star Rating",       icon: Star },
  { value: "text-short",       label: "Short Text",        icon: Type },
  { value: "text-long",        label: "Long Text",         icon: AlignLeft },
  { value: "multiple-choice",  label: "Multiple Choice",   icon: List },
  { value: "multi-select",     label: "Multi-Select",      icon: CheckSquare },
  { value: "voice-feedback",   label: "Voice Feedback",    icon: Mic },
]

const CATEGORIES = [
  "Software", "Service", "Mobile App", "Hardware", "E-Commerce",
  "Food & Beverage", "Healthcare", "Education", "Finance", "Other",
]

function QuestionTypeIcon({ type, size = 16 }: { type: QuestionType; size?: number }) {
  const qt = QUESTION_TYPES.find((q) => q.value === type)
  if (!qt) return null
  const Icon = qt.icon
  return <Icon size={size} />
}

function StarPreview({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          onMouseEnter={() => setHover(s)}
          onMouseLeave={() => setHover(0)}
          className="focus:outline-none"
        >
          <Star
            size={24}
            className={
              s <= (hover || value)
                ? "fill-gold text-gold"
                : "text-ink-muted"
            }
          />
        </button>
      ))}
    </div>
  )
}

type PreviewAnswerValue = string | number | string[]
type PreviewAnswers = Record<string, PreviewAnswerValue>

// Render a single question in preview mode
function PreviewQuestion({
  question,
  answers,
  onAnswer,
}: {
  question: Question
  answers: PreviewAnswers
  onAnswer: (id: string, value: PreviewAnswerValue) => void
}) {
  const ans = answers[question.id]

  if (question.type === "star-rating") {
    return (
      <div>
        <p className="text-sm text-ink-dim mb-2">
          {question.title}
          {question.required && <span className="text-destructive ml-1">*</span>}
        </p>
        <StarPreview value={typeof ans === "number" ? ans : 0} onChange={(v) => onAnswer(question.id, v)} />
      </div>
    )
  }
  if (question.type === "text-short") {
    return (
      <div>
        <p className="text-sm text-ink-dim mb-2">
          {question.title}
          {question.required && <span className="text-destructive ml-1">*</span>}
        </p>
        <Input
          value={ans || ""}
          onChange={(e) => onAnswer(question.id, e.target.value)}
          placeholder="Short answer…"
          className="bg-white/[0.03] border-white/10 text-ink"
        />
      </div>
    )
  }
  if (question.type === "text-long") {
    return (
      <div>
        <p className="text-sm text-ink-dim mb-2">
          {question.title}
          {question.required && <span className="text-destructive ml-1">*</span>}
        </p>
        <Textarea
          value={ans || ""}
          onChange={(e) => onAnswer(question.id, e.target.value)}
          placeholder="Long answer…"
          className="bg-white/[0.03] border-white/10 text-ink min-h-[90px]"
        />
      </div>
    )
  }
  if (question.type === "multiple-choice") {
    return (
      <div>
        <p className="text-sm text-ink-dim mb-2">
          {question.title}
          {question.required && <span className="text-destructive ml-1">*</span>}
        </p>
        <div className="flex flex-col gap-2">
          {question.options.map((opt) => (
            <label key={opt} className="flex items-center gap-2 cursor-pointer group">
              <div
                onClick={() => onAnswer(question.id, opt)}
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors cursor-pointer ${
                  ans === opt
                    ? "border-gold bg-gold"
                    : "border-white/20 group-hover:border-gold/60"
                }`}
              >
                {ans === opt && <div className="w-1.5 h-1.5 bg-background rounded-full" />}
              </div>
              <span className="text-sm text-ink-dim">{opt}</span>
            </label>
          ))}
        </div>
      </div>
    )
  }
  if (question.type === "multi-select") {
    const selected = Array.isArray(ans) ? ans : []
    return (
      <div>
        <p className="text-sm text-ink-dim mb-2">
          {question.title}
          {question.required && <span className="text-destructive ml-1">*</span>}
        </p>
        <div className="flex flex-col gap-2">
          {question.options.map((opt) => {
            const checked = selected.includes(opt)
            return (
              <label key={opt} className="flex items-center gap-2 cursor-pointer group">
                <div
                  onClick={() =>
                    onAnswer(
                      question.id,
                      checked ? selected.filter((s) => s !== opt) : [...selected, opt]
                    )
                  }
                  className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors cursor-pointer ${
                    checked
                      ? "border-gold bg-gold"
                      : "border-white/20 group-hover:border-gold/60"
                  }`}
                >
                  {checked && <Check size={10} className="text-background" />}
                </div>
                <span className="text-sm text-ink-dim">{opt}</span>
              </label>
            )
          })}
        </div>
      </div>
    )
  }
  if (question.type === "voice-feedback") {
    return (
      <div>
        <p className="text-sm text-ink-dim mb-2">
          {question.title}
          {question.required && <span className="text-destructive ml-1">*</span>}
        </p>
        <div className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/10">
          <Mic size={18} className="text-gold" />
          <span className="text-sm text-ink-dim">Voice input enabled</span>
          <Badge variant="outline" className="ml-auto border-gold/40 text-gold text-xs">
            Mic
          </Badge>
        </div>
      </div>
    )
  }
  return null
}

// Shared input styling so every control on the page has the same height,
// contrast and radius — the "congested / inconsistent" complaint was largely
// controls that varied in size. One token, applied everywhere.
const FIELD_CLASS =
  "h-11 bg-white/[0.03] border-white/10 text-ink placeholder:text-ink-muted focus-visible:border-gold/50 focus-visible:ring-gold/20"

// A numbered step heading used for each top-level section, so the form reads
// as a guided flow rather than a wall of cards.
function StepHeading({ n, title, hint, right }: { n: number; title: string; hint?: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-gold/12 border border-gold/25 flex items-center justify-center text-gold text-sm font-semibold shrink-0">
          {n}
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-ink leading-tight">{title}</h2>
          {hint && <p className="text-xs text-ink-muted mt-0.5">{hint}</p>}
        </div>
      </div>
      {right}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
function CreateFeedbackInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get("edit")

  // Form basic state
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [companyId, setCompanyId] = useState("")
  const [product, setProduct] = useState("")
  const [category, setCategory] = useState("")
  const [otherCategoryDetails, setOtherCategoryDetails] = useState("")
  const [rewardTokens, setRewardTokens] = useState("24")
  const [questions, setQuestions] = useState<Question[]>([])
  const [formId, setFormId] = useState<string | null>(null)
  const [approvedCompanies, setApprovedCompanies] = useState<ApprovedCompany[]>([])
  const [companyPickerOpen, setCompanyPickerOpen] = useState(false)
  const [companyQuery, setCompanyQuery] = useState("")

  // UI state
  const [previewMode, setPreviewMode] = useState(false)
  const [formVisibility, setFormVisibility] = useState<FormVisibility>("private")
  const [responseLimit, setResponseLimit] = useState("")
  const [allowAnonymous, setAllowAnonymous] = useState(true)
  const [enableRatings, setEnableRatings] = useState(true)
  const [autoCloseDate, setAutoCloseDate] = useState("")
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewAnswers, setPreviewAnswers] = useState<PreviewAnswers>({})
  const [savingState, setSavingState] = useState("idle") // idle | saving | saved | error
  const [submitState, setSubmitState] = useState("idle")
  const [toast, setToast] = useState<ToastState | null>(null)
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null)
  const [draggingQuestionId, setDraggingQuestionId] = useState<string | null>(null)
  const [dragOverQuestionId, setDragOverQuestionId] = useState<string | null>(null)

  // Load form for editing
  useEffect(() => {
    if (!editId) return
    let active = true
    void (async () => {
      const form = await getFormById(editId)
      if (!active || !form) return
      const activeCompanies = await getActiveApprovedCompanies()
      if (!active) return
      const matchedCompany = activeCompanies.find((company) => company.id === form.companyId || company.name.toLowerCase() === (form.clientName || "").toLowerCase())
      setFormId(form.id)
      setTitle(form.title)
      setDescription(form.description)
      setCompanyId(matchedCompany?.id || "")
      setProduct(form.product)
      setCategory(form.category)
      setOtherCategoryDetails(form.categoryDetails || "")
      setRewardTokens(String(form.rewardTokens || 24))
      setFormVisibility(form.formVisibility || "private")
      setResponseLimit(form.responseLimit ? String(form.responseLimit) : "")
      setAllowAnonymous(typeof form.allowAnonymous === "boolean" ? form.allowAnonymous : true)
      setEnableRatings(typeof form.enableRatings === "boolean" ? form.enableRatings : true)
      setAutoCloseDate(form.autoCloseDate || "")
      setQuestions(form.questions)
    })()
    return () => {
      active = false
    }
  }, [editId])

  useEffect(() => {
    const loadCompanies = () => void getActiveApprovedCompanies().then(setApprovedCompanies)

    loadCompanies()
    const unsubscribe = subscribeToApprovedCompanies(loadCompanies)
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (!companyId && approvedCompanies.length > 0) {
      setCompanyId(approvedCompanies[0].id)
      return
    }
    if (companyId && !approvedCompanies.some((company) => company.id === companyId)) {
      setCompanyId(approvedCompanies[0]?.id || "")
    }
  }, [approvedCompanies, companyId])

  const selectedCompany = approvedCompanies.find((company) => company.id === companyId)
  const filteredCompanies = approvedCompanies.filter((company) => {
    const q = companyQuery.trim().toLowerCase()
    if (!q) return true
    const name = company.name.toLowerCase()
    const companyCategory = company.category.toLowerCase()
    return (
      name.startsWith(q) ||
      companyCategory.startsWith(q) ||
      name.includes(q) ||
      companyCategory.includes(q)
    )
  })

  // Group the (filtered) companies by category so the ~90-company list opens as
  // 9 scannable clusters instead of one long flat scroll. Category order follows
  // first-seen order in the already name-sorted source list.
  const companyGroups = useMemo(() => {
    const groups = new Map<string, ApprovedCompany[]>()
    for (const company of filteredCompanies) {
      const bucket = groups.get(company.category)
      if (bucket) bucket.push(company)
      else groups.set(company.category, [company])
    }
    return Array.from(groups, ([groupCategory, items]) => ({ category: groupCategory, items }))
  }, [filteredCompanies])

  const showToast = useCallback((msg: string, type: ToastState["type"] = "success") => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  function handleSelectCompany(companyIdToSelect: string) {
    const nextId = String(companyIdToSelect || "").trim()
    if (!nextId) return

    const matched = approvedCompanies.find((company) => company.id === nextId)
    if (!matched) return

    setCompanyId(matched.id)
    setCompanyPickerOpen(false)
    setCompanyQuery("")
  }

  // ── Question helpers ────────────────────────────────────────────────────────
  function addQuestion() {
    const newQ: Question = {
      id: newQuestionId(),
      type: "text-short",
      title: "",
      required: false,
      options: [],
    }
    setQuestions((prev) => [...prev, newQ])
    setExpandedQuestion(newQ.id)
  }

  function updateQuestion(id: string, patch: Partial<Question>) {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, ...patch } : q))
    )
  }

  function removeQuestion(id: string) {
    setQuestions((prev) => prev.filter((q) => q.id !== id))
    if (expandedQuestion === id) setExpandedQuestion(null)
  }

  function moveQuestion(id: string, dir: number) {
    setQuestions((prev) => {
      const idx = prev.findIndex((q) => q.id === id)
      if (idx === -1) return prev
      const next = [...prev]
      const target = idx + dir
      if (target < 0 || target >= next.length) return prev
      ;[next[idx], next[target]] = [next[target], next[idx]]
      return next
    })
  }

  function moveQuestionToPosition(sourceId: string | null, targetId: string) {
    if (!sourceId || !targetId || sourceId === targetId) return
    setQuestions((prev) => {
      const sourceIndex = prev.findIndex((q) => q.id === sourceId)
      const targetIndex = prev.findIndex((q) => q.id === targetId)
      if (sourceIndex === -1 || targetIndex === -1) return prev
      const next = [...prev]
      const [moved] = next.splice(sourceIndex, 1)
      next.splice(targetIndex, 0, moved)
      return next
    })
  }

  function addOption(qid: string) {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === qid ? { ...q, options: [...q.options, `Option ${q.options.length + 1}`] } : q
      )
    )
  }

  function updateOption(qid: string, idx: number, val: string) {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== qid) return q
        const opts = [...q.options]
        opts[idx] = val
        return { ...q, options: opts }
      })
    )
  }

  function removeOption(qid: string, idx: number) {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== qid) return q
        return { ...q, options: q.options.filter((_, i) => i !== idx) }
      })
    )
  }

  // ── Save / Submit ───────────────────────────────────────────────────────────
  function buildPayload() {
    const normalizedRewardTokens = Math.min(MAX_REWARD_TOKENS, Math.max(1, Math.floor(Number(rewardTokens) || 0)))
    const parsedResponseLimit = Number(responseLimit)
    const normalizedResponseLimit = Number.isFinite(parsedResponseLimit) && parsedResponseLimit > 0
      ? Math.floor(parsedResponseLimit)
      : undefined

    return {
      title,
      description,
      companyId,
      clientName: selectedCompany?.name || "",
      product,
      category,
      categoryDetails: otherCategoryDetails || undefined,
      rewardTokens: normalizedRewardTokens,
      formVisibility,
      responseLimit: normalizedResponseLimit,
      allowAnonymous,
      enableRatings,
      autoCloseDate: autoCloseDate || undefined,
      questions,
    }
  }

  function validateBasics() {
    if (!title.trim()) return "Form title is required."
    if (!companyId) return "Select an approved company."
    if (!selectedCompany) return "Selected company is not active/approved."
    if (!product.trim()) return "Product / Service name is required."
    if (!category) return "Please select a category."
    const parsedRewardTokens = Number(rewardTokens)
    if (!Number.isFinite(parsedRewardTokens) || parsedRewardTokens < 1) {
      return "Reward tokens must be a number greater than or equal to 1."
    }
    if (parsedRewardTokens > MAX_REWARD_TOKENS) {
      return `Reward tokens can be at most ${MAX_REWARD_TOKENS}.`
    }
    if (responseLimit.trim()) {
      const parsedLimit = Number(responseLimit)
      if (!Number.isFinite(parsedLimit) || parsedLimit < 1) {
        return "Response limit must be a number greater than or equal to 1."
      }
    }
    if (autoCloseDate) {
      const closeAt = Date.parse(autoCloseDate)
      if (Number.isNaN(closeAt)) {
        return "Auto close date is invalid."
      }
    }
    if (category === "Other" && !otherCategoryDetails.trim()) {
      return "Please add a short product/service description for Other category."
    }
    if (questions.length === 0) return "Add at least one question."
    for (const q of questions) {
      if (!q.title.trim()) return "All questions must have a title."
      if (
        ["multiple-choice", "multi-select"].includes(q.type) &&
        q.options.length < 2
      ) {
        return `Question "${q.title || q.id}" needs at least 2 options.`
      }
    }
    return null
  }

  async function handleSaveDraft() {
    const err = validateBasics()
    if (err) { showToast(err, "error"); return }
    setSavingState("saving")
    const payload = buildPayload()
    try {
      if (formId) {
        await updateForm(formId, payload)
      } else {
        const created = await createForm({ ...payload, status: "draft" })
        setFormId(created.id)
      }
    } catch {
      setSavingState("idle")
      showToast("Could not save draft. Please try again.", "error")
      return
    }
    await new Promise((r) => setTimeout(r, 600))
    setSavingState("saved")
    showToast("Draft saved successfully!")
    setTimeout(() => setSavingState("idle"), 2000)
  }

  async function handleSubmitToAdmin() {
    const err = validateBasics()
    if (err) { showToast(err, "error"); return }
    setSubmitState("loading")
    const payload = buildPayload()
    let id = formId
    try {
      if (!id) {
        const created = await createForm({ ...payload, status: "draft" })
        id = created.id
        setFormId(id)
      } else {
        await updateForm(id, payload)
      }
    } catch {
      setSubmitState("idle")
      showToast("Could not save the form. Please try again.", "error")
      return
    }
    await new Promise((r) => setTimeout(r, 800))
    const submitted = await submitFormForApproval(id)
    if (!submitted) {
      setSubmitState("idle")
      showToast("Submission blocked: selected company is not active/approved.", "error")
      return
    }
    logFlow("client-submit-to-admin", {
      formId: id,
      statusAfter: submitted?.status,
      questionCount: questions.length,
    })
    setSubmitState("done")
    showToast("Form submitted for admin review!")
    setTimeout(() => {
      router.push("/client/forms")
    }, 1500)
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  const hasOptionsType = (t: QuestionType) =>
    ["multiple-choice", "multi-select"].includes(t)

  return (
    <div className="min-h-screen app-page bg-background relative">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium shadow-2xl transition-all ${
            toast.type === "error"
              ? "bg-surface-raised border-destructive/30 text-destructive"
              : "bg-surface-raised border-gold/30 text-gold"
          }`}
        >
          {toast.type === "error" ? (
            <AlertCircle size={16} />
          ) : (
            <Check size={16} />
          )}
          {toast.msg}
        </div>
      )}

      {/* Sticky Top Bar */}
      <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          {/* Left: Title + Mode */}
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-sm font-semibold text-ink hidden sm:inline">
              {editId ? "Editing Form" : "Create Feedback Form"}
            </span>
            <span className="text-sm font-semibold text-ink sm:hidden">
              {editId ? "Edit Form" : "New Form"}
            </span>
            <Badge variant="outline" className="border-white/15 text-ink-muted text-xs px-2 py-1 hidden sm:inline-flex">
              {previewMode ? "Preview" : "Edit"}
            </Badge>
          </div>

          {/* Center: Mode Toggle */}
          <div className="flex items-center gap-1 bg-white/[0.04] rounded-lg p-1 border border-white/10">
            <button
              onClick={() => setPreviewMode(false)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                !previewMode
                  ? "bg-gold/12 text-gold"
                  : "text-ink-muted hover:text-ink-dim"
              }`}
            >
              <span className="hidden sm:inline">Edit Mode</span>
              <span className="sm:hidden">Edit</span>
            </button>
            <button
              onClick={() => { setPreviewAnswers({}); setPreviewMode(true) }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                previewMode
                  ? "bg-gold/12 text-gold"
                  : "text-ink-muted hover:text-ink-dim"
              }`}
            >
              <span className="hidden sm:inline">Preview Form</span>
              <span className="sm:hidden">Preview</span>
            </button>
          </div>

          {/* Right: Action Buttons */}
          {!previewMode && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="border-white/10 text-ink-dim hover:text-gold hover:border-gold/40 text-xs gap-1"
                onClick={handleSaveDraft}
                disabled={savingState === "saving"}
              >
                <Save size={14} />
                <span className="hidden sm:inline">{savingState === "saving" ? "Saving…" : savingState === "saved" ? "Saved ✓" : "Save Draft"}</span>
                <span className="sm:hidden">{savingState === "saving" ? "…" : savingState === "saved" ? "✓" : "Save"}</span>
              </Button>
              <Button
                size="sm"
                className="bg-gradient-to-b from-[#f2c877] to-gold-deep text-[#241a06] font-semibold hover:brightness-105 text-xs gap-1"
                onClick={handleSubmitToAdmin}
                disabled={submitState !== "idle"}
              >
                <Send size={14} />
                <span className="hidden sm:inline">{submitState === "loading" ? "Submitting…" : submitState === "done" ? "Submitted ✓" : "Submit"}</span>
                <span className="sm:hidden">{submitState === "loading" ? "…" : submitState === "done" ? "✓" : "Send"}</span>
              </Button>
            </div>
          )}
          {previewMode && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="border-white/10 text-ink-dim hover:text-gold text-xs gap-1"
                onClick={() => setPreviewMode(false)}
              >
                <span className="hidden sm:inline">Back to Edit</span>
                <span className="sm:hidden">Edit</span>
              </Button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10 relative z-10">
        {!previewMode ? (
        <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-7">
          {/* ── Left column: Form Builder ── */}
          <div className="min-w-0 space-y-6">
            {/* Basic details */}
            <section className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 sm:p-7">
              <StepHeading n={1} title="Form Details" hint="Name the form and tell us who it's for." />
              <div className="space-y-5">
                <div>
                  <Label className="text-xs text-ink-dim mb-1.5 block">Form Title <span className="text-destructive">*</span></Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Product Experience Survey"
                    className={FIELD_CLASS}
                  />
                </div>
                <div>
                  <Label className="text-xs text-ink-dim mb-1.5 block">Description</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of what this form collects…"
                    className="bg-white/[0.03] border-white/10 text-ink placeholder:text-ink-muted focus-visible:border-gold/50 focus-visible:ring-gold/20 min-h-[80px] resize-none"
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-ink-dim mb-1.5 block">Company Name <span className="text-destructive">*</span></Label>
                    <Popover
                      open={companyPickerOpen}
                      onOpenChange={(open) => {
                        setCompanyPickerOpen(open)
                        if (!open) setCompanyQuery("")
                      }}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          role="combobox"
                          aria-expanded={companyPickerOpen}
                          className="w-full h-11 justify-between bg-white/[0.03] border-white/10 text-ink hover:bg-white/[0.06] hover:text-ink hover:border-gold/40"
                        >
                          <span className="truncate text-left">
                            {selectedCompany ? `${selectedCompany.name} • ${selectedCompany.category}` : "Select approved company"}
                          </span>
                          <ChevronDown size={16} className="text-ink-muted shrink-0" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        align="start"
                        side="bottom"
                        sideOffset={6}
                        avoidCollisions={false}
                        className="w-[--radix-popover-trigger-width] p-0 bg-surface-raised border-white/10 text-ink shadow-2xl"
                      >
                        {/* Plain search input + button list. Replaced cmdk's
                            Command/CommandItem here (Session 11.2 follow-up):
                            with shouldFilter={false} + UUID values, cmdk's
                            onSelect fired unreliably on click, so companies
                            couldn't be picked. A native <button onClick> can't
                            fail to fire. Search + category grouping + Enter-to-
                            select-first are all preserved. */}
                        <div className="bg-transparent text-ink">
                          <div className="relative border-b border-white/10">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                            <input
                              autoFocus
                              value={companyQuery}
                              onChange={(event) => setCompanyQuery(event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter" && filteredCompanies.length > 0) {
                                  event.preventDefault()
                                  handleSelectCompany(filteredCompanies[0].id)
                                }
                              }}
                              placeholder="Search approved companies..."
                              className="h-11 w-full bg-transparent pl-9 pr-3 text-sm text-ink placeholder:text-ink-muted outline-none"
                            />
                          </div>
                          <div className="max-h-[320px] overflow-y-auto py-1">
                            {filteredCompanies.length === 0 ? (
                              <p className="py-6 text-center text-sm text-ink-muted">No approved companies found.</p>
                            ) : (
                              companyGroups.map((group) => (
                                <div key={group.category} className="px-2 py-1.5">
                                  <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                                    {group.category}
                                  </p>
                                  {group.items.map((company) => (
                                    <button
                                      key={company.id}
                                      type="button"
                                      onClick={() => handleSelectCompany(company.id)}
                                      className={`flex w-full items-center rounded-md px-2.5 py-2 text-left text-ink transition-colors hover:bg-gold/15 ${
                                        companyId === company.id ? "bg-gold/20" : ""
                                      }`}
                                    >
                                      <Check
                                        size={14}
                                        className={`mr-2 shrink-0 ${companyId === company.id ? "opacity-100 text-gold" : "opacity-0"}`}
                                      />
                                      <span className="truncate">{company.name}</span>
                                    </button>
                                  ))}
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                    <p className="text-[10px] text-ink-muted mt-1">Only active approved companies can create feedback forms.</p>
                  </div>
                  <div>
                    <Label className="text-xs text-ink-dim mb-1.5 block">Product / Service <span className="text-destructive">*</span></Label>
                    <Input
                      value={product}
                      onChange={(e) => setProduct(e.target.value)}
                      placeholder="e.g. TrustVox Pro"
                      className={FIELD_CLASS}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-ink-dim mb-1.5 block">Category <span className="text-destructive">*</span></Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="h-11 bg-white/[0.03] border-white/10 text-ink data-[placeholder]:text-ink-muted focus:border-gold/50 focus:ring-gold/20">
                        <SelectValue>{category || "Select category"}</SelectValue>
                      </SelectTrigger>
                      <SelectContent
                        position="popper"
                        side="bottom"
                        sideOffset={6}
                        avoidCollisions={false}
                        className="max-h-[280px] w-[--radix-select-trigger-width] overflow-y-auto bg-surface-raised border-white/10 text-ink shadow-2xl"
                      >
                        {CATEGORIES.map((c) => (
                          <SelectItem
                            key={c}
                            value={c}
                            className="text-ink focus:bg-gold/20 focus:text-ink data-[state=checked]:bg-gold/15"
                          >
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-ink-dim mb-1.5 block">Reward Per Completed Feedback (TVX) <span className="text-destructive">*</span></Label>
                    <Input
                      type="number"
                      min={1}
                      max={MAX_REWARD_TOKENS}
                      step={1}
                      value={rewardTokens}
                      onChange={(e) => setRewardTokens(e.target.value)}
                      placeholder="e.g. 40"
                      className={FIELD_CLASS}
                    />
                    <p className="text-[10px] text-ink-muted mt-1">Users receive exactly this TVX amount when they complete this form.</p>
                  </div>
                </div>

                {category === "Other" && (
                  <div>
                    <Label className="text-xs text-ink-dim mb-1.5 block">Describe Product / Service <span className="text-destructive">*</span></Label>
                    <Textarea
                      value={otherCategoryDetails}
                      onChange={(e) => setOtherCategoryDetails(e.target.value)}
                      placeholder="Tell us briefly what your product/service does, target audience, and key goals…"
                      className="bg-white/[0.03] border-white/10 text-ink placeholder:text-ink-muted focus-visible:border-gold/50 focus-visible:ring-gold/20 min-h-[80px] resize-none"
                    />
                  </div>
                )}

                {/* Quick Start Templates */}
                <div className="pt-2">
                  <p className="text-xs text-ink-dim font-medium flex items-center gap-1.5 mb-3">
                    <Star size={12} className="text-gold" />
                    Quick Start Templates
                    <span className="text-ink-muted font-normal">— prefill a starter form</span>
                  </p>
                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      { name: "Customer Satisfaction", desc: "Rate service quality" },
                      { name: "Product Feedback", desc: "Gather product insights" },
                      { name: "NPS Survey", desc: "Measure loyalty" },
                      { name: "Usability Test", desc: "Test user experience" },
                    ].map((template) => (
                      <button
                        key={template.name}
                        onClick={() => {
                          setTitle(template.name)
                          setDescription("")
                          setQuestions([
                            {
                              id: newQuestionId(),
                              type: "star-rating",
                              title: `How would you rate your ${template.name.toLowerCase()}?`,
                              required: true,
                              options: [],
                            },
                            {
                              id: newQuestionId(),
                              type: "text-long",
                              title: "Any additional comments?",
                              required: false,
                              options: [],
                            },
                          ])
                          setExpandedQuestion(null)
                          showToast(`"${template.name}" template loaded`)
                        }}
                        className="p-3.5 rounded-lg border border-white/10 bg-white/[0.02] hover:border-gold/40 hover:bg-gold/[0.06] transition-all text-left"
                      >
                        <p className="text-xs font-medium text-ink truncate">{template.name}</p>
                        <p className="text-[10px] text-ink-muted mt-1 truncate">{template.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Questions Builder Section */}
            <section className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 sm:p-7">
              <StepHeading
                n={2}
                title="Questions"
                hint="Drag to reorder • Click a card to edit • Toggle required"
                right={
                  <Button
                    size="sm"
                    onClick={addQuestion}
                    className="bg-gradient-to-b from-[#f2c877] to-gold-deep text-[#241a06] font-semibold hover:brightness-105 text-xs gap-1.5 shrink-0"
                  >
                    <Plus size={14} />
                    Add Question
                  </Button>
                }
              />

              {/* Empty State */}
              {questions.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-gold/25 bg-white/[0.015] p-10 md:p-12 text-center">
                  <div className="flex justify-center mb-5">
                    <div className="w-16 h-16 rounded-full bg-gold/10 flex items-center justify-center">
                      <List size={32} className="text-gold" />
                    </div>
                  </div>

                  <h3 className="text-base font-semibold text-ink mb-2">Start Building Your Form</h3>
                  <p className="text-xs text-ink-dim mb-6">Add questions one at a time, or start from a quick template</p>

                  <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
                    <Button
                      size="sm"
                      onClick={addQuestion}
                      className="bg-gradient-to-b from-[#f2c877] to-gold-deep text-[#241a06] font-semibold hover:brightness-105 text-xs gap-1.5 flex-1 sm:flex-none"
                    >
                      <Plus size={14} />
                      Add Question
                    </Button>

                    <button
                      onClick={() => {
                        const q1: Question = {
                          id: newQuestionId(),
                          type: "star-rating",
                          title: "How satisfied are you?",
                          required: true,
                          options: [],
                        }
                        const q2: Question = {
                          id: newQuestionId(),
                          type: "text-long",
                          title: "Any additional feedback?",
                          required: false,
                          options: [],
                        }
                        setQuestions([q1, q2])
                        setExpandedQuestion(q1.id)
                        showToast("Quick form template loaded")
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-ink-muted hover:text-ink-dim hover:bg-white/[0.06] transition-colors border border-white/10 flex items-center justify-center gap-1.5 flex-1 sm:flex-none"
                    >
                      <Star size={14} />
                      Quick Start
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {questions.map((q, idx) => {
                    const isExpanded = expandedQuestion === q.id
                    const qtMeta = QUESTION_TYPES.find((t) => t.value === q.type)
                    return (
                      <div
                        key={q.id}
                        draggable
                        onDragStart={() => setDraggingQuestionId(q.id)}
                        onDragOver={(event) => {
                          event.preventDefault()
                          setDragOverQuestionId(q.id)
                        }}
                        onDragEnd={() => {
                          setDraggingQuestionId(null)
                          setDragOverQuestionId(null)
                        }}
                        onDrop={(event) => {
                          event.preventDefault()
                          moveQuestionToPosition(draggingQuestionId, q.id)
                          setDraggingQuestionId(null)
                          setDragOverQuestionId(null)
                        }}
                        className={`rounded-xl border transition-all ${
                          isExpanded
                            ? "border-gold/40 bg-white/[0.03] ring-1 ring-gold/15"
                            : "border-white/[0.07] bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                        } ${
                          draggingQuestionId === q.id
                            ? "opacity-50 ring-1 ring-gold/40"
                            : ""
                        } ${
                          dragOverQuestionId === q.id && draggingQuestionId !== q.id
                            ? "border-gold bg-gold/5"
                            : ""
                        }`}
                      >
                        {/* Question Compact Header */}
                        <div
                          className="flex items-center gap-3 p-4 cursor-pointer select-none group"
                          onClick={() => setExpandedQuestion(isExpanded ? null : q.id)}
                        >
                          <GripVertical size={16} className="text-ink-muted group-hover:text-ink-dim shrink-0 cursor-grab active:cursor-grabbing" />

                          {/* Question Info */}
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div className="w-7 h-7 rounded-md bg-gold/10 flex items-center justify-center text-gold shrink-0">
                              <QuestionTypeIcon type={q.type} size={13} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-ink truncate">
                                {q.title ? `${idx + 1}. ${q.title}` : `${idx + 1}. Untitled question`}
                              </p>
                              {q.options.length > 0 && (
                                <p className="text-xs text-ink-muted mt-0.5">{q.options.length} options</p>
                              )}
                            </div>
                          </div>

                          {/* Question Meta & Actions */}
                          <div className="flex items-center gap-2 shrink-0 ml-auto">
                            {q.required && (
                              <Badge variant="outline" className="border-destructive/30 text-destructive text-[9px] px-1.5 py-0.5 whitespace-nowrap">
                                Required
                              </Badge>
                            )}
                            <Badge variant="outline" className="border-white/15 text-ink-muted text-[9px] px-1.5 py-0.5 hidden sm:inline-flex whitespace-nowrap">
                              {qtMeta?.label}
                            </Badge>

                            {/* Quick Actions */}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => { e.stopPropagation(); moveQuestion(q.id, -1) }}
                                disabled={idx === 0}
                                className="p-1.5 text-ink-muted hover:text-ink-dim hover:bg-white/[0.06] rounded-md disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                title="Move up"
                              >
                                <ChevronUp size={14} />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); moveQuestion(q.id, 1) }}
                                disabled={idx === questions.length - 1}
                                className="p-1.5 text-ink-muted hover:text-ink-dim hover:bg-white/[0.06] rounded-md disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                title="Move down"
                              >
                                <ChevronDown size={14} />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); removeQuestion(q.id) }}
                                className="p-1.5 text-ink-muted hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                                title="Delete question"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>

                            {/* Expand Indicator */}
                            <div className="text-ink-muted group-hover:text-ink-dim">
                              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </div>
                          </div>
                        </div>

                        {/* Question Editor - Expanded */}
                        {isExpanded && (
                          <div className="px-4 pb-4 pt-3 space-y-4 border-t border-white/10">
                            {/* Title & Type Row */}
                            <div className="grid sm:grid-cols-2 gap-4">
                              <div>
                                <Label className="text-xs font-medium text-ink-dim mb-2 block">Question Title *</Label>
                                <Input
                                  value={q.title}
                                  onChange={(e) => updateQuestion(q.id, { title: e.target.value })}
                                  placeholder="e.g. How satisfied are you with our service?"
                                  className="h-10 bg-white/[0.03] border-white/10 text-ink placeholder:text-ink-muted focus-visible:border-gold/50 focus-visible:ring-gold/20 text-sm"
                                />
                              </div>
                              <div>
                                <Label className="text-xs font-medium text-ink-dim mb-2 block">Question Type *</Label>
                                <Select
                                  value={q.type}
                                  onValueChange={(v: QuestionType) =>
                                    updateQuestion(q.id, {
                                      type: v,
                                      options: ["multiple-choice", "multi-select"].includes(v)
                                        ? q.options.length > 0 ? q.options : ["Option 1", "Option 2"]
                                        : [],
                                    })
                                  }
                                >
                                  <SelectTrigger className="h-10 bg-white/[0.03] border-white/10 text-ink text-sm data-[placeholder]:text-ink-muted focus:border-gold/50 focus:ring-gold/20">
                                    <SelectValue>{QUESTION_TYPES.find(t => t.value === q.type)?.label || q.type}</SelectValue>
                                  </SelectTrigger>
                                  <SelectContent
                                    position="popper"
                                    side="bottom"
                                    sideOffset={6}
                                    avoidCollisions={false}
                                    className="max-h-[280px] w-[--radix-select-trigger-width] overflow-y-auto bg-surface-raised border-white/10 text-ink shadow-2xl"
                                  >
                                    {QUESTION_TYPES.map((t) => (
                                      <SelectItem
                                        key={t.value}
                                        value={t.value}
                                        className="text-ink text-sm focus:bg-gold/20 focus:text-ink data-[state=checked]:bg-gold/15"
                                      >
                                        {t.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            {/* Options Editor */}
                            {hasOptionsType(q.type) && (
                              <div className="rounded-lg bg-white/[0.02] border border-white/10 p-3.5">
                                <Label className="text-xs font-medium text-ink-dim mb-3 block">Answer Options</Label>
                                <div className="space-y-2.5">
                                  {q.options.map((opt, oi) => (
                                    <div key={oi} className="flex items-center gap-2.5">
                                      <div className="w-6 h-6 rounded-md border border-white/10 bg-white/[0.03] flex items-center justify-center text-xs font-medium text-ink-muted shrink-0">
                                        {oi + 1}
                                      </div>
                                      <Input
                                        value={opt}
                                        onChange={(e) => updateOption(q.id, oi, e.target.value)}
                                        className="bg-white/[0.03] border-white/10 text-ink placeholder:text-ink-muted focus-visible:border-gold/50 focus-visible:ring-gold/20 text-sm h-9 flex-1"
                                        placeholder={`Option ${oi + 1}`}
                                      />
                                      <button
                                        onClick={() => removeOption(q.id, oi)}
                                        className="p-1.5 text-ink-muted hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors shrink-0"
                                        title="Remove option"
                                      >
                                        <X size={14} />
                                      </button>
                                    </div>
                                  ))}
                                  <button
                                    onClick={() => addOption(q.id)}
                                    className="flex items-center gap-1.5 text-xs text-gold hover:text-gold-deep transition-colors mt-2"
                                  >
                                    <Plus size={12} />
                                    Add Option
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Required & Settings */}
                            <div className="flex items-center justify-between pt-2 border-t border-white/10">
                              <div>
                                <Label className="text-xs font-medium text-ink-dim">Mark as Required</Label>
                                <p className="text-[11px] text-ink-muted mt-0.5">Respondents must answer this question</p>
                              </div>
                              <Switch
                                checked={q.required}
                                onCheckedChange={(v) => updateQuestion(q.id, { required: v })}
                                className="data-[state=checked]:bg-gold"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          </div>

          {/* ── Right sidebar ── */}
          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            {/* Form Settings Card */}
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6">
              <h3 className="text-sm font-semibold text-ink mb-5 flex items-center gap-2">
                <Settings size={14} className="text-gold" />
                Form Settings
              </h3>
              <div className="space-y-5">
                {/* Visibility */}
                <div>
                  <Label className="text-xs font-medium text-ink-dim mb-2 block">Visibility</Label>
                  <Select value={formVisibility} onValueChange={(v: FormVisibility) => setFormVisibility(v)}>
                    <SelectTrigger className="h-10 bg-white/[0.03] border-white/10 text-ink text-sm focus:border-gold/50 focus:ring-gold/20">
                      <SelectValue>
                        {formVisibility === "link"
                          ? "Link Only"
                          : formVisibility.charAt(0).toUpperCase() + formVisibility.slice(1)}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent
                      position="popper"
                      side="bottom"
                      sideOffset={6}
                      avoidCollisions={false}
                      className="max-h-[280px] w-[--radix-select-trigger-width] overflow-y-auto bg-surface-raised border-white/10 text-ink shadow-2xl"
                    >
                      <SelectItem value="private" className="text-sm">
                        Private
                      </SelectItem>
                      <SelectItem value="public" className="text-sm">
                        Public
                      </SelectItem>
                      <SelectItem value="link" className="text-sm">
                        Link Only
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-ink-muted mt-1">Who can access this form</p>
                </div>

                {/* Response Limit */}
                <div>
                  <Label className="text-xs font-medium text-ink-dim mb-2 block">Response Limit (Optional)</Label>
                  <Input
                    type="number"
                    value={responseLimit}
                    onChange={(e) => setResponseLimit(e.target.value)}
                    placeholder="e.g. 100"
                    className="h-10 bg-white/[0.03] border-white/10 text-ink placeholder:text-ink-muted focus-visible:border-gold/50 focus-visible:ring-gold/20 text-sm"
                  />
                  <p className="text-[10px] text-ink-muted mt-1">Close form after X responses</p>
                </div>

                {/* Anonymous Toggle */}
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <p className="text-xs font-medium text-ink-dim">Anonymous Responses</p>
                    <p className="text-[10px] text-ink-muted mt-0.5">Don&apos;t collect respondent info</p>
                  </div>
                  <Switch
                    checked={allowAnonymous}
                    onCheckedChange={setAllowAnonymous}
                    className="data-[state=checked]:bg-gold"
                  />
                </div>

                {/* Ratings Summary Toggle */}
                <div className="flex items-center justify-between pt-1 border-t border-white/10">
                  <div>
                    <p className="text-xs font-medium text-ink-dim">Show Rating Stats</p>
                    <p className="text-[10px] text-ink-muted mt-0.5">Display average ratings</p>
                  </div>
                  <Switch
                    checked={enableRatings}
                    onCheckedChange={setEnableRatings}
                    className="data-[state=checked]:bg-gold"
                  />
                </div>

                {/* Auto Close Date */}
                <div>
                  <Label className="text-xs font-medium text-ink-dim mb-2 block">Auto Close Date (Optional)</Label>
                  <Input
                    type="date"
                    value={autoCloseDate}
                    onChange={(e) => setAutoCloseDate(e.target.value)}
                    className="h-10 bg-white/[0.03] border-white/10 text-ink text-sm focus-visible:border-gold/50 focus-visible:ring-gold/20"
                  />
                  <p className="text-[10px] text-ink-muted mt-1">Form closes automatically</p>
                </div>
              </div>
            </div>

            {/* Actions card */}
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6">
              <h3 className="text-sm font-semibold text-ink mb-5">Actions</h3>
              <div className="space-y-3">
                <Button
                  className="w-full bg-gradient-to-b from-[#f2c877] to-gold-deep text-[#241a06] font-semibold hover:brightness-105 gap-2"
                  onClick={handleSubmitToAdmin}
                  disabled={submitState !== "idle"}
                >
                  <Send size={16} />
                  {submitState === "loading" ? "Submitting…" : submitState === "done" ? "Submitted ✓" : "Submit to Admin"}
                </Button>
                <Button
                  variant="outline"
                  className="w-full border-white/10 text-ink-dim hover:text-gold hover:border-gold/40 gap-2"
                  onClick={handleSaveDraft}
                  disabled={savingState === "saving"}
                >
                  <Save size={16} />
                  {savingState === "saving" ? "Saving…" : savingState === "saved" ? "Saved ✓" : "Save as Draft"}
                </Button>
                <Button
                  variant="ghost"
                  className="w-full text-ink-dim hover:text-gold gap-2"
                  onClick={() => { setPreviewAnswers({}); setPreviewOpen(true) }}
                >
                  <Eye size={16} />
                  Preview Form
                </Button>
              </div>

              {/* Quick stats */}
              <div className="mt-5 pt-4 border-t border-white/10 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-ink-muted">Questions</span>
                  <span className="text-ink-dim">{questions.length}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-ink-muted">Required</span>
                  <span className="text-ink-dim">{questions.filter((q) => q.required).length}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-ink-muted">Status</span>
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 border-white/15 text-ink-dim"
                  >
                    Draft
                  </Badge>
                </div>
              </div>
            </div>
          </aside>
        </div>
        ) : (
        // PREVIEW MODE
        <div className="max-w-2xl mx-auto">
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-8 space-y-6">
            {/* Form Header */}
            <div className="pb-6 border-b border-white/10">
              <h1 className="text-2xl font-semibold text-ink mb-2">
                {title || <span className="text-ink-muted italic">Untitled Form</span>}
              </h1>
              {description && (
                <p className="text-sm text-ink-dim mt-2">{description}</p>
              )}
              <div className="flex items-center gap-2 mt-4 flex-wrap">
                {product && (
                  <Badge className="bg-gold/10 text-gold border border-gold/30 text-xs">
                    {product}
                  </Badge>
                )}
                {category && (
                  <Badge variant="outline" className="border-white/15 text-ink-dim text-xs">
                    {category}
                  </Badge>
                )}
                {responseLimit && (
                  <Badge variant="outline" className="border-white/15 text-ink-dim text-xs">
                    Limit: {responseLimit}
                  </Badge>
                )}
                {autoCloseDate && (
                  <Badge variant="outline" className="border-white/15 text-ink-dim text-xs">
                    Closes: {autoCloseDate}
                  </Badge>
                )}
              </div>
            </div>

            {/* Questions Preview */}
            {questions.length === 0 ? (
              <div className="text-center py-12">
                <List size={32} className="mx-auto mb-3 opacity-30 text-ink-muted" />
                <p className="text-sm text-ink-dim">No questions added yet</p>
              </div>
            ) : (
              <div className="space-y-6">
                {questions.map((q, idx) => (
                  <div key={q.id} className="space-y-3 pb-6 border-b border-white/10 last:border-0 last:pb-0">
                    <div className="flex items-start gap-3">
                      <span className="text-xs font-semibold text-gold mt-1 shrink-0 w-5">{idx + 1}.</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-ink">
                          {q.title}
                          {q.required && (
                            <span className="text-destructive ml-1">*</span>
                          )}
                        </p>
                        {q.type === "star-rating" && (
                          <div className="flex gap-1 mt-3">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                className="p-1 text-ink-muted hover:text-gold transition-colors"
                              >
                                <Star size={18} />
                              </button>
                            ))}
                          </div>
                        )}
                        {q.type === "text-short" && (
                          <input
                            type="text"
                            placeholder="Your answer…"
                            disabled
                            className="w-full mt-3 bg-white/[0.02] border border-white/10 rounded-lg px-3 py-2 text-sm text-ink-muted"
                          />
                        )}
                        {q.type === "text-long" && (
                          <textarea
                            placeholder="Your answer…"
                            disabled
                            className="w-full mt-3 bg-white/[0.02] border border-white/10 rounded-lg px-3 py-2 text-sm text-ink-muted min-h-20"
                          />
                        )}
                        {(q.type === "multiple-choice" || q.type === "multi-select") && (
                          <div className="space-y-2 mt-3">
                            {q.options.map((opt, oi) => (
                              <label key={oi} className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type={q.type === "multiple-choice" ? "radio" : "checkbox"}
                                  disabled
                                  className="w-4 h-4 rounded"
                                />
                                <span className="text-sm text-ink-dim">{opt}</span>
                              </label>
                            ))}
                          </div>
                        )}
                        {q.type === "voice-feedback" && (
                          <button disabled className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/10 text-sm text-ink-dim">
                            <Mic size={14} />
                            Record Voice Feedback
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Submit Button */}
            {questions.length > 0 && (
              <div className="pt-6">
                <Button className="w-full bg-gradient-to-b from-[#f2c877] to-gold-deep text-[#241a06] font-semibold hover:brightness-105 gap-2" disabled>
                  Submit Feedback
                </Button>
              </div>
            )}
          </div>
        </div>
        )}
      </main>

      {/* ── Preview Dialog ── */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="border-white/[0.08] bg-surface text-ink max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-ink flex items-center gap-2">
              <Eye size={18} className="text-gold" />
              Form Preview
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 mt-2">
            {/* Form header */}
            <div className="rounded-xl bg-white/[0.03] p-4 border border-white/[0.06]">
              <h3 className="text-base font-semibold text-ink">
                {title || <span className="text-ink-muted italic">Untitled Form</span>}
              </h3>
              {description && (
                <p className="text-sm text-ink-dim mt-1">{description}</p>
              )}
              <div className="flex items-center gap-3 mt-3">
                {product && (
                  <Badge variant="outline" className="border-gold/30 text-gold text-xs">
                    {product}
                  </Badge>
                )}
                {category && (
                  <Badge variant="outline" className="border-white/15 text-ink-dim text-xs">
                    {category}
                  </Badge>
                )}
                {responseLimit && (
                  <Badge variant="outline" className="border-white/15 text-ink-dim text-xs">
                    Limit: {responseLimit}
                  </Badge>
                )}
                {autoCloseDate && (
                  <Badge variant="outline" className="border-white/15 text-ink-dim text-xs">
                    Closes: {autoCloseDate}
                  </Badge>
                )}
              </div>
            </div>

            {questions.length === 0 ? (
              <p className="text-center text-sm text-ink-muted py-6">
                No questions added yet.
              </p>
            ) : (
              questions.map((q) => (
                <div key={q.id} className="rounded-xl bg-white/[0.03] p-4 border border-white/[0.06]">
                  <PreviewQuestion
                    question={q}
                    answers={previewAnswers}
                    onAnswer={(id, val) =>
                      setPreviewAnswers((prev) => ({ ...prev, [id]: val }))
                    }
                  />
                </div>
              ))
            )}

            {questions.length > 0 && (
              <Button className="w-full bg-gradient-to-b from-[#f2c877] to-gold-deep text-[#241a06] font-semibold hover:brightness-105">
                Submit Feedback
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function CreateFeedbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen app-page bg-background flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-gold/30 border-t-gold animate-spin" />
      </div>
    }>
      <CreateFeedbackInner />
    </Suspense>
  )
}
