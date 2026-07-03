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
            className="transition-transform hover:scale-110 active:scale-95 focus:outline-none"
          >
            <Star
              size={32}
              className={`transition-colors ${
                s <= (hover || value)
                  ? "fill-gold text-gold"
                  : "text-white/15"
              }`}
            />
          </button>
        ))}
      </div>
      {(hover || value) > 0 && (
        <span className="text-sm font-medium text-gold">
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
          className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
            recording
              ? "animate-pulse border-destructive/40 bg-destructive/10 text-destructive"
              : supportsSpeech
              ? "border-gold/30 bg-gold/10 text-gold hover:bg-gold/20"
              : "cursor-not-allowed border-white/10 bg-white/[0.03] text-ink-muted"
          }`}
        >
          {recording ? <MicOff size={16} /> : <Mic size={16} />}
          {recording ? "Stop Recording" : "Start Recording"}
        </button>

        {recording && (
          <div className="flex h-8 items-end gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-1.5 animate-bounce rounded-full bg-destructive"
                style={{ height: `${12 + i * 4}px`, animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        )}

        {!supportsSpeech && (
          <span className="text-xs text-ink-muted">Not supported in this browser</span>
        )}
      </div>

      {value && (
        <div className="whitespace-pre-wrap rounded-lg border border-white/[0.07] bg-white/[0.02] p-3 text-sm text-ink-dim">
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
    ? "border-destructive/60 bg-white/[0.03] text-ink placeholder:text-ink-muted"
    : "border-white/[0.08] bg-white/[0.03] text-ink placeholder:text-ink-muted focus-visible:border-gold/50 focus-visible:ring-gold/20"

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-ink-dim">
        {title}
        {required && <span className="ml-1 text-destructive">*</span>}
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
            <label key={opt} className="group flex cursor-pointer items-center gap-3 rounded-lg p-2.5 transition-colors hover:bg-white/5">
              <div
                onClick={() => onChange(opt)}
                className={`flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 transition-all ${
                  textValue === opt
                    ? "border-gold bg-gold"
                    : "border-white/20 group-hover:border-gold/60"
                }`}
              >
                {textValue === opt && <div className="h-2 w-2 rounded-full bg-[#241a06]" />}
              </div>
              <span className={`text-sm ${textValue === opt ? "text-ink" : "text-ink-muted"}`}>{opt}</span>
            </label>
          ))}
        </div>
      )}

      {type === "multi-select" && (
        <div className="space-y-2">
          {options.map((opt: string) => {
            const selected = selectedValues.includes(opt)
            return (
              <label key={opt} className="group flex cursor-pointer items-center gap-3 rounded-lg p-2.5 transition-colors hover:bg-white/5">
                <div
                  onClick={() =>
                    onChange(
                      selected
                        ? selectedValues.filter((v: string) => v !== opt)
                        : [...selectedValues, opt]
                    )
                  }
                  className={`flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded border-2 transition-all ${
                    selected
                      ? "border-gold bg-gold"
                      : "border-white/20 group-hover:border-gold/60"
                  }`}
                >
                  {selected && <Check size={11} className="text-[#241a06]" />}
                </div>
                <span className={`text-sm ${selected ? "text-ink" : "text-ink-muted"}`}>{opt}</span>
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
                className={`rounded-full border px-3 py-2 text-sm font-medium transition-all ${
                  active
                    ? "border-gold bg-gold/20 text-gold"
                    : "border-white/[0.08] bg-white/[0.03] text-ink-muted hover:border-gold/50 hover:text-ink-dim"
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
        <p className="flex items-center gap-1 text-xs text-destructive">
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
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.02]">
            <AlertCircle size={28} className="text-ink-muted" />
          </div>
          <h2 className="mb-2 text-lg font-semibold text-ink-dim">Form not found</h2>
          <p className="mb-6 text-sm text-ink-muted">This feedback form doesn&apos;t exist or is no longer active.</p>
          <Button
            onClick={() => router.push("/user/feedbacks")}
            className="bg-gradient-to-b from-[#f2c877] to-gold-deep font-semibold text-[#241a06] hover:brightness-105"
          >
            Browse Forms
          </Button>
        </div>
      </div>
    )
  }

  if (alreadySubmitted && form) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/10">
            <AlertCircle size={28} className="text-destructive" />
          </div>
          <h2 className="mb-2 text-lg font-semibold text-destructive">Submission blocked</h2>
          <p className="mb-2 text-sm text-ink-muted">You already submitted this feedback form for your account.</p>
          <p className="mb-6 text-xs text-ink-muted">Rule: one feedback submission per form per account.</p>
          <div className="flex flex-col gap-3">
            <Button
              onClick={() => router.push("/user/feedbacks")}
              className="bg-gradient-to-b from-[#f2c877] to-gold-deep font-semibold text-[#241a06] hover:brightness-105"
            >
              Browse Other Feedbacks
            </Button>
            <Button
              variant="ghost"
              className="text-ink-dim hover:text-ink"
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
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-gold/30 border-t-gold" />
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
      <div className="relative flex min-h-screen items-center justify-center p-4">
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-mint/[0.06] blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 h-80 w-80 rounded-full bg-gold/[0.06] blur-3xl" />
        </div>
        <div className="relative max-w-sm text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-mint/25 bg-gradient-to-br from-mint/30 to-gold/20 shadow-2xl">
            <CheckCircle2 size={36} className="text-mint" />
          </div>
          <h2 className="mb-2 font-display text-2xl font-bold text-ink">Thank you!</h2>
          <p className="mb-2 text-ink-dim">{form.title}</p>
          <p className="mb-8 text-sm text-ink-muted">
            Your feedback has been submitted. It means a lot to us!
          </p>
          <div className="flex flex-col gap-3">
            <Button
              className="bg-gradient-to-b from-[#f2c877] to-gold-deep font-semibold text-[#241a06] hover:brightness-105"
              onClick={() => router.push("/user/feedbacks")}
            >
              Give More Feedback
            </Button>
            <Button
              variant="ghost"
              className="text-ink-dim hover:text-ink"
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
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <button
            onClick={() => router.push("/user/feedbacks")}
            className="flex items-center gap-2 text-sm text-ink-dim transition-colors hover:text-gold"
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <div className="flex items-center gap-2">
            <MessageSquare size={14} className="text-gold" />
            <span className="text-sm text-ink-dim">
              {step + 1} <span className="text-ink-muted">/ {totalQ}</span>
            </span>
          </div>
          <Badge variant="outline" className="border-white/10 text-xs text-ink-muted">
            {form.category}
          </Badge>
        </div>
      </header>

      {/* Progress bar */}
      <div className="h-1 bg-white/[0.06]">
        <div
          className="h-full bg-gradient-to-r from-gold-deep to-gold transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <main className="relative z-10 mx-auto max-w-2xl px-4 py-8">
        {/* Form header — only on first question */}
        {step === 0 && (
          <div className="mb-8 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
            <div className="mb-3 flex items-center gap-2">
              <Badge variant="outline" className="border-gold/30 text-xs text-gold">
                {form.product}
              </Badge>
              <Badge variant="outline" className="border-white/10 text-xs text-ink-muted">
                {form.category}
              </Badge>
            </div>
            <h1 className="font-display text-xl font-bold text-ink">{form.title}</h1>
            {form.description && (
              <p className="mt-2 text-sm text-ink-muted">{form.description}</p>
            )}
            <p className="mt-3 flex items-center gap-1 text-xs text-ink-muted">
              <Sparkles size={11} className="text-gold" />
              {totalQ} question{totalQ !== 1 ? "s" : ""} · Takes ~{Math.ceil(totalQ * 0.5)} min
            </p>
          </div>
        )}

        {/* Question card */}
        {currentQ && (
          <div className="mb-6 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6">
            <div className="mb-5 flex items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold/20 text-xs font-bold text-gold">
                {step + 1}
              </span>
              <div className="h-px flex-1 bg-white/[0.07]" />
              <span className="text-xs text-ink-muted">of {totalQ}</span>
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
          <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {quotaError}
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={step === 0}
            className="gap-2 text-ink-dim hover:text-ink disabled:opacity-30"
          >
            <ArrowLeft size={16} />
            Previous
          </Button>

          {isLastQ ? (
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="gap-2 bg-gradient-to-b from-[#f2c877] to-gold-deep px-6 font-bold text-[#241a06] hover:brightness-105"
            >
              {submitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#241a06]/30 border-t-[#241a06]" />
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
              className="gap-2 bg-gradient-to-b from-[#f2c877] to-gold-deep font-semibold text-[#241a06] hover:brightness-105"
            >
              Next
              <ArrowRight size={16} />
            </Button>
          )}
        </div>

        {/* Dots progress */}
        <div className="mt-8 flex items-center justify-center gap-1.5">
          {form.questions.map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-300 ${
                i === step
                  ? "h-2 w-6 bg-gold"
                  : i < step
                  ? "h-2 w-2 bg-gold/40"
                  : "h-2 w-2 bg-white/[0.08]"
              }`}
            />
          ))}
        </div>
      </main>
    </div>
  )
}
