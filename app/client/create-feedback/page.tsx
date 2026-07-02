"use client"

import { Suspense, useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Plus, Trash2, ChevronUp, ChevronDown, Eye, Save, Send,
  Star, Type, AlignLeft, List, CheckSquare, Mic,
  GripVertical, ArrowLeft, X, Check, AlertCircle, Sparkles, Wand2, Settings, Search
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
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  createForm, updateForm, submitFormForApproval,
  getFormById, newQuestionId,
} from "@/lib/feedback-store"
import { getActiveApprovedCompanies, subscribeToApprovedCompanies } from "@/lib/approved-company-store"

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
  "Food & Beverage", "Healthcare", "Education", "Finance", "Other", "Others",
]

const TEMPLATE_LIBRARY = {
  software: [
    {
      name: "Product Experience",
      description: "Capture UX quality, performance and value perception.",
      questions: [
        { type: "star-rating", title: "How would you rate your overall experience?", required: true, options: [] },
        { type: "star-rating", title: "How reliable is the product performance?", required: true, options: [] },
        { type: "multi-select", title: "Which features did you find most valuable?", required: false, options: ["Ease of use", "Speed", "Design", "Integrations", "Support"] },
        { type: "multiple-choice", title: "How often do you use this product?", required: true, options: ["Daily", "Weekly", "Monthly", "Rarely"] },
        { type: "text-long", title: "What should we improve next?", required: false, options: [] },
      ],
    },
    {
      name: "Onboarding Feedback",
      description: "Understand first-time setup and learning friction.",
      questions: [
        { type: "star-rating", title: "How easy was account setup?", required: true, options: [] },
        { type: "star-rating", title: "How clear were onboarding instructions?", required: true, options: [] },
        { type: "multi-select", title: "What caused friction during onboarding?", required: false, options: ["Too many steps", "UI confusion", "Slow loading", "Missing guidance"] },
        { type: "text-short", title: "Which part was most confusing?", required: false, options: [] },
        { type: "text-long", title: "How can we improve the onboarding flow?", required: false, options: [] },
      ],
    },
    {
      name: "Support Quality",
      description: "Measure support experience after product issues.",
      questions: [
        { type: "star-rating", title: "How satisfied are you with support resolution?", required: true, options: [] },
        { type: "star-rating", title: "How quickly was your issue resolved?", required: true, options: [] },
        { type: "multi-select", title: "How would you describe support quality?", required: false, options: ["Helpful", "Fast", "Professional", "Needs Improvement"] },
        { type: "voice-feedback", title: "Would you like to leave voice feedback?", required: false, options: [] },
        { type: "text-long", title: "Any additional comments on support?", required: false, options: [] },
      ],
    },
  ],
  beverage: [
    {
      name: "Taste & Quality",
      description: "Collect flavor, freshness and value insights.",
      questions: [
        { type: "star-rating", title: "How would you rate the overall taste?", required: true, options: [] },
        { type: "star-rating", title: "How would you rate product freshness?", required: true, options: [] },
        { type: "multi-select", title: "Which flavor notes stood out?", required: false, options: ["Sweet", "Fruity", "Rich", "Balanced", "Refreshing"] },
        { type: "multiple-choice", title: "Would you purchase this again?", required: true, options: ["Definitely", "Maybe", "Not likely"] },
        { type: "text-long", title: "What can we improve in taste or quality?", required: false, options: [] },
      ],
    },
    {
      name: "Packaging & Experience",
      description: "Evaluate packaging, convenience and branding.",
      questions: [
        { type: "star-rating", title: "How appealing is the packaging design?", required: true, options: [] },
        { type: "star-rating", title: "How convenient is the packaging to use?", required: true, options: [] },
        { type: "multi-select", title: "What did you like about the packaging?", required: false, options: ["Easy to open", "Portable", "Attractive", "Eco-friendly"] },
        { type: "text-short", title: "Any packaging issue you noticed?", required: false, options: [] },
        { type: "text-long", title: "Share packaging improvement suggestions", required: false, options: [] },
      ],
    },
    {
      name: "Cafe/Outlet Service",
      description: "Measure service speed and in-store experience.",
      questions: [
        { type: "star-rating", title: "How would you rate service speed?", required: true, options: [] },
        { type: "star-rating", title: "How friendly was the staff?", required: true, options: [] },
        { type: "multi-select", title: "How was your visit overall?", required: false, options: ["Clean", "Welcoming", "Quick", "Crowded", "Noisy"] },
        { type: "voice-feedback", title: "Leave voice feedback about your visit", required: false, options: [] },
        { type: "text-long", title: "What should we improve at this outlet?", required: false, options: [] },
      ],
    },
  ],
  service: [
    {
      name: "Service Satisfaction",
      description: "Track delivery quality, timeliness and communication.",
      questions: [
        { type: "star-rating", title: "How satisfied are you with the service overall?", required: true, options: [] },
        { type: "star-rating", title: "How would you rate service timeliness?", required: true, options: [] },
        { type: "multiple-choice", title: "Was your request resolved in one attempt?", required: true, options: ["Yes", "Partially", "No"] },
        { type: "multi-select", title: "Which qualities best describe our service?", required: false, options: ["Professional", "Responsive", "Reliable", "Needs Improvement"] },
        { type: "text-long", title: "What can we do better next time?", required: false, options: [] },
      ],
    },
    {
      name: "Post-Interaction Review",
      description: "Gather immediate impressions after service interaction.",
      questions: [
        { type: "star-rating", title: "How clear was the communication?", required: true, options: [] },
        { type: "star-rating", title: "How confident are you in the solution provided?", required: true, options: [] },
        { type: "multi-select", title: "What mattered most to you?", required: false, options: ["Speed", "Accuracy", "Courtesy", "Cost", "Follow-up"] },
        { type: "text-short", title: "What service did you use?", required: true, options: [] },
        { type: "text-long", title: "Share any follow-up requests", required: false, options: [] },
      ],
    },
    {
      name: "Voice of Customer",
      description: "Capture richer customer stories via mixed formats.",
      questions: [
        { type: "star-rating", title: "How likely are you to recommend us?", required: true, options: [] },
        { type: "multi-select", title: "How did we perform?", required: false, options: ["Excellent", "Good", "Average", "Poor"] },
        { type: "voice-feedback", title: "Record a quick voice summary", required: false, options: [] },
        { type: "text-long", title: "Tell us your full experience", required: false, options: [] },
      ],
    },
  ],
}

function detectDomain(categoryValue, productValue, contextValue) {
  const categoryText = (categoryValue || "").toLowerCase()
  const productText = (productValue || "").toLowerCase()
  const contextText = (contextValue || "").toLowerCase()
  const combined = `${categoryText} ${productText} ${contextText}`

  if (
    combined.includes("beverage") ||
    combined.includes("drink") ||
    combined.includes("coffee") ||
    combined.includes("tea") ||
    combined.includes("juice")
  ) {
    return "beverage"
  }

  if (
    combined.includes("software") ||
    combined.includes("app") ||
    combined.includes("saas") ||
    combined.includes("technology") ||
    combined.includes("mobile")
  ) {
    return "software"
  }

  return "service"
}

function generateTemplateSuggestions(productValue, categoryValue, contextValue) {
  const domain = detectDomain(categoryValue, productValue, contextValue)
  const candidates = TEMPLATE_LIBRARY[domain] || TEMPLATE_LIBRARY.service
  const contextSuffix = contextValue ? ` Context: ${contextValue}` : ""

  return candidates.map((template, index) => ({
    id: `${domain}-${index + 1}`,
    domain,
    name: template.name,
    description: template.description,
    title: `${productValue || "Customer"} ${template.name} Form`,
    formDescription: `AI suggested template for ${productValue || "your offering"} in ${categoryValue || "general"} domain. ${template.description}${contextSuffix}`,
    questions: template.questions,
  }))
}

function QuestionTypeIcon({ type, size = 16 }) {
  const qt = QUESTION_TYPES.find((q) => q.value === type)
  if (!qt) return null
  const Icon = qt.icon
  return <Icon size={size} />
}

function StarPreview({ value, onChange }) {
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
                ? "fill-[#FBBF24] text-[#FBBF24]"
                : "text-[#6c7396]"
            }
          />
        </button>
      ))}
    </div>
  )
}

// Render a single question in preview mode
function PreviewQuestion({ question, answers, onAnswer }) {
  const ans = answers[question.id]

  if (question.type === "star-rating") {
    return (
      <div>
        <p className="text-sm text-[#a5accb] mb-2">
          {question.title}
          {question.required && <span className="text-[#F87171] ml-1">*</span>}
        </p>
        <StarPreview value={ans || 0} onChange={(v) => onAnswer(question.id, v)} />
      </div>
    )
  }
  if (question.type === "text-short") {
    return (
      <div>
        <p className="text-sm text-[#a5accb] mb-2">
          {question.title}
          {question.required && <span className="text-[#F87171] ml-1">*</span>}
        </p>
        <Input
          value={ans || ""}
          onChange={(e) => onAnswer(question.id, e.target.value)}
          placeholder="Short answer…"
          className="bg-[#1a1f33] border-[#2b3150] text-[#f5f7ff]"
        />
      </div>
    )
  }
  if (question.type === "text-long") {
    return (
      <div>
        <p className="text-sm text-[#a5accb] mb-2">
          {question.title}
          {question.required && <span className="text-[#F87171] ml-1">*</span>}
        </p>
        <Textarea
          value={ans || ""}
          onChange={(e) => onAnswer(question.id, e.target.value)}
          placeholder="Long answer…"
          className="bg-[#1a1f33] border-[#2b3150] text-[#f5f7ff] min-h-[90px]"
        />
      </div>
    )
  }
  if (question.type === "multiple-choice") {
    return (
      <div>
        <p className="text-sm text-[#a5accb] mb-2">
          {question.title}
          {question.required && <span className="text-[#F87171] ml-1">*</span>}
        </p>
        <div className="flex flex-col gap-2">
          {question.options.map((opt) => (
            <label key={opt} className="flex items-center gap-2 cursor-pointer group">
              <div
                onClick={() => onAnswer(question.id, opt)}
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors cursor-pointer ${
                  ans === opt
                    ? "border-[#8b5cf6] bg-[#8b5cf6]"
                    : "border-[#6c7396] group-hover:border-[#8b5cf6]"
                }`}
              >
                {ans === opt && <div className="w-1.5 h-1.5 bg-[#090b14] rounded-full" />}
              </div>
              <span className="text-sm text-[#d7ddf5]">{opt}</span>
            </label>
          ))}
        </div>
      </div>
    )
  }
  if (question.type === "multi-select") {
    const selected = ans || []
    return (
      <div>
        <p className="text-sm text-[#a5accb] mb-2">
          {question.title}
          {question.required && <span className="text-[#F87171] ml-1">*</span>}
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
                      ? "border-[#8b5cf6] bg-[#8b5cf6]"
                      : "border-[#6c7396] group-hover:border-[#8b5cf6]"
                  }`}
                >
                  {checked && <Check size={10} className="text-[#090b14]" />}
                </div>
                <span className="text-sm text-[#d7ddf5]">{opt}</span>
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
        <p className="text-sm text-[#a5accb] mb-2">
          {question.title}
          {question.required && <span className="text-[#F87171] ml-1">*</span>}
        </p>
        <div className="flex items-center gap-3 p-3 rounded-lg bg-[#1a1f33] border border-[#2b3150]">
          <Mic size={18} className="text-[#8b5cf6]" />
          <span className="text-sm text-[#a5accb]">Voice input enabled</span>
          <Badge variant="outline" className="ml-auto border-[#8b5cf6]/40 text-[#8b5cf6] text-xs">
            Mic
          </Badge>
        </div>
      </div>
    )
  }
  return null
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
  const [questions, setQuestions] = useState([])
  const [formId, setFormId] = useState(null)
  const [approvedCompanies, setApprovedCompanies] = useState([])
  const [companyPickerOpen, setCompanyPickerOpen] = useState(false)
  const [companyQuery, setCompanyQuery] = useState("")

  // UI state
  const [previewMode, setPreviewMode] = useState(false)
  const [formVisibility, setFormVisibility] = useState("private")
  const [responseLimit, setResponseLimit] = useState("")
  const [allowAnonymous, setAllowAnonymous] = useState(true)
  const [enableRatings, setEnableRatings] = useState(true)
  const [autoCloseDate, setAutoCloseDate] = useState("")
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewAnswers, setPreviewAnswers] = useState({})
  const [savingState, setSavingState] = useState("idle") // idle | saving | saved | error
  const [submitState, setSubmitState] = useState("idle")
  const [toast, setToast] = useState(null)
  const [expandedQuestion, setExpandedQuestion] = useState(null)
  const [templateSuggestions, setTemplateSuggestions] = useState([])
  const [isGeneratingTemplates, setIsGeneratingTemplates] = useState(false)
  const [draggingQuestionId, setDraggingQuestionId] = useState(null)
  const [dragOverQuestionId, setDragOverQuestionId] = useState(null)

  // Load form for editing
  useEffect(() => {
    if (editId) {
      const form = getFormById(editId)
      if (form) {
        const activeCompanies = getActiveApprovedCompanies()
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
      }
    }
  }, [editId])

  useEffect(() => {
    const loadCompanies = () => {
      const activeCompanies = getActiveApprovedCompanies()
      setApprovedCompanies(activeCompanies)
    }

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

  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  function handleSelectCompany(companyIdToSelect) {
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
    const newQ = {
      id: newQuestionId(),
      type: "text-short",
      title: "",
      required: false,
      options: [],
    }
    setQuestions((prev) => [...prev, newQ])
    setExpandedQuestion(newQ.id)
  }

  function updateQuestion(id, patch) {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, ...patch } : q))
    )
  }

  function removeQuestion(id) {
    setQuestions((prev) => prev.filter((q) => q.id !== id))
    if (expandedQuestion === id) setExpandedQuestion(null)
  }

  function moveQuestion(id, dir) {
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

  function moveQuestionToPosition(sourceId, targetId) {
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

  function addOption(qid) {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === qid ? { ...q, options: [...q.options, `Option ${q.options.length + 1}`] } : q
      )
    )
  }

  function updateOption(qid, idx, val) {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== qid) return q
        const opts = [...q.options]
        opts[idx] = val
        return { ...q, options: opts }
      })
    )
  }

  function removeOption(qid, idx) {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== qid) return q
        return { ...q, options: q.options.filter((_, i) => i !== idx) }
      })
    )
  }

  async function handleGenerateTemplates() {
    if (!product.trim()) {
      showToast("Enter Product / Service name to generate templates.", "error")
      return
    }

    setIsGeneratingTemplates(true)
    await new Promise((r) => setTimeout(r, 450))
    if ((category === "Other" || category === "Others") && !otherCategoryDetails.trim()) {
      setIsGeneratingTemplates(false)
      showToast("Please describe your product/service for 'Other' category.", "error")
      return
    }

    const suggestions = generateTemplateSuggestions(product, category, otherCategoryDetails)
    setTemplateSuggestions(suggestions)
    setIsGeneratingTemplates(false)
    showToast(`Generated ${suggestions.length} AI template suggestions.`)
  }

  function applyTemplateSuggestion(template) {
    const mappedQuestions = template.questions.map((q) => ({
      id: newQuestionId(),
      type: q.type,
      title: q.title,
      required: q.required,
      options: q.options,
    }))

    setTitle(template.title)
    setDescription(template.formDescription)
    setQuestions(mappedQuestions)
    setExpandedQuestion(mappedQuestions[0]?.id || null)

    console.debug("[TrustVoxFlow] ai-template-applied", {
      templateId: template.id,
      domain: template.domain,
      questionCount: mappedQuestions.length,
      product,
      category,
      otherCategoryDetails,
    })

    showToast(`Applied "${template.name}" template. You can edit any question.`)
  }

  // ── Save / Submit ───────────────────────────────────────────────────────────
  function buildPayload() {
    const normalizedRewardTokens = Math.max(1, Math.floor(Number(rewardTokens) || 0))
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
    if ((category === "Other" || category === "Others") && !otherCategoryDetails.trim()) {
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
    if (formId) {
      updateForm(formId, payload)
    } else {
      const created = createForm({ ...payload, status: "draft" })
      setFormId(created.id)
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
    if (!id) {
      const created = createForm({ ...payload, status: "draft" })
      id = created.id
      setFormId(id)
    } else {
      updateForm(id, payload)
    }
    await new Promise((r) => setTimeout(r, 800))
    const submitted = submitFormForApproval(id)
    if (!submitted) {
      setSubmitState("idle")
      showToast("Submission blocked: selected company is not active/approved.", "error")
      return
    }
    console.debug("[TrustVoxFlow] client-submit-to-admin", {
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
  const hasOptionsType = (t) =>
    ["multiple-choice", "multi-select"].includes(t)

  return (
    <div className="min-h-screen app-page bg-[#090b14] relative">
      {/* Ambient blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#8b5cf6]/6 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-[#A78BFA]/6 rounded-full blur-3xl" />
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium shadow-2xl transition-all ${
            toast.type === "error"
              ? "bg-[#1a0808] border-[#F87171]/40 text-[#F87171]"
              : "bg-[#140f24] border-[#8b5cf6]/40 text-[#8b5cf6]"
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
      <header className="sticky top-0 z-40 border-b border-[#2b3150] bg-[#090b14]/95 backdrop-blur supports-[backdrop-filter]:bg-[#090b14]/80">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          {/* Left: Title + Mode */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-[#A78BFA] shrink-0" />
              <span className="text-sm font-semibold text-[#f5f7ff] hidden sm:inline">
                {editId ? "Editing Form" : "Create Feedback Form"}
              </span>
              <span className="text-sm font-semibold text-[#f5f7ff] sm:hidden">
                {editId ? "Edit Form" : "New Form"}
              </span>
            </div>
            <Badge variant="outline" className="border-[#2b3150] text-[#6c7396] text-xs px-2 py-1 hidden sm:inline-flex">
              {previewMode ? "Preview" : "Edit"}
            </Badge>
          </div>

          {/* Center: Mode Toggle */}
          <div className="flex items-center gap-1 bg-[#121526]/60 rounded-lg p-0.5 border border-[#2b3150]">
            <button
              onClick={() => setPreviewMode(false)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                !previewMode
                  ? "bg-[#8b5cf6] text-[#090b14]"
                  : "text-[#a5accb] hover:text-[#f5f7ff]"
              }`}
            >
              <span className="hidden sm:inline">Edit Mode</span>
              <span className="sm:hidden">Edit</span>
            </button>
            <button
              onClick={() => setPreviewMode(true)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                previewMode
                  ? "bg-[#8b5cf6] text-[#090b14]"
                  : "text-[#a5accb] hover:text-[#f5f7ff]"
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
                variant="ghost"
                className="text-[#a5accb] hover:text-[#8b5cf6] text-xs gap-1 hidden sm:flex"
                onClick={() => { setPreviewAnswers({}); setPreviewMode(true) }}
              >
                <Eye size={14} />
                Preview
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-[#2b3150] text-[#a5accb] hover:text-[#8b5cf6] hover:border-[#8b5cf6]/50 text-xs gap-1"
                onClick={handleSaveDraft}
                disabled={savingState === "saving"}
              >
                <Save size={14} />
                <span className="hidden sm:inline">{savingState === "saving" ? "Saving…" : savingState === "saved" ? "Saved ✓" : "Save Draft"}</span>
                <span className="sm:hidden">{savingState === "saving" ? "…" : savingState === "saved" ? "✓" : "Save"}</span>
              </Button>
              <Button
                size="sm"
                className="bg-[#8b5cf6] hover:bg-[#7c3aed] text-[#090b14] font-semibold text-xs gap-1"
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
                className="border-[#2b3150] text-[#a5accb] hover:text-[#8b5cf6] text-xs gap-1"
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
        <div className="grid lg:grid-cols-[1fr_360px] gap-8">
          {/* ── Left column: Form Builder ── */}
          <div className="space-y-7">
            {/* Basic details */}
            <section className="rounded-2xl border border-[#2b3150] bg-[#121526] p-7">
              <h2 className="text-base font-semibold text-[#f5f7ff] mb-6 flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-[#8b5cf6]/20 flex items-center justify-center text-[#8b5cf6] text-xs font-bold">1</div>
                Form Details
              </h2>
              <div className="space-y-5">
                <div>
                  <Label className="text-xs text-[#a5accb] mb-1.5 block">Form Title <span className="text-[#F87171]">*</span></Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Product Experience Survey"
                    className="bg-[#1a1f33] border-[#2b3150] text-[#f5f7ff] placeholder:text-[#6c7396]"
                  />
                </div>
                <div>
                  <Label className="text-xs text-[#a5accb] mb-1.5 block">Description</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of what this form collects…"
                    className="bg-[#1a1f33] border-[#2b3150] text-[#f5f7ff] placeholder:text-[#6c7396] min-h-[72px] resize-none"
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-[#a5accb] mb-1.5 block">Company Name <span className="text-[#F87171]">*</span></Label>
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
                          className="w-full justify-between bg-[#1a1f33] border-[#2b3150] text-[#f5f7ff] hover:bg-[#222946] hover:text-[#f5f7ff]"
                        >
                          <span className="truncate text-left">
                            {selectedCompany ? `${selectedCompany.name} • ${selectedCompany.category}` : "Select approved company"}
                          </span>
                          <ChevronDown size={16} className="text-[#8e97be]" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-[#0f1426] border-[#3a4266] text-[#eef2ff]">
                        <Command shouldFilter={false} className="bg-transparent text-[#eef2ff]">
                          <div className="relative border-b border-[#2b3150]">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8e97be]" />
                            <CommandInput
                              value={companyQuery}
                              onValueChange={setCompanyQuery}
                              onKeyDown={(event) => {
                                if (event.key === "Enter" && filteredCompanies.length > 0) {
                                  event.preventDefault()
                                  handleSelectCompany(filteredCompanies[0].id)
                                }
                              }}
                              placeholder="Search approved companies..."
                              className="h-10 pl-9 pr-3 text-sm text-[#eef2ff] placeholder:text-[#8e97be]"
                            />
                          </div>
                          <CommandList>
                            <CommandEmpty className="text-[#8e97be]">No approved companies found.</CommandEmpty>
                            <CommandGroup className="p-2">
                              {filteredCompanies.map((company) => (
                                <CommandItem
                                  key={company.id}
                                  value={company.id}
                                  onSelect={() => handleSelectCompany(company.id)}
                                  onMouseDown={(event) => {
                                    event.preventDefault()
                                    handleSelectCompany(company.id)
                                  }}
                                  onClick={() => handleSelectCompany(company.id)}
                                  className="rounded-md px-2.5 py-2.5 text-[#e8edff] aria-selected:bg-[#8b5cf6]/25 aria-selected:text-white data-[selected=true]:bg-[#8b5cf6]/20"
                                >
                                  <Check
                                    size={14}
                                    className={`mr-2 ${companyId === company.id ? "opacity-100 text-[#a78bfa]" : "opacity-0"}`}
                                  />
                                  <span className="truncate">{company.name}</span>
                                  <span className="mx-1 text-[#8e97be]">•</span>
                                  <span className="truncate text-xs text-[#8e97be]">{company.category}</span>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <p className="text-[10px] text-[#6c7396] mt-1">Only active approved companies can create feedback forms.</p>
                  </div>
                  <div>
                    <Label className="text-xs text-[#a5accb] mb-1.5 block">Product / Service <span className="text-[#F87171]">*</span></Label>
                    <Input
                      value={product}
                      onChange={(e) => setProduct(e.target.value)}
                      placeholder="e.g. TrustVox Pro"
                      className="bg-[#1a1f33] border-[#2b3150] text-[#f5f7ff] placeholder:text-[#6c7396]"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-[#a5accb] mb-1.5 block">Category <span className="text-[#F87171]">*</span></Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="bg-[#1a1f33] border-[#2b3150] text-[#f5f7ff] data-[placeholder]:text-[#8e97be]">
                        <SelectValue>{category || "Select category"}</SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-[#0f1426] border-[#3a4266] text-[#eef2ff] shadow-2xl">
                        {CATEGORIES.map((c) => (
                          <SelectItem
                            key={c}
                            value={c}
                            className="text-[#e8edff] focus:bg-[#8b5cf6]/25 focus:text-white data-[state=checked]:bg-[#8b5cf6]/20 data-[state=checked]:text-white"
                          >
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-[#a5accb] mb-1.5 block">Reward Per Completed Feedback (TVX) <span className="text-[#F87171]">*</span></Label>
                    <Input
                      type="number"
                      min={1}
                      step={1}
                      value={rewardTokens}
                      onChange={(e) => setRewardTokens(e.target.value)}
                      placeholder="e.g. 40"
                      className="bg-[#1a1f33] border-[#2b3150] text-[#f5f7ff] placeholder:text-[#6c7396]"
                    />
                    <p className="text-[10px] text-[#6c7396] mt-1">Users will receive exactly this TVX amount when they submit this campaign feedback.</p>
                  </div>
                </div>

                {(category === "Other" || category === "Others") && (
                  <div>
                    <Label className="text-xs text-[#a5accb] mb-1.5 block">Describe Product / Service (for AI templates) <span className="text-[#F87171]">*</span></Label>
                    <Textarea
                      value={otherCategoryDetails}
                      onChange={(e) => setOtherCategoryDetails(e.target.value)}
                      placeholder="Tell us briefly what your product/service does, target audience, and key goals…"
                      className="bg-[#1a1f33] border-[#2b3150] text-[#f5f7ff] placeholder:text-[#6c7396] min-h-[72px] resize-none"
                    />
                  </div>
                )}

                {/* Quick Templates Section */}
                <div className="pt-4 space-y-3">
                  <div>
                    <p className="text-xs text-[#a5accb] font-medium flex items-center gap-1.5 mb-3">
                      <Star size={12} className="text-[#F4A261]" />
                      Quick Start Templates
                    </p>
                    <div className="grid grid-cols-2 gap-2">
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
                          className="p-3 rounded-lg border border-[#2b3150] bg-[#0f1426]/50 hover:border-[#8b5cf6]/50 hover:bg-[#8b5cf6]/5 transition-all text-left"
                        >
                          <p className="text-xs font-medium text-[#f5f7ff] truncate">{template.name}</p>
                          <p className="text-[10px] text-[#6c7396] mt-1 truncate">{template.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#2b3150] space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs text-[#a5accb] font-medium flex items-center gap-1.5">
                        <Wand2 size={12} className="text-[#A78BFA]" />
                        AI Suggested Templates
                      </p>
                      <p className="text-[11px] text-[#6c7396] mt-0.5">
                        Generate domain-based form templates from your product and category.
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleGenerateTemplates}
                      disabled={isGeneratingTemplates}
                      className="border-[#A78BFA]/40 text-[#A78BFA] hover:bg-[#A78BFA]/10 hover:text-[#C4B5FD] text-xs gap-1.5"
                    >
                      <Wand2 size={12} />
                      {isGeneratingTemplates ? "Generating…" : "Generate Templates"}
                    </Button>
                  </div>

                  {templateSuggestions.length > 0 && (
                    <div className="grid gap-2">
                      {templateSuggestions.map((template) => (
                        <div key={template.id} className="rounded-xl border border-[#2b3150] bg-[#14182a] p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-[#f5f7ff] truncate">{template.name}</p>
                              <p className="text-xs text-[#a5accb] mt-0.5">{template.description}</p>
                              <div className="flex items-center gap-2 mt-2 flex-wrap">
                                <Badge variant="outline" className="text-[10px] border-[#8b5cf6]/30 text-[#8b5cf6]">
                                  {template.questions.length} questions
                                </Badge>
                                <Badge variant="outline" className="text-[10px] border-[#A78BFA]/30 text-[#A78BFA] capitalize">
                                  {template.domain}
                                </Badge>
                              </div>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => applyTemplateSuggestion(template)}
                              className="bg-[#8b5cf6]/15 hover:bg-[#8b5cf6]/25 text-[#8b5cf6] border border-[#8b5cf6]/30 text-xs px-3"
                              variant="ghost"
                            >
                              Use
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Questions Builder Section */}
            <section className="rounded-2xl border border-[#2b3150] bg-[#121526] p-7">
              {/* Section Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-7">
                <div>
                  <h2 className="text-base font-semibold text-[#f5f7ff] flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-[#A78BFA]/20 flex items-center justify-center text-[#A78BFA] text-xs font-bold">2</div>
                    Questions
                    <Badge variant="outline" className="border-[#2b3150] text-[#a5accb] text-xs ml-1">
                      {questions.length}
                    </Badge>
                  </h2>
                  <p className="text-xs text-[#6c7396] mt-1">Drag cards to reorder • Click to edit • Mark required questions</p>
                </div>
                <Button
                  size="sm"
                  onClick={addQuestion}
                  className="bg-[#8b5cf6] hover:bg-[#7c3aed] text-[#090b14] font-semibold text-xs gap-1.5 self-start sm:self-auto"
                >
                  <Plus size={14} />
                  Add Question
                </Button>
              </div>

              {/* Empty State */}
              {questions.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-[#8b5cf6]/30 bg-gradient-to-br from-[#8b5cf6]/10 via-[#0f1426]/50 to-[#0f1426]/50 p-10 md:p-12 text-center">
                  {/* Icon */}
                  <div className="flex justify-center mb-5">
                    <div className="w-16 h-16 rounded-full bg-[#8b5cf6]/15 flex items-center justify-center">
                      <List size={32} className="text-[#8b5cf6]" />
                    </div>
                  </div>
                  
                  {/* Content */}
                  <h3 className="text-base font-semibold text-[#f5f7ff] mb-2">Start Building Your Form</h3>
                  <p className="text-xs text-[#a5accb] mb-2">Add questions, set types, and collect meaningful feedback</p>
                  <p className="text-[10px] text-[#6c7396] mb-6">3 smart ways to get started:</p>
                  
                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
                    {/* Primary: Add Question */}
                    <Button
                      size="sm"
                      onClick={addQuestion}
                      className="bg-[#8b5cf6] hover:bg-[#7c3aed] text-[#090b14] font-semibold text-xs gap-1.5 flex-1 sm:flex-none"
                    >
                      <Plus size={14} />
                      Add Question
                    </Button>
                    
                    {/* Secondary: Use Template */}
                    {product && category && (
                      <Button
                        size="sm"
                        onClick={handleGenerateTemplates}
                        disabled={isGeneratingTemplates}
                        className="border-[#A78BFA]/40 text-[#A78BFA] hover:bg-[#A78BFA]/10 hover:text-[#C4B5FD] text-xs gap-1.5 flex-1 sm:flex-none"
                        variant="outline"
                      >
                        <Wand2 size={14} />
                        {isGeneratingTemplates ? "Generating…" : "AI Template"}
                      </Button>
                    )}
                    
                    {/* Tertiary: Quick Start */}
                    <button
                      onClick={() => {
                        const q1 = {
                          id: newQuestionId(),
                          type: "star-rating",
                          title: "How satisfied are you?",
                          required: true,
                          options: [],
                        }
                        const q2 = {
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
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-[#6c7396] hover:text-[#a5accb] hover:bg-[#2b3150]/40 transition-colors border border-[#2b3150] flex items-center justify-center gap-1.5 flex-1 sm:flex-none"
                    >
                      <Star size={14} />
                      Quick Start
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
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
                        className={`rounded-lg border transition-all ${
                          isExpanded
                            ? "border-[#8b5cf6]/50 bg-[#14182a] ring-1 ring-[#8b5cf6]/20"
                            : "border-[#2b3150] bg-[#1a1f33] hover:border-[#6c7396]/50 hover:bg-[#1e2438]"
                        } ${
                          draggingQuestionId === q.id
                            ? "opacity-50 ring-1 ring-[#8b5cf6]/50"
                            : ""
                        } ${
                          dragOverQuestionId === q.id && draggingQuestionId !== q.id
                            ? "border-[#A78BFA] bg-[#A78BFA]/5"
                            : ""
                        }`}
                      >
                        {/* Question Compact Header */}
                        <div
                          className="flex items-center gap-3 p-4 cursor-pointer select-none group"
                          onClick={() => setExpandedQuestion(isExpanded ? null : q.id)}
                        >
                          <GripVertical size={16} className="text-[#6c7396] group-hover:text-[#a5accb] shrink-0 cursor-grab active:cursor-grabbing" />
                          
                          {/* Question Info */}
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div className="w-7 h-7 rounded-md bg-[#8b5cf6]/15 flex items-center justify-center text-[#8b5cf6] shrink-0">
                              <QuestionTypeIcon type={q.type} size={13} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-[#d7ddf5] truncate">
                                {q.title ? `${idx + 1}. ${q.title}` : `${idx + 1}. Untitled question`}
                              </p>
                              {q.options.length > 0 && (
                                <p className="text-xs text-[#6c7396] mt-0.5">{q.options.length} options</p>
                              )}
                            </div>
                          </div>

                          {/* Question Meta & Actions */}
                          <div className="flex items-center gap-2 shrink-0 ml-auto">
                            {q.required && (
                              <Badge variant="outline" className="border-[#F87171]/30 text-[#F87171] text-[9px] px-1.5 py-0.5 whitespace-nowrap">
                                Required
                              </Badge>
                            )}
                            <Badge variant="outline" className="border-[#2b3150] text-[#6c7396] text-[9px] px-1.5 py-0.5 hidden sm:inline-flex whitespace-nowrap">
                              {qtMeta?.label}
                            </Badge>
                            
                            {/* Quick Actions */}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => { e.stopPropagation(); moveQuestion(q.id, -1) }}
                                disabled={idx === 0}
                                className="p-1.5 text-[#6c7396] hover:text-[#a5accb] hover:bg-[#2b3150]/40 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                title="Move up"
                              >
                                <ChevronUp size={14} />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); moveQuestion(q.id, 1) }}
                                disabled={idx === questions.length - 1}
                                className="p-1.5 text-[#6c7396] hover:text-[#a5accb] hover:bg-[#2b3150]/40 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                title="Move down"
                              >
                                <ChevronDown size={14} />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); removeQuestion(q.id) }}
                                className="p-1.5 text-[#6c7396] hover:text-[#F87171] hover:bg-[#F87171]/10 rounded transition-colors"
                                title="Delete question"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                            
                            {/* Expand Indicator */}
                            <div className="text-[#6c7396] group-hover:text-[#a5accb]">
                              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </div>
                          </div>
                        </div>

                        {/* Question Editor - Expanded */}
                        {isExpanded && (
                          <div className="px-4 pb-4 pt-2 space-y-4 border-t border-[#2b3150]">
                            {/* Title & Type Row */}
                            <div className="grid sm:grid-cols-2 gap-4">
                              <div>
                                <Label className="text-xs font-medium text-[#a5accb] mb-2 block">Question Title *</Label>
                                <Input
                                  value={q.title}
                                  onChange={(e) => updateQuestion(q.id, { title: e.target.value })}
                                  placeholder="e.g. How satisfied are you with our service?"
                                  className="bg-[#121526] border-[#2b3150] text-[#f5f7ff] placeholder:text-[#6c7396] text-sm"
                                />
                              </div>
                              <div>
                                <Label className="text-xs font-medium text-[#a5accb] mb-2 block">Question Type *</Label>
                                <Select
                                  value={q.type}
                                  onValueChange={(v) =>
                                    updateQuestion(q.id, {
                                      type: v,
                                      options: ["multiple-choice", "multi-select"].includes(v)
                                        ? q.options.length > 0 ? q.options : ["Option 1", "Option 2"]
                                        : [],
                                    })
                                  }
                                >
                                  <SelectTrigger className="bg-[#121526] border-[#2b3150] text-[#f5f7ff] text-sm data-[placeholder]:text-[#8e97be]">
                                    <SelectValue>{QUESTION_TYPES.find(t => t.value === q.type)?.label || q.type}</SelectValue>
                                  </SelectTrigger>
                                  <SelectContent className="bg-[#0f1426] border-[#3a4266] text-[#eef2ff] shadow-2xl">
                                    {QUESTION_TYPES.map((t) => (
                                      <SelectItem
                                        key={t.value}
                                        value={t.value}
                                        className="text-[#e8edff] text-sm focus:bg-[#8b5cf6]/25 focus:text-white data-[state=checked]:bg-[#8b5cf6]/20 data-[state=checked]:text-white"
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
                              <div className="rounded-lg bg-[#0f1426]/50 border border-[#2b3150] p-3">
                                <Label className="text-xs font-medium text-[#a5accb] mb-3 block">Answer Options</Label>
                                <div className="space-y-2.5">
                                  {q.options.map((opt, oi) => (
                                    <div key={oi} className="flex items-center gap-2.5">
                                      <div className="w-6 h-6 rounded-md border border-[#2b3150] bg-[#121526] flex items-center justify-center text-xs font-medium text-[#6c7396] shrink-0">
                                        {oi + 1}
                                      </div>
                                      <Input
                                        value={opt}
                                        onChange={(e) => updateOption(q.id, oi, e.target.value)}
                                        className="bg-[#121526] border-[#2b3150] text-[#f5f7ff] placeholder:text-[#6c7396] text-sm h-9 flex-1"
                                        placeholder={`Option ${oi + 1}`}
                                      />
                                      <button
                                        onClick={() => removeOption(q.id, oi)}
                                        className="p-1.5 text-[#6c7396] hover:text-[#F87171] hover:bg-[#F87171]/10 rounded transition-colors shrink-0"
                                        title="Remove option"
                                      >
                                        <X size={14} />
                                      </button>
                                    </div>
                                  ))}
                                  <button
                                    onClick={() => addOption(q.id)}
                                    className="flex items-center gap-1.5 text-xs text-[#8b5cf6] hover:text-[#7c3aed] transition-colors mt-2"
                                  >
                                    <Plus size={12} />
                                    Add Option
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Required & Settings */}
                            <div className="flex items-center justify-between pt-2 border-t border-[#2b3150]">
                              <div>
                                <Label className="text-xs font-medium text-[#a5accb]">Mark as Required</Label>
                                <p className="text-[11px] text-[#6c7396] mt-0.5">Respondents must answer this question</p>
                              </div>
                              <Switch
                                checked={q.required}
                                onCheckedChange={(v) => updateQuestion(q.id, { required: v })}
                                className="data-[state=checked]:bg-[#8b5cf6]"
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
          <aside className="space-y-5">
            {/* Form Settings Card */}
            <div className="rounded-2xl border border-[#2b3150] bg-[#121526] p-6">
              <h3 className="text-sm font-semibold text-[#f5f7ff] mb-5 flex items-center gap-2">
                <Settings size={14} className="text-[#8b5cf6]" />
                Form Settings
              </h3>
              <div className="space-y-5">
                {/* Visibility */}
                <div>
                  <Label className="text-xs font-medium text-[#a5accb] mb-2 block">Visibility</Label>
                  <Select value={formVisibility} onValueChange={setFormVisibility}>
                    <SelectTrigger className="bg-[#0f1426] border-[#2b3150] text-[#f5f7ff] text-sm h-8">
                      <SelectValue>{formVisibility.charAt(0).toUpperCase() + formVisibility.slice(1)}</SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-[#0f1426] border-[#3a4266] text-[#eef2ff]">
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
                  <p className="text-[10px] text-[#6c7396] mt-1">Who can access this form</p>
                </div>

                {/* Response Limit */}
                <div>
                  <Label className="text-xs font-medium text-[#a5accb] mb-2 block">Response Limit (Optional)</Label>
                  <Input
                    type="number"
                    value={responseLimit}
                    onChange={(e) => setResponseLimit(e.target.value)}
                    placeholder="e.g., 100"
                    className="bg-[#0f1426] border-[#2b3150] text-[#f5f7ff] placeholder:text-[#6c7396] text-sm h-8"
                  />
                  <p className="text-[10px] text-[#6c7396] mt-1">Close form after X responses</p>
                </div>

                {/* Anonymous Toggle */}
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <p className="text-xs font-medium text-[#a5accb]">Anonymous Responses</p>
                    <p className="text-[10px] text-[#6c7396] mt-0.5">Don't collect respondent info</p>
                  </div>
                  <Switch
                    checked={allowAnonymous}
                    onCheckedChange={setAllowAnonymous}
                    className="data-[state=checked]:bg-[#8b5cf6]"
                  />
                </div>

                {/* Ratings Summary Toggle */}
                <div className="flex items-center justify-between pt-1 border-t border-[#2b3150]">
                  <div>
                    <p className="text-xs font-medium text-[#a5accb]">Show Rating Stats</p>
                    <p className="text-[10px] text-[#6c7396] mt-0.5">Display average ratings</p>
                  </div>
                  <Switch
                    checked={enableRatings}
                    onCheckedChange={setEnableRatings}
                    className="data-[state=checked]:bg-[#8b5cf6]"
                  />
                </div>

                {/* Auto Close Date */}
                <div>
                  <Label className="text-xs font-medium text-[#a5accb] mb-2 block">Auto Close Date (Optional)</Label>
                  <Input
                    type="date"
                    value={autoCloseDate}
                    onChange={(e) => setAutoCloseDate(e.target.value)}
                    className="bg-[#0f1426] border-[#2b3150] text-[#f5f7ff] text-sm h-8"
                  />
                  <p className="text-[10px] text-[#6c7396] mt-1">Form closes automatically</p>
                </div>
              </div>
            </div>

            {/* Tips card */}
            <div className="rounded-2xl border border-[#2b3150] bg-[#121526] p-6">
              <h3 className="text-sm font-semibold text-[#f5f7ff] mb-4 flex items-center gap-2">
                <Sparkles size={14} className="text-[#A78BFA]" />
                Tips
              </h3>
              <ul className="space-y-3 text-xs text-[#a5accb]">
                <li className="flex gap-2">
                  <span className="text-[#8b5cf6] shrink-0">•</span>
                  Keep forms concise — 5–8 questions is ideal
                </li>
                <li className="flex gap-2">
                  <span className="text-[#8b5cf6] shrink-0">•</span>
                  Use Star Rating for quick satisfaction scores
                </li>
                <li className="flex gap-2">
                  <span className="text-[#8b5cf6] shrink-0">•</span>
                  Use Multi-Select for quick attribute checks
                </li>
                <li className="flex gap-2">
                  <span className="text-[#8b5cf6] shrink-0">•</span>
                  Add a Long Text for open-ended insights
                </li>
              </ul>
            </div>

            {/* Actions card - Now at bottom, no sticky */}
            <div className="rounded-2xl border border-[#2b3150] bg-[#121526] p-6">
              <h3 className="text-sm font-semibold text-[#f5f7ff] mb-5">Actions</h3>
              <div className="space-y-3">
                <Button
                  className="w-full bg-[#8b5cf6] hover:bg-[#7c3aed] text-[#090b14] font-semibold gap-2"
                  onClick={handleSubmitToAdmin}
                  disabled={submitState !== "idle"}
                >
                  <Send size={16} />
                  {submitState === "loading" ? "Submitting…" : submitState === "done" ? "Submitted ✓" : "Submit to Admin"}
                </Button>
                <Button
                  variant="outline"
                  className="w-full border-[#2b3150] text-[#a5accb] hover:text-[#8b5cf6] hover:border-[#8b5cf6]/50 gap-2"
                  onClick={handleSaveDraft}
                  disabled={savingState === "saving"}
                >
                  <Save size={16} />
                  {savingState === "saving" ? "Saving…" : savingState === "saved" ? "Saved ✓" : "Save as Draft"}
                </Button>
                <Button
                  variant="ghost"
                  className="w-full text-[#a5accb] hover:text-[#8b5cf6] gap-2"
                  onClick={() => { setPreviewAnswers({}); setPreviewOpen(true) }}
                >
                  <Eye size={16} />
                  Preview Form
                </Button>
              </div>

              {/* Quick stats */}
              <div className="mt-5 pt-4 border-t border-[#2b3150] space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-[#6c7396]">Questions</span>
                  <span className="text-[#a5accb]">{questions.length}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#6c7396]">Required</span>
                  <span className="text-[#a5accb]">{questions.filter((q) => q.required).length}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#6c7396]">Status</span>
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 border-[#6c7396]/40 text-[#a5accb]"
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
          <div className="rounded-2xl border border-[#2b3150] bg-[#121526] p-8 space-y-6">
            {/* Form Header */}
            <div className="pb-6 border-b border-[#2b3150]">
              <h1 className="text-2xl font-semibold text-[#f5f7ff] mb-2">
                {title || <span className="text-[#6c7396] italic">Untitled Form</span>}
              </h1>
              {description && (
                <p className="text-sm text-[#a5accb] mt-2">{description}</p>
              )}
              <div className="flex items-center gap-2 mt-4 flex-wrap">
                {product && (
                  <Badge className="bg-[#8b5cf6]/15 text-[#8b5cf6] border border-[#8b5cf6]/30 text-xs">
                    {product}
                  </Badge>
                )}
                {category && (
                  <Badge variant="outline" className="border-[#2b3150] text-[#a5accb] text-xs">
                    {category}
                  </Badge>
                )}
                {responseLimit && (
                  <Badge variant="outline" className="border-[#2b3150] text-[#a5accb] text-xs">
                    Limit: {responseLimit}
                  </Badge>
                )}
                {autoCloseDate && (
                  <Badge variant="outline" className="border-[#2b3150] text-[#a5accb] text-xs">
                    Closes: {autoCloseDate}
                  </Badge>
                )}
              </div>
            </div>

            {/* Questions Preview */}
            {questions.length === 0 ? (
              <div className="text-center py-12">
                <List size={32} className="mx-auto mb-3 opacity-30 text-[#6c7396]" />
                <p className="text-sm text-[#a5accb]">No questions added yet</p>
              </div>
            ) : (
              <div className="space-y-6">
                {questions.map((q, idx) => (
                  <div key={q.id} className="space-y-3 pb-6 border-b border-[#2b3150] last:border-0 last:pb-0">
                    <div className="flex items-start gap-3">
                      <span className="text-xs font-semibold text-[#8b5cf6] mt-1 shrink-0 w-5">{idx + 1}.</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-[#f5f7ff]">
                          {q.title}
                          {q.required && (
                            <span className="text-[#F87171] ml-1">*</span>
                          )}
                        </p>
                        {q.type === "star-rating" && (
                          <div className="flex gap-1 mt-3">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                className="p-1 text-[#6c7396] hover:text-[#F4A261] transition-colors"
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
                            className="w-full mt-3 bg-[#0f1426] border border-[#2b3150] rounded-lg px-3 py-2 text-sm text-[#6c7396]"
                          />
                        )}
                        {q.type === "text-long" && (
                          <textarea
                            placeholder="Your answer…"
                            disabled
                            className="w-full mt-3 bg-[#0f1426] border border-[#2b3150] rounded-lg px-3 py-2 text-sm text-[#6c7396] min-h-20"
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
                                <span className="text-sm text-[#a5accb]">{opt}</span>
                              </label>
                            ))}
                          </div>
                        )}
                        {q.type === "voice-feedback" && (
                          <button disabled className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0f1426] border border-[#2b3150] text-sm text-[#a5accb]">
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
                <Button className="w-full bg-[#8b5cf6] hover:bg-[#7c3aed] text-[#090b14] font-semibold gap-2" disabled>
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
        <DialogContent className="bg-[#121526] border-[#2b3150] max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#f5f7ff] flex items-center gap-2">
              <Eye size={18} className="text-[#8b5cf6]" />
              Form Preview
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 mt-2">
            {/* Form header */}
            <div className="rounded-xl bg-[#14182a] p-4 border border-[#2b3150]">
              <h3 className="text-base font-semibold text-[#f5f7ff]">
                {title || <span className="text-[#6c7396] italic">Untitled Form</span>}
              </h3>
              {description && (
                <p className="text-sm text-[#a5accb] mt-1">{description}</p>
              )}
              <div className="flex items-center gap-3 mt-3">
                {product && (
                  <Badge variant="outline" className="border-[#8b5cf6]/30 text-[#8b5cf6] text-xs">
                    {product}
                  </Badge>
                )}
                {category && (
                  <Badge variant="outline" className="border-[#2b3150] text-[#a5accb] text-xs">
                    {category}
                  </Badge>
                )}
                {responseLimit && (
                  <Badge variant="outline" className="border-[#2b3150] text-[#a5accb] text-xs">
                    Limit: {responseLimit}
                  </Badge>
                )}
                {autoCloseDate && (
                  <Badge variant="outline" className="border-[#2b3150] text-[#a5accb] text-xs">
                    Closes: {autoCloseDate}
                  </Badge>
                )}
              </div>
            </div>

            {questions.length === 0 ? (
              <p className="text-center text-sm text-[#6c7396] py-6">
                No questions added yet.
              </p>
            ) : (
              questions.map((q) => (
                <div key={q.id} className="rounded-xl bg-[#14182a] p-4 border border-[#2b3150]">
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
              <Button className="w-full bg-[#8b5cf6] hover:bg-[#7c3aed] text-[#090b14] font-semibold">
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
      <div className="min-h-screen app-page bg-[#090b14] flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-[#8b5cf6]/30 border-t-[#8b5cf6] animate-spin" />
      </div>
    }>
      <CreateFeedbackInner />
    </Suspense>
  )
}

