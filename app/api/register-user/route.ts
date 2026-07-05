import { NextResponse } from "next/server"
import { z } from "zod"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  isPasswordValid,
  isOldEnough,
  PASSWORD_POLICY_MESSAGE,
  UNDERAGE_MESSAGE,
  INVALID_DOB_MESSAGE,
  GENDER_VALUES,
} from "@/lib/auth/validation"

/**
 * POST /api/register-user — trusted, server-side user signup (ARCHITECTURE §5.2).
 *
 * Creates a pre-confirmed account with the secret key. The `handle_new_user`
 * DB trigger creates the profiles row with role='user' (0004 hardening — it
 * ignores any client-supplied role), so nothing here can elevate privilege.
 * DOB + gender are written to the profile from here with the secret key (the
 * trigger only fills id/email/display_name/role). The browser establishes the
 * session afterwards via signInWithPassword.
 *
 * Password policy + the 16+ age gate are validated HERE too, not just in the
 * browser — the client checks are for UX; this is the real gate (§security-first).
 */
const schema = z.object({
  name: z.string().trim().min(1, "Please enter your name.").max(120),
  email: z.string().trim().email("Please enter a valid email address."),
  password: z.string().refine(isPasswordValid, PASSWORD_POLICY_MESSAGE),
  dob: z.string().refine((v) => /^\d{4}-\d{2}-\d{2}$/.test(v), INVALID_DOB_MESSAGE),
  gender: z.enum(GENDER_VALUES),
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

  const { name, email, password, dob, gender } = parsed.data

  // Age gate: the DOB must parse to a real date and be 16+ (server-side truth).
  if (!isOldEnough(dob)) {
    return NextResponse.json({ error: UNDERAGE_MESSAGE }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: name },
  })

  if (error || !data.user) {
    // Generic message — don't confirm whether the email already exists.
    return NextResponse.json(
      { error: "Could not create this account. Please try a different email." },
      { status: 400 },
    )
  }

  // Persist DOB + gender to the profile (trusted, bypasses RLS). If this fails,
  // roll the account back so we don't leave a profile missing required fields.
  const { error: profileError } = await admin
    .from("profiles")
    .update({ dob, gender })
    .eq("id", data.user.id)

  if (profileError) {
    await admin.auth.admin.deleteUser(data.user.id)
    return NextResponse.json(
      { error: "Could not complete registration. Please try again." },
      { status: 500 },
    )
  }

  return NextResponse.json({ ok: true })
}
