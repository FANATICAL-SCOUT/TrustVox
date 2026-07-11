// TrustVox — Phase 8.1 · Seed script (honest-by-construction)
//
// Ports the existing SEED_* constants from lib/*.ts into the real database:
//   • demo login accounts (1 per role) + responder accounts for historical feedback
//   • the full approved-company directory (← approved-company-store.ts)
//   • the 5 seed feedback forms (← feedback-store.ts SEED_FORMS)
//   • the 5 seed responses  (← feedback-store.ts SEED_RESPONSES)
//
// Honesty notes:
//   • Wallets start EMPTY — balance is derived (sum of transactions) and grows
//     only when a real submission credits TVX. No invented starting balance.
//   • response_count is DERIVED (form_response_counts view), so forms show the
//     real count of seeded responses, not the old hardcoded 47/63/89.
//
// Run with the service_role (secret) key — it bypasses RLS. This is a trusted
// server-side script; the key never reaches the browser.
//   node supabase/seed.mjs
//
// Idempotent: deletes the demo accounts (cascading their forms/responses) and
// clears the company directory first, then re-seeds. Safe to re-run.

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
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY

if (!SUPABASE_URL || !SECRET_KEY) {
  console.error("✖ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local")
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ── Demo accounts ─────────────────────────────────────────────────────────────
const DEMO_PASSWORD = "TrustVoxDemo!2026"

const ACCOUNTS = {
  admin:  { email: "demo.admin@trustvox.dev",  role: "admin",  displayName: "Aarav Sharma" },
  client: { email: "demo.client@trustvox.dev", role: "client", displayName: "Priya Nair" },
  user:   { email: "demo.user@trustvox.dev",   role: "user",   displayName: "Demo User" },
}

// Responder accounts own the historical seed responses (map: seed-user-N).
const RESPONDERS = [
  { key: "seed-user-1", email: "responder1@trustvox.dev", displayName: "Ravi Kumar" },
  { key: "seed-user-2", email: "responder2@trustvox.dev", displayName: "Emily Zhang" },
  { key: "seed-user-3", email: "responder3@trustvox.dev", displayName: "Marcus Bell" },
  { key: "seed-user-4", email: "responder4@trustvox.dev", displayName: "Ana Costa" },
  { key: "seed-user-5", email: "responder5@trustvox.dev", displayName: "Liam Patel" },
]

// Client-profile fields for the demo client (clearly a demo research account).
const CLIENT_PROFILE = {
  company_name: "TrustVox Demo Client",
  industry: "Market Research",
  company_size: "51-200",
  website: "https://trustvox.dev",
  contact_name: "Priya Nair",
  position: "Feedback Program Manager",
  description: "Demo client account used to showcase the TrustVox feedback-form workflow.",
  city: "Bengaluru",
  country: "India",
}

// ── Company directory (← approved-company-store.ts COMPANY_DATA / SEED_COMPANIES) ─
const COMPANY_DATA = [
  { category: "Software", names: ["Microsoft", "Google", "Apple", "Adobe", "Salesforce", "Oracle", "SAP", "IBM", "Atlassian", "Zoom"] },
  { category: "Service", names: ["Accenture", "Deloitte", "Tata Consultancy Services (TCS)", "Infosys", "Wipro", "Capgemini", "Cognizant", "HCL Technologies", "PwC", "EY"] },
  { category: "Mobile App", names: ["Meta", "Snap Inc.", "ByteDance", "Spotify", "Uber", "Airbnb", "Netflix", "Amazon", "LinkedIn", "Discord"] },
  { category: "Hardware", names: ["Intel", "AMD", "NVIDIA", "Samsung", "Sony", "HP", "Dell", "Lenovo", "Asus", "Cisco"] },
  { category: "E-Commerce", names: ["Amazon", "eBay", "Alibaba", "Flipkart", "Shopify", "Walmart", "Etsy", "Rakuten", "Target", "Best Buy"] },
  { category: "Food & Beverage", names: ["Nestlé", "Coca-Cola", "PepsiCo", "Starbucks", "McDonald's", "Unilever", "Danone", "Mondelez", "Kraft Heinz", "Red Bull"] },
  { category: "Healthcare", names: ["Pfizer", "Johnson & Johnson", "Roche", "Novartis", "Merck", "Abbott", "GSK", "Bayer", "Moderna", "Sanofi"] },
  { category: "Education", names: ["Coursera", "Udemy", "BYJU’S", "Khan Academy", "edX", "Duolingo", "Skillshare", "Chegg", "Unacademy", "FutureLearn"] },
  { category: "Finance", names: ["JPMorgan Chase", "Goldman Sachs", "Morgan Stanley", "HSBC", "Citi", "Bank of America", "PayPal", "Visa", "Mastercard", "American Express"] },
]

const SEED_COMPANIES = COMPANY_DATA.flatMap((group, groupIndex) =>
  group.names.map((name, index) => ({
    name,
    category: group.category,
    status: "active",
    date_added: new Date(Date.UTC(2025, Math.min(groupIndex, 11), Math.max(1, index + 1))).toISOString(),
  })),
)

// ── Seed forms (← feedback-store.ts SEED_FORMS), keyed by original seed id ────
const SEED_FORMS = [
  {
    seedId: "form-seed-1", brand: "Microsoft",
    title: "Product Experience Survey",
    description: "Help us understand your experience with our latest product release.",
    product: "TrustVox Pro", category: "Software", status: "approved",
    createdAt: "2026-03-10T09:00:00Z", submittedAt: "2026-03-11T10:00:00Z", approvedAt: "2026-03-12T14:00:00Z",
    rewardTokens: 40,
    questions: [
      { id: "q1", type: "star-rating", title: "How would you rate your overall experience?", required: true, options: [] },
      { id: "q2", type: "multiple-choice", title: "How did you hear about us?", required: false, options: ["Social Media", "Friend/Colleague", "Search Engine", "Advertisement"] },
      { id: "q3", type: "tag-selection", title: "What features do you love?", required: false, options: ["Easy to use", "Fast", "Reliable", "Great support", "Good value"] },
      { id: "q4", type: "text-long", title: "Any additional comments or suggestions?", required: false, options: [] },
    ],
  },
  {
    seedId: "form-seed-2", brand: "Unilever",
    title: "Customer Support Feedback",
    description: "Rate your recent interaction with our support team.",
    product: "Support Services", category: "Service", status: "pending",
    createdAt: "2026-03-14T11:00:00Z", submittedAt: "2026-03-15T09:00:00Z", approvedAt: null,
    rewardTokens: 28,
    questions: [
      { id: "q1", type: "star-rating", title: "Rate the support agent's helpfulness", required: true, options: [] },
      { id: "q2", type: "text-short", title: "What issue were you contacting us about?", required: true, options: [] },
    ],
  },
  {
    seedId: "form-seed-3", brand: "Samsung",
    title: "Mobile App Usability Check",
    description: "Quick usability check for our new mobile app.",
    product: "TrustVox Mobile", category: "Mobile App", status: "draft",
    createdAt: "2026-03-16T08:00:00Z", submittedAt: null, approvedAt: null,
    rewardTokens: 24,
    questions: [
      { id: "q1", type: "star-rating", title: "How easy is the app to navigate?", required: true, options: [] },
    ],
  },
  {
    seedId: "form-seed-4", brand: "Flipkart",
    title: "Seller Dashboard Feedback",
    description: "Help us improve the seller dashboard you use every day.",
    product: "Flipkart Seller Hub", category: "E-Commerce", status: "approved",
    createdAt: "2026-05-02T09:00:00Z", submittedAt: "2026-05-03T10:00:00Z", approvedAt: "2026-05-04T13:00:00Z",
    rewardTokens: 32,
    questions: [
      { id: "q1", type: "star-rating", title: "How would you rate the new seller dashboard?", required: true, options: [] },
      { id: "q2", type: "multi-select", title: "Which sections do you use most?", required: false, options: ["Orders", "Inventory", "Payments", "Analytics", "Returns"] },
      { id: "q3", type: "text-short", title: "What's one thing that would make the dashboard faster to use?", required: false, options: [] },
    ],
  },
  {
    seedId: "form-seed-5", brand: "Starbucks",
    title: "Rewards App Experience",
    description: "Share your experience with the redesigned Rewards app.",
    product: "Starbucks Rewards App", category: "Food & Beverage", status: "approved",
    createdAt: "2026-05-10T09:00:00Z", submittedAt: "2026-05-11T10:00:00Z", approvedAt: "2026-05-12T13:00:00Z",
    rewardTokens: 20,
    questions: [
      { id: "q1", type: "star-rating", title: "How satisfied are you with the Rewards app?", required: true, options: [] },
      { id: "q2", type: "multiple-choice", title: "How often do you redeem rewards?", required: false, options: ["Every visit", "Weekly", "Monthly", "Rarely"] },
      { id: "q3", type: "voice-feedback", title: "Tell us about your last redemption experience", required: false, options: [] },
      { id: "q4", type: "text-long", title: "Anything you'd like to see added to the app?", required: false, options: [] },
    ],
  },
]

// ── Seed responses (← feedback-store.ts SEED_RESPONSES) ──────────────────────
const SEED_RESPONSES = [
  { formSeedId: "form-seed-1", responderKey: "seed-user-1", submittedAt: "2026-06-20T14:32:00Z", rewardTokens: 40,
    answers: { q4: "The dashboard redesign feels a lot snappier than before. Great work on the loading times!", q1: 5, q2: "Search Engine", q3: ["Easy to use", "Reliable"] } },
  { formSeedId: "form-seed-1", responderKey: "seed-user-2", submittedAt: "2026-06-25T09:10:00Z", rewardTokens: 40,
    answers: { q4: "Support resolved my billing question within minutes. Would love a dark mode toggle though.", q1: 4, q2: "Friend/Colleague", q3: ["Fast", "Great support"] } },
  { formSeedId: "form-seed-4", responderKey: "seed-user-3", submittedAt: "2026-06-22T11:05:00Z", rewardTokens: 32,
    answers: { q1: 4, q2: ["Orders", "Analytics"], q3: "Bulk-editing prices across listings would save me a ton of time." } },
  { formSeedId: "form-seed-5", responderKey: "seed-user-4", submittedAt: "2026-06-28T16:45:00Z", rewardTokens: 20,
    answers: { q4: "Would love seasonal drink previews inside the app before they launch in stores.", q1: 5, q2: "Every visit", q3: "Redeemed a free drink this morning, the scan-to-pay flow was seamless." } },
  { formSeedId: "form-seed-5", responderKey: "seed-user-5", submittedAt: "2026-06-30T08:20:00Z", rewardTokens: 20,
    answers: { q4: "Star balance sometimes takes a day to update after purchase.", q1: 3, q2: "Monthly" } },
]

// ── Helpers ──────────────────────────────────────────────────────────────────
async function findUserByEmail(email) {
  // <10 seed users, so a single page is plenty.
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

async function createAccount({ email, role, displayName }) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  })
  if (error) throw error
  // The handle_new_user trigger creates the profile as 'user' (least privilege;
  // it deliberately ignores client-supplied role). Elevate privileged roles here
  // through the trusted service-role path — the same shape 8.2 uses for real
  // client registration. 'user' accounts need no change.
  if (role !== "user") {
    const { error: roleErr } = await admin.from("profiles").update({ role }).eq("id", data.user.id)
    if (roleErr) throw roleErr
  }
  return data.user
}

function die(label, error) {
  console.error(`✖ ${label}:`, error.message || error)
  process.exit(1)
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("→ TrustVox seed starting…\n")

  // 1. Clean slate (idempotent). Deleting the auth users cascades their
  //    profiles → forms → responses via ON DELETE CASCADE.
  console.log("· clearing previous seed…")
  const allEmails = [
    ...Object.values(ACCOUNTS).map((a) => a.email),
    ...RESPONDERS.map((r) => r.email),
  ]
  for (const email of allEmails) await deleteUserIfExists(email)
  {
    const { error } = await admin.from("companies").delete().neq("id", "00000000-0000-0000-0000-000000000000")
    if (error) die("clearing companies", error)
  }

  // 2. Accounts
  console.log("· creating demo accounts…")
  const admin_ = await createAccount(ACCOUNTS.admin).catch((e) => die("create admin", e))
  const client_ = await createAccount(ACCOUNTS.client).catch((e) => die("create client", e))
  const user_ = await createAccount(ACCOUNTS.user).catch((e) => die("create user", e))

  // client-profile fields
  {
    const { error } = await admin.from("profiles").update(CLIENT_PROFILE).eq("id", client_.id)
    if (error) die("client profile fields", error)
  }

  console.log("· creating responder accounts…")
  const responderIdByKey = {}
  for (const r of RESPONDERS) {
    const u = await createAccount({ email: r.email, role: "user", displayName: r.displayName }).catch((e) =>
      die(`create ${r.email}`, e),
    )
    responderIdByKey[r.key] = u.id
  }

  // 3. Company directory
  console.log(`· inserting ${SEED_COMPANIES.length} companies…`)
  const { data: companyRows, error: coErr } = await admin.from("companies").insert(SEED_COMPANIES).select("id,name")
  if (coErr) die("insert companies", coErr)
  const companyIdByName = {}
  for (const row of companyRows) if (!(row.name in companyIdByName)) companyIdByName[row.name] = row.id

  // 4. Forms (owned by the demo client; company_id resolved by brand name)
  console.log(`· inserting ${SEED_FORMS.length} forms…`)
  const formIdBySeedId = {}
  for (const f of SEED_FORMS) {
    const row = {
      title: f.title,
      description: f.description,
      product: f.product,
      category: f.category,
      company_id: companyIdByName[f.brand] ?? null,
      client_id: client_.id,
      client_name: f.brand,
      status: f.status,
      visibility: "private",
      allow_anonymous: true,
      enable_ratings: true,
      questions: f.questions,
      reward_tokens: f.rewardTokens,
      created_at: f.createdAt,
      submitted_at: f.submittedAt,
      approved_at: f.approvedAt,
    }
    const { data, error } = await admin.from("forms").insert(row).select("id").single()
    if (error) die(`insert form ${f.seedId}`, error)
    formIdBySeedId[f.seedId] = data.id
  }

  // 5. Responses (by responder accounts) — real rows so counts derive honestly
  console.log(`· inserting ${SEED_RESPONSES.length} responses…`)
  const responseRows = SEED_RESPONSES.map((r) => ({
    form_id: formIdBySeedId[r.formSeedId],
    user_id: responderIdByKey[r.responderKey],
    answers: r.answers,
    reward_tokens: r.rewardTokens,
    submitted_at: r.submittedAt,
  }))
  {
    const { error } = await admin.from("responses").insert(responseRows)
    if (error) die("insert responses", error)
  }

  console.log("\n✓ Seed complete.\n")
  console.log("  Demo logins (shared password:", DEMO_PASSWORD + ")")
  console.log("   admin :", ACCOUNTS.admin.email)
  console.log("   client:", ACCOUNTS.client.email)
  console.log("   user  :", ACCOUNTS.user.email)
  console.log("\n  Wallets start empty (balance is derived); forms show real")
  console.log("  response counts (2 / 1 / 2 / 0 / 0), not fabricated totals.")
}

main().catch((e) => die("seed", e))
