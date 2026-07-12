import { NextResponse } from "next/server"
import { z } from "zod"
import Groq from "groq-sdk"
import { createClient } from "@/lib/supabase/server"

/**
 * POST /api/summarize-responses — AI summary of a form's real submitted
 * responses. Reuses the generate-questions route pattern
 * (see app/api/generate-questions/route.ts) with the same shell: auth-gate,
 * zod input validation, per-user daily rate limit, Groq call, honest labelling.
 *
 * Guardrails:
 *   - auth-gate: signed-in CLIENT only, AND the form must be theirs (RLS on
 *     `responses` already scopes reads to the form's owning client, but this
 *     route also checks `forms.client_id` directly for a clean 403/404
 *     instead of a silent empty summary)
 *   - rate limit: 10 calls / rolling 24h / user, same `ai_generation_log`
 *     table as generate-questions (feature = 'summarize_responses')
 *   - data-gate: fewer than MIN_RESPONSES real responses → a clean 200 with
 *     `insufficientData: true` instead of asking the model to summarize a
 *     thin sample — the honest "not enough responses yet" case belongs in
 *     the UI, not faked by the model
 *   - the model is asked for prose (not JSON — this is display text) and
 *     explicitly told to be honest about small sample sizes
 *
 * The Groq API key is read server-side only (GROQ_API_KEY). This route and
 * app/api/generate-questions/route.ts are the only two places in the app
 * that call a generative-AI model.
 */

const DAILY_LIMIT = 10
const MODEL_NAME = "llama-3.3-70b-versatile"
const MIN_RESPONSES = 5

const requestSchema = z.object({
  formId: z.string().uuid(),
})

function deriveAnswerText(value: unknown): string {
  if (Array.isArray(value)) return value.map((v) => String(v)).join(", ")
  if (value === null || value === undefined) return "(no answer)"
  return String(value)
}

function buildPrompt(formTitle: string, formDescription: string, block: string, responseCount: number): string {
  return `You are analyzing real customer-feedback survey responses for a business.

Form: "${formTitle}"${formDescription ? ` — ${formDescription}` : ""}
Number of responses: ${responseCount}

Responses (each numbered, question: answer pairs):
${block}

Summarize the themes across these responses and suggest up to 3 concrete actions the business could take. Be honest and explicit about the sample size — if ${responseCount} is small, say so plainly and caveat the confidence of your read accordingly; do not overstate what a small sample can tell you. Write in plain, direct prose (no JSON, no markdown headers, no bullet-point lists — short paragraphs only). Keep it under 250 words.`
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
    return NextResponse.json({ error: "Invalid form." }, { status: 400 })
  }
  const { formId } = parsedRequest.data

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

  const { data: form, error: formError } = await supabase
    .from("forms")
    .select("id, title, description, questions, client_id")
    .eq("id", formId)
    .maybeSingle()
  if (formError || !form) {
    return NextResponse.json({ error: "Form not found." }, { status: 404 })
  }
  if (form.client_id !== user.id) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 })
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count, error: countError } = await supabase
    .from("ai_generation_log")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("feature", "summarize_responses")
    .gte("created_at", since)
  if (countError) {
    return NextResponse.json({ error: "Could not check usage. Please try again." }, { status: 500 })
  }
  if ((count ?? 0) >= DAILY_LIMIT) {
    return NextResponse.json(
      { error: `Daily AI generation limit reached (${DAILY_LIMIT}/day). Try again tomorrow.` },
      { status: 429 },
    )
  }

  const { data: responseRows, error: responsesError } = await supabase
    .from("responses")
    .select("answers")
    .eq("form_id", formId)
    .order("submitted_at", { ascending: true })
  if (responsesError) {
    return NextResponse.json({ error: "Could not load responses." }, { status: 500 })
  }

  const responses = responseRows ?? []
  if (responses.length < MIN_RESPONSES) {
    return NextResponse.json({
      insufficientData: true,
      responseCount: responses.length,
      minRequired: MIN_RESPONSES,
    })
  }

  type FormQuestion = { id: string; title: string }
  const questions: FormQuestion[] = Array.isArray(form.questions)
    ? (form.questions as unknown as FormQuestion[])
    : []
  const questionTitleById = new Map(questions.map((q) => [q.id, q.title]))

  const block = responses
    .map((row, index) => {
      const answers = (row.answers ?? {}) as Record<string, unknown>
      const lines = Object.entries(answers).map(([questionId, value]) => {
        const title = questionTitleById.get(questionId) ?? questionId
        return `  ${title}: ${deriveAnswerText(value)}`
      })
      return `${index + 1}.\n${lines.join("\n")}`
    })
    .join("\n\n")

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "AI generation is not configured." }, { status: 500 })
  }

  let summary: string
  try {
    const groq = new Groq({ apiKey })
    const completion = await groq.chat.completions.create({
      model: MODEL_NAME,
      messages: [
        { role: "user", content: buildPrompt(form.title, form.description ?? "", block, responses.length) },
      ],
      temperature: 0.5,
    })
    summary = (completion.choices[0]?.message?.content ?? "").trim()
  } catch {
    return NextResponse.json({ error: "AI generation failed. Please try again." }, { status: 502 })
  }

  if (!summary) {
    return NextResponse.json({ error: "AI returned an empty summary. Please try again." }, { status: 502 })
  }

  await supabase.from("ai_generation_log").insert({ user_id: user.id, feature: "summarize_responses" })

  return NextResponse.json({ summary, responseCount: responses.length })
}
