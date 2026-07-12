import { NextResponse } from "next/server"
import { z } from "zod"
import { createAdminClient } from "@/lib/supabase/admin"
import { MAX_LOGIN_ATTEMPTS, LOCKOUT_MINUTES } from "@/lib/auth/validation"

/**
 * POST /api/login-guard — server-side brute-force lockout for the login doors.
 * Called by the user + client login pages around the
 * real sign-in:
 *
 *   • action "check"   — before sign-in: is this email currently locked out?
 *                        Returns { locked, minutesLeft }.
 *   • action "fail"    — after a failed sign-in: record one failed attempt.
 *                        Returns the resulting { locked, minutesLeft }.
 *   • action "success" — after a successful sign-in: clear the email's attempts.
 *
 * The `login_attempts` table is service-role-only (RLS on, no policies),
 * so this route — holding the secret key — is the ONLY thing that can read or
 * write it. That's deliberate: the check runs before the user is authenticated,
 * so there's no auth.uid() to gate it with, and a client-side counter would be
 * trivially bypassed. Responses never reveal whether an email exists.
 *
 * Lockout is scoped to (email, IP), not email alone: an attacker who only
 * knows a victim's email — without ever attempting the real sign-in — can't
 * lock the real owner out by spamming "fail" for their address from a
 * different network. Each IP accrues its own failure count against the email,
 * so a genuine user mistyping their own password is unaffected by unrelated
 * traffic elsewhere.
 */
const schema = z.object({
  email: z.string().trim().email(),
  action: z.enum(["check", "fail", "success"]),
})

const WINDOW_MS = LOCKOUT_MINUTES * 60 * 1000

/** Best-effort client IP from the standard proxy header; "unknown" if absent. */
function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")
  return forwarded?.split(",")[0]?.trim() || "unknown"
}

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 })
  }

  const email = parsed.data.email.toLowerCase()
  const { action } = parsed.data
  const ip = clientIp(request)
  const admin = createAdminClient()
  const windowStart = new Date(Date.now() - WINDOW_MS).toISOString()

  // On success, clear the slate for this email and report unlocked.
  if (action === "success") {
    await admin.from("login_attempts").delete().eq("email", email)
    return NextResponse.json({ locked: false, minutesLeft: 0 })
  }

  // On a failed attempt, record it first (so it counts toward the threshold).
  if (action === "fail") {
    await admin.from("login_attempts").insert({ email, ip })
  }

  // Count recent failures inside the rolling window and read the oldest one, so
  // we can report how long until the window clears. Scoped to this IP so a
  // remote attacker spamming failures for someone else's email from elsewhere
  // can't lock the real owner out.
  const { data: recent } = await admin
    .from("login_attempts")
    .select("created_at")
    .eq("email", email)
    .eq("ip", ip)
    .gte("created_at", windowStart)
    .order("created_at", { ascending: true })

  const count = recent?.length ?? 0
  const locked = count >= MAX_LOGIN_ATTEMPTS

  let minutesLeft = 0
  if (locked && recent && recent.length > 0) {
    const oldest = new Date(recent[0].created_at).getTime()
    const unlockAt = oldest + WINDOW_MS
    minutesLeft = Math.max(1, Math.ceil((unlockAt - Date.now()) / 60000))
  }

  return NextResponse.json({ locked, minutesLeft })
}
