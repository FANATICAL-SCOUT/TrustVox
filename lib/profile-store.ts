// ─── TrustVox User Profile Store ───────────────────────────────────────────
// Read/update the signed-in user's editable profile.
//
// Reads go through the RLS-gated browser client (a user can only read their own
// profile row). Writes go through the trusted /api/update-profile route so the
// 90-day name-change cooldown and field validation are enforced server-side —
// the DB trigger (0010) is the real backstop, the route gives a clean error.
import { createClient, getCachedUser } from "@/lib/supabase/client"

// Selectable interest tags = the feedback categories the app actually uses
// (from the create-form page's CATEGORIES), minus the "Other"/"Others" placeholders
// which aren't meaningful interests. Keeping this aligned with the real form
// categories means interests can drive recommendations later without a mismatch.
export const INTEREST_OPTIONS = [
  "Software",
  "Service",
  "Mobile App",
  "Hardware",
  "E-Commerce",
  "Food & Beverage",
  "Healthcare",
  "Education",
  "Finance",
] as const

export const MAX_INTERESTS = 6
export const MAX_BIO_WORDS = 150
// Mirror of the DB CHECK (profiles_bio_len) — keep in sync with migration 0010.
export const MAX_BIO_CHARS = 1200
// Mirror of the DB name-change cooldown (0010 trigger).
export const NAME_CHANGE_COOLDOWN_DAYS = 90

export interface UserProfile {
  id: string
  displayName: string
  email: string
  bio: string
  interests: string[]
  joinedAt: string | null
  lastNameChangeAt: string | null
}

export interface NameChangeStatus {
  canChange: boolean
  // ISO date the name can next be changed (null if it can change now).
  nextChangeAt: string | null
  daysRemaining: number
}

export interface UpdateProfileInput {
  displayName: string
  bio: string
  interests: string[]
}

export interface UpdateProfileResult {
  ok: boolean
  message?: string
}

/** Count words the way the 150-word limit intends (whitespace-separated). */
export function wordCount(text: string): number {
  const trimmed = text.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).length
}

/** Whether the display name can be changed right now, and when it next can. */
export function getNameChangeStatus(lastNameChangeAt: string | null): NameChangeStatus {
  if (!lastNameChangeAt) {
    return { canChange: true, nextChangeAt: null, daysRemaining: 0 }
  }
  const last = new Date(lastNameChangeAt).getTime()
  const next = last + NAME_CHANGE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000
  const now = Date.now()
  if (now >= next) {
    return { canChange: true, nextChangeAt: null, daysRemaining: 0 }
  }
  return {
    canChange: false,
    nextChangeAt: new Date(next).toISOString(),
    daysRemaining: Math.ceil((next - now) / (24 * 60 * 60 * 1000)),
  }
}

export async function getUserProfile(): Promise<UserProfile | null> {
  const supabase = createClient()
  const user = await getCachedUser(supabase)
  if (!user) return null

  const { data, error } = await supabase
    .from("profiles")
    .select("display_name, email, bio, interests, created_at, last_name_change_at")
    .eq("id", user.id)
    .maybeSingle()
  if (error) throw error

  return {
    id: user.id,
    displayName: data?.display_name || user.email || "User",
    email: data?.email || user.email || "",
    bio: data?.bio ?? "",
    interests: data?.interests ?? [],
    joinedAt: data?.created_at ?? null,
    lastNameChangeAt: data?.last_name_change_at ?? null,
  }
}

/**
 * Persist name/bio/interests via the trusted server route. The route re-validates
 * everything (zod) and enforces the name-change cooldown; the DB trigger is the
 * final guarantee. Returns a friendly result the UI can surface directly.
 */
export async function updateUserProfile(input: UpdateProfileInput): Promise<UpdateProfileResult> {
  try {
    const res = await fetch("/api/update-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
    const json = (await res.json().catch(() => ({}))) as { error?: string }
    if (!res.ok) {
      return { ok: false, message: json.error || "Could not save your profile. Please try again." }
    }
    return { ok: true }
  } catch {
    return { ok: false, message: "Network error. Please try again." }
  }
}
