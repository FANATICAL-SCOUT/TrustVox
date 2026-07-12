import { NextResponse } from "next/server"
import { z } from "zod"
import Groq from "groq-sdk"
import { createClient } from "@/lib/supabase/server"
import type { QuestionType } from "@/lib/feedback-store"

/**
 * POST /api/generate-questions — AI-assisted question drafting for the create-form
 * builder. Honest replacement for the earlier fake "AI Suggested
 * Templates": this one is a real model call, clearly
 * labelled in the UI as AI-generated + editable, never auto-submitted.
 *
 * Guardrails:
 *   - auth-gate: signed-in CLIENT only (role read from profiles, not client input)
 *   - input cap: prompt ≤ 500 chars
 *   - rate limit: 10 calls / rolling 24h / user, backed by migration 0014
 *   - output validated with zod against the real Question shape before it's
 *     ever returned — a malformed model reply becomes a clean error, not garbage
 *     dropped into the builder
 *
 * The Groq API key is read server-side only (GROQ_API_KEY, no NEXT_PUBLIC_
 * prefix) — same secret rule as SUPABASE_SECRET_KEY. This route is the ONLY
 * place in the app that calls a generative-AI model or references a model name.
 */

const DAILY_LIMIT = 10
const MODEL_NAME = "llama-3.3-70b-versatile"

const requestSchema = z.object({
  prompt: z.string().trim().min(3, "Describe what you'd like feedback on.").max(500),
})

const QUESTION_TYPES = [
  "star-rating",
  "text-short",
  "text-long",
  "multiple-choice",
  "multi-select",
  "tag-selection",
] as const satisfies readonly QuestionType[]

const generatedQuestionSchema = z.object({
  title: z.string().trim().min(1).max(200),
  type: z.enum(QUESTION_TYPES),
  options: z.array(z.string().trim().min(1).max(100)).max(10).optional().default([]),
})

const generatedQuestionsSchema = z.array(generatedQuestionSchema).min(1).max(8)

function buildPrompt(userPrompt: string): string {
  return `You are drafting questions for a customer-feedback survey form.

Topic the client wants feedback on: "${userPrompt}"

Draft 5 clear, unbiased feedback-survey questions about this topic. Reply with ONLY a JSON object, no prose, no markdown fences, matching exactly this shape:
{"questions": [{"title": string, "type": "star-rating" | "text-short" | "text-long" | "multiple-choice" | "multi-select" | "tag-selection", "options": string[]}]}

Rules:
- "options" is required (non-empty, 2-6 items) for "multiple-choice", "multi-select", and "tag-selection"; use an empty array [] for "star-rating", "text-short", and "text-long".
- Prefer a mix of types (not all text or all rating).
- Questions must be specific to the stated topic, not generic filler.
- Keep each question title under 120 characters.`
}

function extractJsonArray(raw: string): string {
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
    .eq("feature", "generate_questions")
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

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "AI generation is not configured." }, { status: 500 })
  }

  let rawText: string
  try {
    const groq = new Groq({ apiKey })
    const completion = await groq.chat.completions.create({
      model: MODEL_NAME,
      messages: [{ role: "user", content: buildPrompt(parsedRequest.data.prompt) }],
      response_format: { type: "json_object" },
      temperature: 0.7,
    })
    rawText = completion.choices[0]?.message?.content ?? ""
  } catch {
    return NextResponse.json({ error: "AI generation failed. Please try again." }, { status: 502 })
  }

  let parsedJson: unknown
  try {
    const parsed = JSON.parse(extractJsonArray(rawText))
    // JSON mode returns an object; unwrap the array wherever the model put it
    // (asked for "questions", but don't hard-fail if it nested differently).
    parsedJson = Array.isArray(parsed)
      ? parsed
      : (Object.values(parsed as Record<string, unknown>).find((v) => Array.isArray(v)) ?? parsed)
  } catch {
    return NextResponse.json(
      { error: "AI returned an unexpected format. Please try again." },
      { status: 502 },
    )
  }

  const parsedQuestions = generatedQuestionsSchema.safeParse(parsedJson)
  if (!parsedQuestions.success) {
    return NextResponse.json(
      { error: "AI returned an unexpected format. Please try again." },
      { status: 502 },
    )
  }

  // Log the call under the user's own session (RLS: ai_generation_log_insert_own
  // requires user_id = auth.uid(), so this can only ever log the caller's own
  // usage). Best-effort — a logging failure shouldn't block a result the user
  // already paid quota for.
  await supabase.from("ai_generation_log").insert({ user_id: user.id, feature: "generate_questions" })

  return NextResponse.json({ questions: parsedQuestions.data })
}
