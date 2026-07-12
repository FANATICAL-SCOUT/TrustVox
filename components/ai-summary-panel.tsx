"use client"

import { useEffect, useState } from "react"
import { AlertCircle, Loader2, Sparkles } from "lucide-react"

// Shared AI summary panel, reused on the per-form analytics page. Owns its
// own request state, keyed internally by formId so switching forms never
// shows a stale read — callers just render it with the form they want
// summarized. Calls the existing /api/summarize-responses route unchanged.
export default function AiSummaryPanel({ formId }: { formId: string }) {
  const [resultFormId, setResultFormId] = useState<string | null>(null)
  const [summary, setSummary] = useState<string | null>(null)
  const [insufficientCount, setInsufficientCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // A new form invalidates any summary shown for the previous one.
  useEffect(() => {
    setResultFormId(null)
    setSummary(null)
    setInsufficientCount(null)
    setError(null)
  }, [formId])

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/summarize-responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data?.error ?? "Couldn't generate a summary — try again.")
        return
      }
      setResultFormId(formId)
      if (data.insufficientData) {
        setSummary(null)
        setInsufficientCount(data.responseCount ?? 0)
      } else {
        setSummary(data.summary as string)
        setInsufficientCount(null)
      }
    } catch {
      setError("Couldn't generate a summary — try again.")
    } finally {
      setLoading(false)
    }
  }

  const hasResult = resultFormId === formId && (summary || insufficientCount !== null)

  return (
    <div className="rounded-xl border border-dashed border-gold/25 bg-gold/[0.04] p-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-gold" />
          <h3 className="text-sm font-semibold text-ink">AI Summary</h3>
        </div>
        <button
          onClick={() => void handleGenerate()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-b from-[#f2c877] to-gold-deep px-3 py-1.5 text-xs font-semibold text-[#241a06] transition hover:brightness-105 disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 size={13} className="animate-spin" />
              Analyzing…
            </>
          ) : (
            <>
              <Sparkles size={13} />
              {hasResult ? "Regenerate" : "Generate Summary"}
            </>
          )}
        </button>
      </div>

      {error ? (
        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-red-400">
          <AlertCircle size={12} />
          {error}
        </p>
      ) : resultFormId === formId && insufficientCount !== null ? (
        <p className="mt-3 text-sm text-ink-dim">
          Not enough responses yet to analyze — this form has {insufficientCount}{" "}
          response{insufficientCount === 1 ? "" : "s"} so far. A meaningful AI read needs a few more real
          submissions.
        </p>
      ) : resultFormId === formId && summary ? (
        <div className="mt-3 space-y-2">
          <p className="text-sm leading-relaxed text-ink-dim whitespace-pre-line">{summary}</p>
          <p className="text-[10px] text-ink-muted">AI summary — review before acting.</p>
        </div>
      ) : (
        <p className="mt-3 text-sm text-ink-dim">
          A plain-language read of what this form&apos;s real responses are telling you — themes and suggested
          actions. Generate it on demand; review before acting.
        </p>
      )}
    </div>
  )
}
