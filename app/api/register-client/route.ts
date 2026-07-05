import { NextResponse } from "next/server"
import { z } from "zod"
import { createAdminClient } from "@/lib/supabase/admin"
import { isPasswordValid, PASSWORD_POLICY_MESSAGE } from "@/lib/auth/validation"

/**
 * POST /api/register-client — trusted, server-side client signup (ARCHITECTURE §5.2).
 *
 * Creates a pre-confirmed account (trigger sets role='user'), then elevates it
 * to role='client' and fills the company fields using the secret key. That
 * elevation MUST bypass RLS — the `profiles_update_own` policy pins `role`, so
 * only a secret-key holder can change it. This is the intended trusted path.
 * If elevation fails, the freshly created account is deleted so no half-made
 * client is left stranded as a plain user.
 */
const schema = z.object({
  companyName: z.string().trim().min(1, "Please enter your company name.").max(160),
  contactName: z.string().trim().min(1, "Please enter a contact name.").max(120),
  email: z.string().trim().email("Please enter a valid business email."),
  password: z.string().refine(isPasswordValid, PASSWORD_POLICY_MESSAGE),
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

  const { companyName, contactName, email, password } = parsed.data
  const admin = createAdminClient()

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: contactName },
  })

  if (error || !data.user) {
    return NextResponse.json(
      { error: "Could not create this account. Please try a different email." },
      { status: 400 },
    )
  }

  // Trusted elevation: role='user' → 'client' + company fields (bypasses RLS).
  const { error: elevateError } = await admin
    .from("profiles")
    .update({
      role: "client",
      company_name: companyName,
      contact_name: contactName,
      display_name: contactName,
    })
    .eq("id", data.user.id)

  if (elevateError) {
    // Roll back so we don't leave a half-provisioned account behind.
    await admin.auth.admin.deleteUser(data.user.id)
    return NextResponse.json(
      { error: "Could not complete registration. Please try again." },
      { status: 500 },
    )
  }

  return NextResponse.json({ ok: true })
}
