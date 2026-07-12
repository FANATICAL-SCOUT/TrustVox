// ─── TrustVox Bookmark Store ───────────────────────────────────────────────
// Supabase-backed "save a feedback form for later" store.
// A bookmark is plain user-owned data (unlike the wallet/redemptions trusted
// paths): the user directly creates and removes their own rows, gated by the
// per-user RLS policies in migration 0011. All functions are async and run
// through the RLS-gated browser client; snake_case DB columns are mapped to the
// camelCase the UI expects at the boundary here.
import { createClient, getCachedUser, nextChannelId } from "@/lib/supabase/client"
import type { RealtimeChannel } from "@supabase/supabase-js"

// A bookmarked opportunity, joined with the live form so History/Suggested can
// render it without a second round-trip. `formMissing` is true when the form was
// deleted or is no longer approved — the row still exists (ON DELETE CASCADE only
// fires on a hard form delete), so the UI can show a tombstone rather than crash.
export interface Bookmark {
  id: string
  formId: string
  createdAt: string
  product: string
  company: string
  category: string
  description: string
  rewardTokens: number
  formStatus: string
  formMissing: boolean
}

function isBrowser() {
  return typeof window !== "undefined"
}

async function currentUserId(): Promise<string | null> {
  const supabase = createClient()
  const user = await getCachedUser(supabase)
  return user?.id ?? null
}

// The set of form ids the signed-in user has bookmarked — the cheap shape the
// Suggested grid needs to toggle each card's Bookmark button. Empty for a
// signed-out caller (RLS would return nothing anyway; this just skips the query).
export async function getBookmarkedFormIds(): Promise<Set<string>> {
  const supabase = createClient()
  const userId = await currentUserId()
  if (!userId) return new Set()

  const { data, error } = await supabase.from("bookmarks").select("form_id").eq("user_id", userId)
  if (error) throw error
  return new Set((data ?? []).map((row) => row.form_id))
}

// Full bookmark list for History's Bookmarked section, joined with each form's
// current details, newest-first. A form embed comes back null if the form no
// longer exists/loads under RLS (e.g. unapproved again) — surfaced as
// `formMissing` so the section can show an honest "no longer available" state.
export async function getBookmarks(): Promise<Bookmark[]> {
  const supabase = createClient()
  const userId = await currentUserId()
  if (!userId) return []

  const { data, error } = await supabase
    .from("bookmarks")
    .select("id, form_id, created_at, forms(product, client_name, category, description, reward_tokens, status)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
  if (error) throw error

  return (data ?? []).map((row) => {
    // The embedded form is an object (to-one FK) or null when unreadable.
    const form = (row as { forms: FormEmbed | null }).forms
    return {
      id: row.id,
      formId: row.form_id,
      createdAt: row.created_at,
      product: form?.product ?? "Feedback opportunity",
      company: form?.client_name ?? "",
      category: form?.category ?? "",
      description: form?.description ?? "",
      rewardTokens: form?.reward_tokens ?? 0,
      formStatus: form?.status ?? "",
      formMissing: !form,
    }
  })
}

type FormEmbed = {
  product: string
  client_name: string
  category: string
  description: string
  reward_tokens: number
  status: string
}

export async function addBookmark(formId: string): Promise<void> {
  const supabase = createClient()
  const userId = await currentUserId()
  if (!userId) throw new Error("You must be signed in to bookmark a feedback form.")

  const { error } = await supabase.from("bookmarks").insert({ user_id: userId, form_id: formId })
  // 23505 = the (user_id, form_id) unique — already bookmarked, treat as success
  // so a double-click / stale UI is idempotent, not an error.
  if (error && error.code !== "23505") throw error
}

export async function removeBookmark(formId: string): Promise<void> {
  const supabase = createClient()
  const userId = await currentUserId()
  if (!userId) throw new Error("You must be signed in to manage bookmarks.")

  const { error } = await supabase.from("bookmarks").delete().eq("user_id", userId).eq("form_id", formId)
  if (error) throw error
}

// Toggle helper for the Suggested card button. Returns the new bookmarked state
// so the caller can update its optimistic UI without a re-fetch.
export async function toggleBookmark(formId: string, currentlyBookmarked: boolean): Promise<boolean> {
  if (currentlyBookmarked) {
    await removeBookmark(formId)
    return false
  }
  await addBookmark(formId)
  return true
}

// Realtime: a bookmark insert/delete for the signed-in user updates every open
// view (Suggested toggle state, History's Bookmarked section) live. RLS scopes
// which rows a subscriber receives; the user_id filter just narrows the stream.
export function subscribeToBookmarkUpdates(callback: () => void) {
  if (!isBrowser()) return () => {}

  const supabase = createClient()
  let channel: RealtimeChannel | null = null
  let cancelled = false

  getCachedUser(supabase).then((user) => {
    if (cancelled || !user) return
    channel = supabase
      // Unique per subscription (see nextChannelId) — never reuse a channel name.
      .channel(`bookmark-updates-${user.id}-${nextChannelId()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookmarks", filter: `user_id=eq.${user.id}` },
        () => callback(),
      )
      .subscribe()
  })

  return () => {
    cancelled = true
    if (channel) void supabase.removeChannel(channel)
  }
}
