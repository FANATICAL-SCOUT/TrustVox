import { createBrowserClient } from "@supabase/ssr"
import type { SupabaseClient, User } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"

// A single browser client per tab. `createBrowserClient` is designed to be a
// singleton — calling it repeatedly still returns the same underlying instance,
// but memoizing here also lets us hang a per-client user cache off a stable
// reference (see getCachedUser). Every store module calls createClient(); they
// now all share one client + one cached auth lookup.
let browserClient: SupabaseClient<Database> | null = null

export function createClient(): SupabaseClient<Database> {
  if (browserClient) return browserClient
  browserClient = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  )
  return browserClient
}

// ── Cached auth lookup (Phase 9 · Session 6 perf fix) ───────────────────────
// supabase.auth.getUser() is a NETWORK round-trip: it validates the JWT against
// the Auth server (~135ms each), not a local cookie read. Store functions each
// called it independently, so one dashboard mount fired it 8–10 times serially
// = 1–1.5s of pure auth overhead. We memoize the resolved user per client
// instance so those collapse to a single round-trip. The cache is invalidated
// on any auth state change (sign in/out/token refresh), so it never serves a
// stale identity — RLS remains the real security boundary regardless.
const userCache = new WeakMap<SupabaseClient<Database>, Promise<User | null>>()
let authListenerBound = false

export async function getCachedUser(client: SupabaseClient<Database>): Promise<User | null> {
  if (typeof window !== "undefined" && !authListenerBound) {
    authListenerBound = true
    // Any auth transition drops the cache so the next read re-validates.
    client.auth.onAuthStateChange(() => userCache.delete(client))
  }

  const cached = userCache.get(client)
  if (cached) return cached

  const pending = client.auth.getUser().then(({ data }) => data.user ?? null)
  userCache.set(client, pending)
  // If the lookup rejects, evict so a retry isn't stuck on a failed promise.
  pending.catch(() => userCache.delete(client))
  return pending
}

// Monotonic per-tab counter for Realtime channel names. Supabase throws
// "cannot add postgres_changes callbacks ... after subscribe()" if two
// subscriptions reuse the same channel name (the second `.channel(name)`
// returns the already-subscribed instance). Two components subscribing to the
// same store at once — or React StrictMode double-invoking an effect in dev —
// hits exactly that. Appending a unique id makes every subscription its own
// channel; RLS + the postgres_changes filter still do the real row scoping, so
// the name is only an identifier.
let channelSeq = 0
export function nextChannelId(): number {
  channelSeq += 1
  return channelSeq
}
