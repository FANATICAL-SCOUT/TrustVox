import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"

/**
 * Service-role Supabase client — bypasses RLS. SERVER-ONLY.
 *
 * Uses the SECRET key (never `NEXT_PUBLIC_*`), so this file must never be
 * imported from a client component. Its only legitimate callers are the two
 * signup route handlers (app/api/register-user, app/api/register-client) and
 * the manual admin provisioning script (scripts/provision-admin.mjs).
 *
 * No session is persisted or refreshed — this client acts as the trusted
 * server identity, not a logged-in user. It is what makes the "role elevation"
 * path trusted: RLS pins `profiles.role`, so setting role='client'/'admin' can
 * only happen through a holder of the secret key.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const secretKey = process.env.SUPABASE_SECRET_KEY

  if (!url || !secretKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY (server env).")
  }

  return createClient<Database>(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
