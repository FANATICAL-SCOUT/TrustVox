// TrustVox — Manual admin provisioning
//
// Admins are NEVER self-service: there is no admin signup,
// and role='admin' can only be set by a holder of the secret key. This script
// is that holder. It creates one admin account from human-chosen credentials in
// the git-ignored .env.local — nothing is auto-generated and nothing is committed.
//
//   1. Add to .env.local (git-ignored):
//        ADMIN_BOOTSTRAP_EMAIL=you@example.com
//        ADMIN_BOOTSTRAP_PASSWORD=<a strong password you choose>
//   2. Run:  node scripts/provision-admin.mjs
//
// Idempotent-ish: if the email already exists it elevates that account to admin
// rather than erroring, so re-running is safe.

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
const ADMIN_EMAIL = process.env.ADMIN_BOOTSTRAP_EMAIL
const ADMIN_PASSWORD = process.env.ADMIN_BOOTSTRAP_PASSWORD

function die(label, error) {
  console.error(`✖ ${label}:`, error?.message || error)
  process.exit(1)
}

if (!SUPABASE_URL || !SECRET_KEY) {
  die("config", "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local")
}
if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  die("config", "Missing ADMIN_BOOTSTRAP_EMAIL or ADMIN_BOOTSTRAP_PASSWORD in .env.local")
}
if (ADMIN_PASSWORD.length < 8) {
  die("config", "ADMIN_BOOTSTRAP_PASSWORD must be at least 8 characters.")
}

const admin = createClient(SUPABASE_URL, SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function findUserByEmail(email) {
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })
  if (error) throw error
  return data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase()) || null
}

async function main() {
  console.log(`→ Provisioning admin: ${ADMIN_EMAIL}\n`)

  let user = await findUserByEmail(ADMIN_EMAIL).catch((e) => die("lookup", e))

  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: { display_name: "Administrator" },
    })
    if (error) die("create admin user", error)
    user = data.user
    console.log("· account created")
  } else {
    console.log("· account already exists — elevating to admin")
  }

  // Trusted elevation via the secret key (bypasses RLS, which pins role).
  const { error: roleErr } = await admin.from("profiles").update({ role: "admin" }).eq("id", user.id)
  if (roleErr) die("set role=admin", roleErr)

  console.log("\n✓ Admin ready. Sign in at /admin-login with the credentials from .env.local.")
}

main().catch((e) => die("provision-admin", e))
