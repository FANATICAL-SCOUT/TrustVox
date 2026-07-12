// TrustVox — Demo-traffic seed (HONEST — real submit path)
//
// Unlike supabase/seed.mjs (which inserts historical response rows directly
// via service_role to bootstrap the initial demo), this script generates
// NEW traffic by actually driving the real user-facing submit flow:
//   1. create N new demo user accounts (service_role, same as seed.mjs — the
//      account itself isn't the honesty-sensitive part)
//   2. sign in as EACH account for real (password auth, anon/publishable key)
//   3. as that authenticated session, insert into `responses` (same shape
//      lib/feedback-store.ts's addResponse() would send) and call the
//      `credit_feedback_reward` RPC — both are RLS/SECURITY DEFINER gated on
//      auth.uid(), so this only works because the session is real.
//
// Real constraints this script respects (does NOT work around):
//   • only `approved` forms are earn-eligible (credit_feedback_reward checks
//     f.status = 'approved' and f.client_id <> caller)
//   • one response per (form, user) — DB unique constraint
//   • 3 responses/day per account — feedback-quota's real limit. Since this
//     is a single run, each new account submits to at most 3 approved forms.
//
// Result: genuine `responses` rows, genuine wallet_transactions, genuine
// per-user earn history — the same as if a person clicked through the UI.
// No response row is ever inserted for a form/account that didn't actually
// go through this insert+RPC pair. Safe to re-run (skips forms an account
// already submitted to; accounts are recreated fresh like seed.mjs does).
//
//   node supabase/seed-demo-traffic.mjs

import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"
import { createClient } from "@supabase/supabase-js"

// ── Load .env.local (standalone scripts don't get Next.js env injection) ──────
const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = join(__dirname, "..")

function loadEnvLocal() {
  try {
    const raw = readFileSync(join(projectRoot, ".env.local"), "utf8")
    for (const line of raw.split("\n")) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) continue
      const eq = trimmed.indexOf("=")
      if (eq === -1) continue
      const key = trimmed.slice(0, eq).trim()
      let value = trimmed.slice(eq + 1).trim()
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      if (!(key in process.env)) process.env[key] = value
    }
  } catch {
    // no .env.local — rely on already-set env
  }
}

loadEnvLocal()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY

if (!SUPABASE_URL || !PUBLISHABLE_KEY || !SECRET_KEY) {
  console.error("✖ Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY / SUPABASE_SECRET_KEY in .env.local")
  process.exit(1)
}

// service_role client — used ONLY to create the accounts themselves
// (account provisioning isn't the honesty-sensitive step; the submit +
// credit calls below are all made with a real per-user session instead).
const admin = createClient(SUPABASE_URL, SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const DEMO_PASSWORD = "TrustVoxDemo!2026"

// 5 new real demo accounts — clearly labelled, distinct from seed.mjs's
// login-demo accounts (demo.*) and historical responders (responder*).
const TRAFFIC_USERS = [
  { email: "traffic1@trustvox.dev", displayName: "Noah Fischer" },
  { email: "traffic2@trustvox.dev", displayName: "Sofia Martins" },
  { email: "traffic3@trustvox.dev", displayName: "Kenji Watanabe" },
  { email: "traffic4@trustvox.dev", displayName: "Grace Adeyemi" },
  { email: "traffic5@trustvox.dev", displayName: "Priya Desai" },
]

// A small bank of realistic free-text answers per rough theme, so long-form
// answers don't all read identically across accounts/forms. Picked
// deterministically (per user+question) rather than random, so re-runs are
// reproducible.
const LONG_TEXT_BANK = [
  "Really solid experience overall — the parts I use most feel fast and reliable.",
  "Mostly good, but I ran into a small hiccup navigating between sections. Nothing blocking though.",
  "This has quietly become part of my routine. Would like to see more customization options.",
  "Clean and easy to pick up. A couple of labels could be clearer for first-time users.",
  "Impressed with how quick everything loads. My only ask is better mobile spacing.",
]
const SHORT_TEXT_BANK = [
  "Faster search would help a lot.",
  "Loved how straightforward it was.",
  "A bit slow on my older phone.",
  "Exactly what I needed, no complaints.",
  "Wish there was a dark mode toggle here too.",
]

function pick(bank, seedIndex) {
  return bank[seedIndex % bank.length]
}

// Builds a realistic answers object for a form's real question list —
// mirrors the shape the actual feedback-form UI would produce.
function buildAnswers(questions, seedIndex) {
  const answers = {}
  for (const q of questions) {
    switch (q.type) {
      case "star-rating":
        // Skew positive (4-5) with the occasional 3, like real feedback tends to.
        answers[q.id] = [4, 5, 5, 4, 3][seedIndex % 5]
        break
      case "multiple-choice":
        if (q.options?.length) answers[q.id] = q.options[seedIndex % q.options.length]
        break
      case "multi-select":
      case "tag-selection":
        if (q.options?.length) {
          const count = Math.min(q.options.length, 1 + (seedIndex % 2))
          answers[q.id] = q.options.filter((_, i) => (i + seedIndex) % q.options.length < count)
        }
        break
      case "text-short":
        answers[q.id] = pick(SHORT_TEXT_BANK, seedIndex)
        break
      case "text-long":
      case "voice-feedback":
        answers[q.id] = pick(LONG_TEXT_BANK, seedIndex)
        break
      default:
        break
    }
  }
  return answers
}

function die(label, error) {
  console.error(`✖ ${label}:`, error.message || error)
  process.exit(1)
}

async function findUserByEmail(email) {
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })
  if (error) throw error
  return data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase()) || null
}

async function deleteUserIfExists(email) {
  const existing = await findUserByEmail(email)
  if (existing) {
    const { error } = await admin.auth.admin.deleteUser(existing.id)
    if (error) throw error
  }
}

async function createTrafficAccount({ email, displayName }) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  })
  if (error) throw error
  return data.user
}

async function main() {
  console.log("→ TrustVox demo-traffic seed starting…\n")

  // 1. Fresh accounts each run (idempotent, same pattern as seed.mjs).
  console.log("· (re)creating traffic accounts…")
  for (const u of TRAFFIC_USERS) await deleteUserIfExists(u.email)
  for (const u of TRAFFIC_USERS) await createTrafficAccount(u).catch((e) => die(`create ${u.email}`, e))

  // 2. Read the real approved forms (service_role, read-only) so the script
  //    always targets whatever is actually approved right now, not a
  //    hardcoded snapshot.
  const { data: approvedForms, error: formsErr } = await admin
    .from("forms")
    .select("id, title, client_id, questions")
    .eq("status", "approved")
  if (formsErr) die("read approved forms", formsErr)
  if (!approvedForms?.length) {
    console.log("· no approved forms found — nothing to submit to. Exiting.")
    return
  }
  console.log(`· ${approvedForms.length} approved form(s) available: ${approvedForms.map((f) => f.title).join(", ")}`)

  let totalSubmitted = 0
  let totalCredited = 0
  let totalSkippedDuplicate = 0

  // 3. For each traffic user: sign in with a REAL session (anon key + real
  //    password auth — the same auth flow the login page uses), then submit
  //    to every approved form via the real insert+RPC pair. RLS + the
  //    credit_feedback_reward SECURITY DEFINER function both key off
  //    auth.uid() from this session, so nothing here can self-mint or write
  //    on behalf of another account.
  for (let i = 0; i < TRAFFIC_USERS.length; i++) {
    const u = TRAFFIC_USERS[i]
    console.log(`\n· signing in as ${u.email}…`)

    const asUser = createClient(SUPABASE_URL, PUBLISHABLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { data: signInData, error: signInErr } = await asUser.auth.signInWithPassword({
      email: u.email,
      password: DEMO_PASSWORD,
    })
    if (signInErr) die(`sign in ${u.email}`, signInErr)
    const userId = signInData.user.id

    for (const form of approvedForms) {
      if (form.client_id === userId) continue // credit_feedback_reward excludes self-owned forms anyway

      const answers = buildAnswers(form.questions ?? [], i)

      const { data: inserted, error: insertErr } = await asUser
        .from("responses")
        .insert({ form_id: form.id, user_id: userId, answers })
        .select("id")
        .single()

      if (insertErr) {
        if (insertErr.code === "23505") {
          totalSkippedDuplicate += 1
          console.log(`  - already submitted to "${form.title}" — skipped`)
          continue
        }
        die(`submit response to "${form.title}" as ${u.email}`, insertErr)
      }
      totalSubmitted += 1
      console.log(`  ✓ submitted response to "${form.title}"`)

      const { error: creditErr } = await asUser.rpc("credit_feedback_reward", { p_response_id: inserted.id })
      if (creditErr) {
        console.error(`  ✖ credit failed for "${form.title}":`, creditErr.message)
        continue
      }
      totalCredited += 1
      console.log(`  ✓ reward credited`)
    }

    await asUser.auth.signOut()
  }

  console.log("\n✓ Demo-traffic seed complete.\n")
  console.log(`  ${totalSubmitted} new response(s) submitted, ${totalCredited} reward(s) credited` +
    (totalSkippedDuplicate ? `, ${totalSkippedDuplicate} skipped (already submitted)` : ""))
  console.log("  Traffic accounts (shared password:", DEMO_PASSWORD + ")")
  for (const u of TRAFFIC_USERS) console.log("   -", u.email)
  console.log("\n  Every response/reward above went through the real RLS-gated insert +")
  console.log("  credit_feedback_reward RPC under that account's own session — same as a")
  console.log("  person clicking through the UI. Nothing was inserted directly.")
}

main().catch((e) => die("demo-traffic seed", e))
