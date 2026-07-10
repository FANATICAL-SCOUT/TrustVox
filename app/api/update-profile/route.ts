import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import {
  INTEREST_OPTIONS,
  MAX_BIO_WORDS,
  MAX_INTERESTS,
  NAME_CHANGE_COOLDOWN_DAYS,
  getNameChangeStatus,
  wordCount,
} from "@/lib/profile-store"

/**
 * POST /api/update-profile — trusted, server-side update of the signed-in user's
 * editable profile (Phase 9 · Session 3).
 *
 * The write uses the session-scoped (RLS-gated) server client, so a user can only
 * ever touch their OWN profile, and `role`/`status` stay pinned by the
 * profiles_update_own policy. Two things are enforced here that RLS can't express
 * cleanly, with the DB (migration 0010) as the final backstop:
 *   • the 90-day display-name change cooldown (trigger enforce_name_change_cooldown);
 *   • interests limited to the known catalog + max 6, bio ≤ 150 words.
 * Client-side checks are for UX; this route is the real gate.
 */
const INTEREST_SET = new Set<string>(INTEREST_OPTIONS)

const schema = z.object({
  displayName: z.string().trim().min(1, "Please enter your name.").max(120, "Name is too long."),
  bio: z
    .string()
    .max(1200)
    .refine((v) => wordCount(v) <= MAX_BIO_WORDS, `Bio must be ${MAX_BIO_WORDS} words or fewer.`),
  interests: z
    .array(z.string())
    .max(MAX_INTERESTS, `Choose at most ${MAX_INTERESTS} interests.`)
    .refine((arr) => arr.every((tag) => INTEREST_SET.has(tag)), "Unknown interest selected."),
})

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid input."
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const { displayName, bio, interests } = parsed.data
  // Dedupe interests (defensive — the UI shouldn't send dupes) while preserving order.
  const uniqueInterests = Array.from(new Set(interests))

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 })
  }

  // Read the current name + cooldown stamp to give a clean pre-flight error
  // (the DB trigger is the real guard either way).
  const { data: current, error: readError } = await supabase
    .from("profiles")
    .select("display_name, last_name_change_at")
    .eq("id", user.id)
    .maybeSingle()
  if (readError || !current) {
    return NextResponse.json({ error: "Could not load your profile." }, { status: 500 })
  }

  const nameChanged = displayName !== (current.display_name ?? "")
  if (nameChanged) {
    const status = getNameChangeStatus(current.last_name_change_at)
    if (!status.canChange) {
      return NextResponse.json(
        {
          error: `Name can only be changed once every ${NAME_CHANGE_COOLDOWN_DAYS} days. Try again in ${status.daysRemaining} day${status.daysRemaining === 1 ? "" : "s"}.`,
        },
        { status: 400 },
      )
    }
  }

  // Only include display_name in the update when it actually changed — otherwise
  // the cooldown trigger's "is distinct from" check would still be a no-op, but
  // omitting it keeps intent clear and avoids re-stamping on a bio-only edit.
  const update: { bio: string; interests: string[]; display_name?: string } = {
    bio,
    interests: uniqueInterests,
  }
  if (nameChanged) update.display_name = displayName

  const { error: updateError } = await supabase.from("profiles").update(update).eq("id", user.id)

  if (updateError) {
    // The cooldown trigger raises P0001 with a friendly message; surface it.
    const message =
      updateError.code === "P0001" || /90 days/i.test(updateError.message)
        ? `Name can only be changed once every ${NAME_CHANGE_COOLDOWN_DAYS} days.`
        : "Could not save your profile. Please try again."
    return NextResponse.json({ error: message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
