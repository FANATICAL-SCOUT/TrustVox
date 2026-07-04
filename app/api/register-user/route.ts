import { NextResponse } from "next/server"
import { z } from "zod"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * POST /api/register-user — trusted, server-side user signup (ARCHITECTURE §5.2).
 *
 * Creates a pre-confirmed account with the secret key. The `handle_new_user`
 * DB trigger creates the profiles row with role='user' (0004 hardening — it
 * ignores any client-supplied role), so nothing here can elevate privilege.
 * The browser establishes the session afterwards via signInWithPassword.
 */
const schema = z.object({
  name: z.string().trim().min(1, "Please enter your name.").max(120),
  email: z.string().trim().email("Please enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
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

  const { name, email, password } = parsed.data
  const admin = createAdminClient()

  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: name },
  })

  if (error) {
    // Generic message — don't confirm whether the email already exists.
    return NextResponse.json(
      { error: "Could not create this account. Please try a different email." },
      { status: 400 },
    )
  }

  return NextResponse.json({ ok: true })
}
