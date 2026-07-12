import { NextResponse } from "next/server"
import { z } from "zod"
import Groq from "groq-sdk"
import { createClient } from "@/lib/supabase/server"
import type { QuestionType } from "@/lib/feedback-store"

/**
 * POST /api/critique-question — AI critique of a single survey question the
 * client typed by hand. Distinct from
 * /api/generate-questions: that one *generates* questions from a topic; this one
 * *critiques* one existing question for leading / ambiguous / unclear phrasing
 * and, only when there's a real problem, suggests a neutral rewrite.
 *
 * Reuses the generate-questions route shell (see app/api/generate-questions/route.ts):
 *   - auth-gate: signed-in CLIENT only (role read from profiles, not client input)
 *   - input cap: title ≤ 200 chars (matches the Question.title cap in the builder)
 *   - rate limit: per-user rolling-24h cap, same `ai_generation_log` table
 *     (feature = 'critique_question' — needs migration 0015 to extend the
 *     table's feature CHECK, which only listed the first two features)
 *   - honesty: the model is told explicitly NOT to manufacture a nitpick for a
 *     genuinely fine question — a clear question returns `{ ok: true }` with a
 *     short "looks clear" note, never a fabricated flaw to justify the feature
 *     (same discipline as 11.6's "not enough responses" case)
 *
 * The Groq API key is read server-side only (GROQ_API_KEY). This route,
 * generate-questions, and summarize-responses are the only places in the app
 * that call a generative-AI model.
 */

const DAILY_LIMIT = 10
const MODEL_NAME = "llama-3.3-70b-versatile"

const QUESTION_TYPES = [
  "star-rating",
  "text-short",
  "text-long",
  "multiple-choice",
  "multi-select",
  "tag-selection",
  "voice-feedback",
] as const satisfies readonly QuestionType[]

const requestSchema = z.object({
  title: z.string().trim().min(1, "Add a question first.").max(200),
  type: z.enum(QUESTION_TYPES),
})

// The model replies with a small JSON object: whether the question is fine, a
// short critique/explanation, and (only when flagged) a neutral rewrite. All
// three are validated before anything reaches the client.
const critiqueSchema = z.object({
  ok: z.boolean(),
  critique: z.string().trim().min(1).max(600),
  suggestion: z.string().trim().max(200).optional().default(""),
})

function buildPrompt(title: string, type: QuestionType): string {
  return `You are reviewing a single question a business wrote for a customer-feedback survey.

Question type: "${type}"
Question text: "${title}"

Check ONLY for real problems that would bias or confuse respondents: leading/loaded phrasing (assumes a positive answer), double-barreled questions (asks two things at once), vague/ambiguous wording, or a question that doesn't fit its answer type.

Reply with ONLY a JSON object, no prose, no markdown fences, matching exactly:
{"ok": boolean, "critique": string, "suggestion": string}

Rules:
- If the question is clear, fair, and well-formed, set "ok": true, put a brief one-sentence confirmation in "critique" (e.g. "This question is clear and neutral."), and leave "suggestion" as an empty string. Do NOT invent a flaw for a genuinely fine question.
- If there is a real problem, set "ok": false, explain the specific issue in "critique" in 1-2 plain sentences, and put a single improved, neutral rewrite of the question in "suggestion".
- Keep "critique" under 300 characters and "suggestion" under 160 characters.`
}

function extractJsonObject(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = fenced ? fenced[1] : raw
  const start = candidate.indexOf("{")
  const end = candidate.lastIndexOf("}")
  if (start === -1 || end === -1 || end < start) return candidate.trim()
  return candidate.slice(start, end + 1).trim()
}

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 })
  }

  const parsedRequest = requestSchema.safeParse(body)
  if (!parsedRequest.success) {
    const message = parsedRequest.error.issues[0]?.message ?? "Invalid input."
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 })
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()
  if (profileError || !profile || profile.role !== "client") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 })
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count, error: countError } = await supabase
    .from("ai_generation_log")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("feature", "critique_question")
    .gte("created_at", since)
  if (countError) {
    return NextResponse.json({ error: "Could not check usage. Please try again." }, { status: 500 })
  }
  if ((count ?? 0) >= DAILY_LIMIT) {
    return NextResponse.json(
      { error: `Daily AI limit reached (${DAILY_LIMIT}/day). Try again tomorrow.` },
      { status: 429 },
    )
  }

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "AI review is not configured." }, { status: 500 })
  }

  let rawText: string
  try {
    const groq = new Groq({ apiKey })
    const completion = await groq.chat.completions.create({
      model: MODEL_NAME,
      messages: [
        { role: "user", content: buildPrompt(parsedRequest.data.title, parsedRequest.data.type) },
      ],
      response_format: { type: "json_object" },
      temperature: 0.4,
    })
    rawText = completion.choices[0]?.message?.content ?? ""
  } catch {
    return NextResponse.json({ error: "AI review failed. Please try again." }, { status: 502 })
  }

  let parsedJson: unknown
  try {
    parsedJson = JSON.parse(extractJsonObject(rawText))
  } catch {
    return NextResponse.json(
      { error: "AI returned an unexpected format. Please try again." },
      { status: 502 },
    )
  }

  const parsedCritique = critiqueSchema.safeParse(parsedJson)
  if (!parsedCritique.success) {
    return NextResponse.json(
      { error: "AI returned an unexpected format. Please try again." },
      { status: 502 },
    )
  }

  // Log the call under the user's own session (RLS: ai_generation_log_insert_own
  // requires user_id = auth.uid()). Best-effort — a logging failure shouldn't
  // block a result the user already spent quota for.
  await supabase.from("ai_generation_log").insert({ user_id: user.id, feature: "critique_question" })

  const { ok, critique, suggestion } = parsedCritique.data
  return NextResponse.json({ ok, critique, suggestion: ok ? "" : suggestion })
}
