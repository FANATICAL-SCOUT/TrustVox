"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { useRouter, useParams } from "next/navigation"
import {
  Star, ArrowLeft, ArrowRight, Check, AlertCircle, Mic, MicOff,
  Sparkles, Send, CheckCircle2, MessageSquare,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  getFormById,
  addResponse,
  hasUserSubmittedForm,
  subscribeToFormsUpdates,
  type FeedbackForm,
  type Question,
} from "@/lib/feedback-store"
import { subscribeToApprovedCompanies } from "@/lib/approved-company-store"
import { consumeFeedbackQuota, getFeedbackQuota } from "@/lib/feedback-quota"
import { recordFeedbackSubmittedNotification } from "@/lib/user-notifications"
import { addTVXReward } from "@/lib/tvx-wallet"

type AnswerValue = string | number | string[]

type SpeechRecognitionResultLike = ArrayLike<{ transcript: string }>
type SpeechRecognitionEventLike = { results: ArrayLike<SpeechRecognitionResultLike> }
type SpeechRecognitionInstance = {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  start: () => void
  stop: () => void
}
type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance
type SpeechRecognitionWindow = Window & typeof globalThis & {
  SpeechRecognition?: SpeechRecognitionConstructor
  webkitSpeechRecognition?: SpeechRecognitionConstructor
}

function resolveCurrentUserId() {
  if (typeof window === "undefined") return "anonymous"

  try {
    const currentUserRaw = localStorage.getItem("currentUser")
    if (currentUserRaw) {
      const parsed = JSON.parse(currentUserRaw) as { email?: string; name?: string }
      const fromCurrentUser = String(parsed.email || parsed.name || "").trim().toLowerCase()
      if (fromCurrentUser) return fromCurrentUser
    }

    const userEmail = String(localStorage.getItem("userEmail") || "").trim().toLowerCase()
    if (userEmail) return userEmail

    return "anonymous"
  } catch {
    return "anonymous"
  }
}

// ── Star Rating ────────────────────────────────────────────────────────────────
function StarRating({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const [hover, setHover] = useState(0)
  const labels = ["", "Poor", "Fair", "Good", "Great", "Excellent"]
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            onMouseEnter={() => setHover(s)}
            onMouseLeave={() => setHover(0)}
            className="focus:outline-none transition-transform hover:scale-110 active:scale-95"
          >
            <Star
              size={32}
              className={`transition-colors ${
                s <= (hover || value)
                  ? "fill-[#FBBF24] text-[#FBBF24]"
                  : "text-[#30363D]"
              }`}
            />
          </button>
        ))}
      </div>
      {(hover || value) > 0 && (
        <span className="text-sm font-medium text-[#FBBF24]">
          {labels[hover || value]}
        </span>
      )}
    </div>
  )
}

// ── Voice Input ────────────────────────────────────────────────────────────────
function VoiceInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [recording, setRecording] = useState(false)
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const supportsSpeech = useMemo(
    () => {
      if (typeof window === "undefined") return false
      const browserWindow = window as SpeechRecognitionWindow
      return Boolean(browserWindow.SpeechRecognition || browserWindow.webkitSpeechRecognition)
    },
    []
  )

  function startRecording() {
    if (!supportsSpeech) return
    const browserWindow = window as SpeechRecognitionWindow
    const SR = browserWindow.SpeechRecognition || browserWindow.webkitSpeechRecognition
    if (!SR) return
    const rec = new SR()
    rec.continuous = true
    rec.interimResults = true
    rec.lang = "en-US"
    rec.onresult = (e: SpeechRecognitionEventLike) => {
      let transcript = ""
      for (let i = 0; i < e.results.length; i++) transcript += e.results[i][0].transcript
      onChange(transcript)
    }
    rec.start()
    recognitionRef.current = rec
    setRecording(true)
  }

  function stopRecording() {
    recognitionRef.current?.stop()
    setRecording(false)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={recording ? stopRecording : startRecording}
          disabled={!supportsSpeech}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border ${
            recording
              ? "bg-[#F87171]/20 border-[#F87171]/40 text-[#F87171] animate-pulse"
              : supportsSpeech
              ? "bg-[#2DD4BF]/10 border-[#2DD4BF]/30 text-[#2DD4BF] hover:bg-[#2DD4BF]/20"
              : "bg-[#21262D] border-[#30363D] text-[#484F58] cursor-not-allowed"
          }`}
        >
          {recording ? <MicOff size={16} /> : <Mic size={16} />}
          {recording ? "Stop Recording" : "Start Recording"}
        </button>

        {recording && (
          <div className="flex items-end gap-1 h-8">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-1.5 rounded-full bg-[#F87171] animate-bounce"
                style={{ height: `${12 + i * 4}px`, animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        )}

        {!supportsSpeech && (
          <span className="text-xs text-[#484F58]">Not supported in this browser</span>
        )}
      </div>

      {value && (
        <div className="p-3 rounded-lg bg-[#1C2333] border border-[#30363D] text-sm text-[#C9D1D9] whitespace-pre-wrap">
          {value}
        </div>
      )}
    </div>
  )
}

// ── Question Renderer ──────────────────────────────────────────────────────────
function QuestionField({
  question,
  value,
  onChange,
  error,
}: {
  question: Question
  value: AnswerValue | undefined
  onChange: (value: AnswerValue) => void
  error?: string
}) {
  const { type, title, required, options } = question
  const textValue = typeof value === "string" || typeof value === "number" ? String(value) : ""
  const ratingValue = typeof value === "number" ? value : 0
  const selectedValues = Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : []

  const fieldClass = error
    ? "border-[#F87171]/60 bg-[#21262D] text-[#F0F6FC] placeholder:text-[#484F58]"
    : "border-[#30363D] bg-[#21262D] text-[#F0F6FC] placeholder:text-[#484F58]"

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-[#C9D1D9]">
        {title}
        {required && <span className="text-[#F87171] ml-1">*</span>}
      </label>

      {type === "star-rating" && (
        <StarRating value={ratingValue} onChange={onChange} />
      )}

      {type === "text-short" && (
        <Input
          value={textValue}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type your answer…"
          className={fieldClass}
        />
      )}

      {type === "text-long" && (
        <Textarea
          value={textValue}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Share your thoughts…"
          className={`${fieldClass} min-h-[100px] resize-none`}
        />
      )}

      {type === "multiple-choice" && (
        <div className="space-y-2">
          {options.map((opt: string) => (
            <label key={opt} className="flex items-center gap-3 cursor-pointer group p-2.5 rounded-lg hover:bg-[#1C2333] transition-colors">
              <div
                onClick={() => onChange(opt)}
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                  textValue === opt
                    ? "border-[#2DD4BF] bg-[#2DD4BF]"
                    : "border-[#484F58] group-hover:border-[#2DD4BF]/60"
                }`}
              >
                {textValue === opt && <div className="w-2 h-2 bg-[#0D1117] rounded-full" />}
              </div>
              <span className={`text-sm ${textValue === opt ? "text-[#F0F6FC]" : "text-[#8B949E]"}`}>{opt}</span>
            </label>
          ))}
        </div>
      )}

      {type === "multi-select" && (
        <div className="space-y-2">
          {options.map((opt: string) => {
            const selected = selectedValues.includes(opt)
            return (
              <label key={opt} className="flex items-center gap-3 cursor-pointer group p-2.5 rounded-lg hover:bg-[#1C2333] transition-colors">
                <div
                  onClick={() =>
                    onChange(
                      selected
                        ? selectedValues.filter((v: string) => v !== opt)
                        : [...selectedValues, opt]
                    )
                  }
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                    selected
                      ? "border-[#2DD4BF] bg-[#2DD4BF]"
                      : "border-[#484F58] group-hover:border-[#2DD4BF]/60"
                  }`}
                >
                  {selected && <Check size={11} className="text-[#0D1117]" />}
                </div>
                <span className={`text-sm ${selected ? "text-[#F0F6FC]" : "text-[#8B949E]"}`}>{opt}</span>
              </label>
            )
          })}
        </div>
      )}

      {type === "tag-selection" && (
        <div className="flex flex-wrap gap-2">
          {options.map((opt: string) => {
            const active = selectedValues.includes(opt)
            return (
              <button
                key={opt}
                type="button"
                onClick={() =>
                  onChange(
                    active
                      ? selectedValues.filter((v: string) => v !== opt)
                      : [...selectedValues, opt]
                  )
                }
                className={`px-3 py-2 rounded-full text-sm font-medium transition-all border ${
                  active
                    ? "bg-[#2DD4BF]/20 border-[#2DD4BF] text-[#2DD4BF]"
                    : "bg-[#21262D] border-[#30363D] text-[#8B949E] hover:border-[#2DD4BF]/50 hover:text-[#C9D1D9]"
                }`}
              >
                {opt}
              </button>
            )
          })}
        </div>
      )}

      {type === "voice-feedback" && (
        <VoiceInput value={textValue} onChange={onChange} />
      )}

      {error && (
        <p className="text-xs text-[#F87171] flex items-center gap-1">
          <AlertCircle size={11} />
          {error}
        </p>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function FeedbackSubmitPage() {
  const router  = useRouter()
  const params  = useParams()
  const routeId = params?.id
  const id      = Array.isArray(routeId) ? routeId[0] : routeId

  const [form,      setForm]      = useState<FeedbackForm | null>(null)
  const [answers,   setAnswers]   = useState<Record<string, AnswerValue>>({})
  const [errors,    setErrors]    = useState<Record<string, string | undefined>>({})
  const [step,      setStep]      = useState(0)  // current question index
  const [submitted, setSubmitted] = useState(false)
  const [submitting,setSubmitting]= useState(false)
  const [notFound,  setNotFound]  = useState(false)
  const [alreadySubmitted, setAlreadySubmitted] = useState(false)
  const [quotaError, setQuotaError] = useState("")

  useEffect(() => {
    if (!id) return

    const loadForm = (reason = "manual") => {
      const found = getFormById(id)
      const isApproved = Boolean(found && String(found.status).toLowerCase() === "approved")

      console.debug("[TrustVoxFlow] user-open-form", {
        reason,
        formId: id,
        found: Boolean(found),
        status: found?.status,
        companyId: found?.companyId,
        clientName: found?.clientName,
        isApproved,
      })

      if (!isApproved) {
        setNotFound(true)
        setForm(null)
        return
      }

      const closeAt = found?.autoCloseDate ? Date.parse(found.autoCloseDate) : NaN
      const isClosedByDate = !Number.isNaN(closeAt) && Date.now() > closeAt
      const reachedResponseLimit = Boolean(
        found?.responseLimit && found.responseCount >= found.responseLimit
      )

      if (isClosedByDate || reachedResponseLimit) {
        setNotFound(true)
        setForm(null)
        return
      }

      const userId = resolveCurrentUserId()
      const alreadyFilled = hasUserSubmittedForm(id, userId)

      if (alreadyFilled) {
        setAlreadySubmitted(true)
        setNotFound(false)
        setForm(found || null)
        return
      }

      setAlreadySubmitted(false)
      setNotFound(false)
      setForm(found || null)
    }

    loadForm("mount")
    const unsubscribeForms = subscribeToFormsUpdates(() => loadForm("forms-updated"))
    const unsubscribeCompanies = subscribeToApprovedCompanies(() => loadForm("companies-updated"))

    const handleFocus = () => loadForm("window-focus")
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        loadForm("tab-visible")
      }
    }

    window.addEventListener("focus", handleFocus)
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      unsubscribeForms()
      unsubscribeCompanies()
      window.removeEventListener("focus", handleFocus)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [id])

  function setAnswer(qid: string, val: AnswerValue) {
    setAnswers((prev) => ({ ...prev, [qid]: val }))
    setErrors((prev)  => ({ ...prev, [qid]: undefined }))
  }

  function validateCurrent() {
    if (!form) return true
    const q = form.questions[step]
    if (!q) return true
    if (q.required) {
      const val = answers[q.id]
      if (val === undefined || val === null || val === "" || (Array.isArray(val) && val.length === 0)) {
        setErrors((prev) => ({ ...prev, [q.id]: "This question is required." }))
        return false
      }
    }
    return true
  }

  function handleNext() {
    if (!validateCurrent()) return
    setStep((s) => s + 1)
  }

  function handleBack() {
    setStep((s) => Math.max(0, s - 1))
  }

  async function handleSubmit() {
    if (!validateCurrent() || !form) return

    const closeAt = form.autoCloseDate ? Date.parse(form.autoCloseDate) : NaN
    if (!Number.isNaN(closeAt) && Date.now() > closeAt) {
      setQuotaError("This feedback form is closed (auto close date reached).")
      return
    }

    if (form.responseLimit && form.responseCount >= form.responseLimit) {
      setQuotaError("This feedback form reached its response limit.")
      return
    }

    const userId = resolveCurrentUserId()
    if (hasUserSubmittedForm(form.id, userId)) {
      setQuotaError("Blocked: you can submit each feedback form only once per account.")
      return
    }

    const quota = getFeedbackQuota()
    if (!quota.canSubmit) {
      setQuotaError("You have reached your daily feedback limit (3). Please try again tomorrow.")
      return
    }

    setQuotaError("")
    setSubmitting(true)
    await new Promise((r) => setTimeout(r, 800))
    const rewardTokens = Math.max(1, Math.floor(Number(form.rewardTokens) || 0))
    let response

    try {
      response = addResponse(form.id, answers, { userId, rewardTokens })
    } catch {
      setSubmitting(false)
      setQuotaError("Blocked: you can submit each feedback form only once per account.")
      return
    }
    consumeFeedbackQuota()
    recordFeedbackSubmittedNotification(rewardTokens)
    addTVXReward(rewardTokens, `Feedback submitted for "${form.title}"`, {
      referenceId: `feedback-reward:${response.id}`,
    })
    setSubmitting(false)
    setSubmitted(true)
  }

  // ── Not found ────────────────────────────────────────────────────────────────
  if (notFound) {
    return (
      <div className="min-h-screen app-page bg-[#0D1117] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#161B22] border border-[#30363D] flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={28} className="text-[#484F58]" />
          </div>
          <h2 className="text-lg font-semibold text-[#8B949E] mb-2">Form not found</h2>
          <p className="text-sm text-[#484F58] mb-6">This feedback form doesn't exist or is no longer active.</p>
          <Button
            onClick={() => router.push("/user/feedbacks")}
            className="bg-[#2DD4BF] hover:bg-[#14B8A6] text-[#0D1117] font-semibold"
          >
            Browse Forms
          </Button>
        </div>
      </div>
    )
  }

  if (alreadySubmitted && form) {
    return (
      <div className="min-h-screen app-page bg-[#0D1117] flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-[#1B1414] border border-[#F87171]/30 flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={28} className="text-[#FCA5A5]" />
          </div>
          <h2 className="text-lg font-semibold text-[#FCA5A5] mb-2">Submission blocked</h2>
          <p className="text-sm text-[#8B949E] mb-2">You already submitted this feedback form for your account.</p>
          <p className="text-xs text-[#6B7280] mb-6">Rule: one feedback submission per form per account.</p>
          <div className="flex flex-col gap-3">
            <Button
              onClick={() => router.push("/user/feedbacks")}
              className="bg-[#2DD4BF] hover:bg-[#14B8A6] text-[#0D1117] font-semibold"
            >
              Browse Other Feedbacks
            </Button>
            <Button
              variant="ghost"
              className="text-[#8B949E] hover:text-[#F0F6FC]"
              onClick={() => router.push("/dashboard")}
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!form) {
    return (
      <div className="min-h-screen app-page bg-[#0D1117] flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-[#2DD4BF]/30 border-t-[#2DD4BF] animate-spin" />
      </div>
    )
  }

  const totalQ = form.questions.length
  const progress = totalQ > 0 ? Math.round(((step) / totalQ) * 100) : 0
  const currentQ = form.questions[step]
  const isLastQ  = step === totalQ - 1

  // ── Success screen ────────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen app-page bg-[#0D1117] flex items-center justify-center p-4">
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#2DD4BF]/8 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#A78BFA]/8 rounded-full blur-3xl" />
        </div>
        <div className="relative text-center max-w-sm">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#2DD4BF] to-[#A78BFA] flex items-center justify-center mx-auto mb-6 shadow-2xl">
            <CheckCircle2 size={36} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold text-[#F0F6FC] mb-2">Thank you!</h2>
          <p className="text-[#8B949E] mb-2">{form.title}</p>
          <p className="text-sm text-[#484F58] mb-8">
            Your feedback has been submitted. It means a lot to us!
          </p>
          <div className="flex flex-col gap-3">
            <Button
              className="bg-[#2DD4BF] hover:bg-[#14B8A6] text-[#0D1117] font-semibold"
              onClick={() => router.push("/user/feedbacks")}
            >
              Give More Feedback
            </Button>
            <Button
              variant="ghost"
              className="text-[#8B949E] hover:text-[#F0F6FC]"
              onClick={() => router.push("/dashboard")}
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen app-page bg-[#0D1117] relative">
      {/* Ambient */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-0 right-1/3 w-80 h-80 bg-[#2DD4BF]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-[#A78BFA]/5 rounded-full blur-3xl" />
      </div>

      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-[#30363D] bg-[#0D1117]/80 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => router.push("/user/feedbacks")}
            className="flex items-center gap-2 text-sm text-[#8B949E] hover:text-[#2DD4BF] transition-colors"
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <div className="flex items-center gap-2">
            <MessageSquare size={14} className="text-[#2DD4BF]" />
            <span className="text-sm text-[#8B949E]">
              {step + 1} <span className="text-[#484F58]">/ {totalQ}</span>
            </span>
          </div>
          <Badge variant="outline" className="border-[#30363D] text-[#484F58] text-xs">
            {form.category}
          </Badge>
        </div>
      </header>

      {/* Progress bar */}
      <div className="h-1 bg-[#21262D]">
        <div
          className="h-full bg-gradient-to-r from-[#2DD4BF] to-[#A78BFA] transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <main className="max-w-2xl mx-auto px-4 py-8 relative z-10">
        {/* Form header — only on first question */}
        {step === 0 && (
          <div className="mb-8 p-5 rounded-2xl bg-[#161B22] border border-[#30363D]">
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="outline" className="border-[#2DD4BF]/30 text-[#2DD4BF] text-xs">
                {form.product}
              </Badge>
              <Badge variant="outline" className="border-[#30363D] text-[#8B949E] text-xs">
                {form.category}
              </Badge>
            </div>
            <h1 className="text-xl font-bold text-[#F0F6FC]">{form.title}</h1>
            {form.description && (
              <p className="text-sm text-[#8B949E] mt-2">{form.description}</p>
            )}
            <p className="text-xs text-[#484F58] mt-3 flex items-center gap-1">
              <Sparkles size={11} className="text-[#A78BFA]" />
              {totalQ} question{totalQ !== 1 ? "s" : ""} · Takes ~{Math.ceil(totalQ * 0.5)} min
            </p>
          </div>
        )}

        {/* Question card */}
        {currentQ && (
          <div className="rounded-2xl border border-[#30363D] bg-[#161B22] p-6 mb-6">
            <div className="flex items-center gap-2 mb-5">
              <span className="w-6 h-6 rounded-full bg-[#2DD4BF]/20 flex items-center justify-center text-[#2DD4BF] text-xs font-bold shrink-0">
                {step + 1}
              </span>
              <div className="h-px flex-1 bg-[#30363D]" />
              <span className="text-xs text-[#484F58]">of {totalQ}</span>
            </div>
            <QuestionField
              question={currentQ}
              value={answers[currentQ.id]}
              onChange={(val) => setAnswer(currentQ.id, val)}
              error={errors[currentQ.id]}
            />
          </div>
        )}

        {/* Navigation */}
        {quotaError && (
          <div className="mb-4 p-3 rounded-lg border border-[#F87171]/40 bg-[#F87171]/10 text-[#F87171] text-sm">
            {quotaError}
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={step === 0}
            className="text-[#8B949E] hover:text-[#F0F6FC] disabled:opacity-30 gap-2"
          >
            <ArrowLeft size={16} />
            Previous
          </Button>

          {isLastQ ? (
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-[#2DD4BF] hover:bg-[#14B8A6] text-[#0D1117] font-bold gap-2 px-6"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-[#0D1117]/30 border-t-[#0D1117] animate-spin" />
                  Submitting…
                </>
              ) : (
                <>
                  <Send size={16} />
                  Submit Feedback
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              className="bg-[#2DD4BF] hover:bg-[#14B8A6] text-[#0D1117] font-semibold gap-2"
            >
              Next
              <ArrowRight size={16} />
            </Button>
          )}
        </div>

        {/* Dots progress */}
        <div className="flex justify-center items-center gap-1.5 mt-8">
          {form.questions.map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-300 ${
                i === step
                  ? "w-6 h-2 bg-[#2DD4BF]"
                  : i < step
                  ? "w-2 h-2 bg-[#2DD4BF]/40"
                  : "w-2 h-2 bg-[#30363D]"
              }`}
            />
          ))}
        </div>
      </main>
    </div>
  )
}
