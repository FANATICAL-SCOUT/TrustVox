import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "@/lib/supabase/types"

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  )
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
