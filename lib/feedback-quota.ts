// ─── TrustVox Feedback Quota ────────────────────────────────────────────────
// Supabase-backed daily submission quota (migrated in Phase 8.6 — see
// ARCHITECTURE.md §4, §8). Every field is DERIVED from the user's own
// `responses` rows on every call — there is no separate quota table and
// nothing is cached locally, so the numbers can never drift from what was
// actually submitted.
import { createClient, nextChannelId } from "@/lib/supabase/client"
import type { RealtimeChannel } from "@supabase/supabase-js"

const FREE_USER_DAILY_LIMIT = 3

export type FeedbackQuotaResult = {
  dailyLimit: number
  remaining: number
  completedToday: number
  completedTotal: number
  streakCount: number
  lastSubmittedDate: string | null
  canSubmit: boolean
}

const EMPTY_QUOTA: FeedbackQuotaResult = {
  dailyLimit: FREE_USER_DAILY_LIMIT,
  remaining: FREE_USER_DAILY_LIMIT,
  completedToday: 0,
  completedTotal: 0,
  streakCount: 0,
  lastSubmittedDate: null,
  canSubmit: true,
}

function formatDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function todayKey() {
  return formatDateKey(new Date())
}

function shiftDateKey(key: string, deltaDays: number) {
  const [year, month, day] = key.split("-").map(Number)
  const date = new Date(year, month - 1, day)
  date.setDate(date.getDate() + deltaDays)
  return formatDateKey(date)
}

// Consecutive-day streak ending at today or yesterday. If the most recent
// submission is older than yesterday the streak is honestly broken (0), not
// a stale number carried forward from a previous session.
function computeStreak(dateSet: Set<string>, today: string): number {
  if (dateSet.size === 0) return 0

  const mostRecent = [...dateSet].sort().at(-1)!
  const yesterday = shiftDateKey(today, -1)
  if (mostRecent !== today && mostRecent !== yesterday) return 0

  let streak = 0
  let cursor = mostRecent
  while (dateSet.has(cursor)) {
    streak += 1
    cursor = shiftDateKey(cursor, -1)
  }
  return streak
}

export async function getFeedbackQuota(): Promise<FeedbackQuotaResult> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return EMPTY_QUOTA

  const { data, error } = await supabase.from("responses").select("submitted_at").eq("user_id", user.id)
  if (error) throw error

  const dateKeys = (data ?? []).map((row) => formatDateKey(new Date(row.submitted_at)))
  const dateSet = new Set(dateKeys)
  const today = todayKey()

  const completedToday = dateKeys.filter((key) => key === today).length
  const completedTotal = dateKeys.length
  const lastSubmittedDate = dateSet.size > 0 ? [...dateSet].sort().at(-1)! : null
  const streakCount = computeStreak(dateSet, today)
  const remaining = Math.max(0, FREE_USER_DAILY_LIMIT - completedToday)

  return {
    dailyLimit: FREE_USER_DAILY_LIMIT,
    remaining,
    completedToday,
    completedTotal,
    streakCount,
    lastSubmittedDate,
    canSubmit: remaining > 0,
  }
}

// The real write already happened via addResponse — this just recomputes the
// derived quota. `ok` is kept for call-site parity with the pre-migration
// API; nothing reads it today since the actual submit gate is the
// `canSubmit` check before addResponse runs.
export async function consumeFeedbackQuota(): Promise<{ ok: boolean; quota: FeedbackQuotaResult }> {
  const quota = await getFeedbackQuota()
  return { ok: quota.canSubmit, quota }
}

// Realtime replaces the old same-tab CustomEvent bus (Phase 8.7). Quota has no
// table of its own — it's derived from `responses` — so a new response row
// for the signed-in user triggers a fresh `getFeedbackQuota()` recompute,
// across tabs. RLS already scopes reads to the caller's own rows.
export function subscribeToFeedbackQuotaUpdates(onUpdate: (quota: FeedbackQuotaResult) => void) {
  if (typeof window === "undefined") return () => {}

  const supabase = createClient()
  let channel: RealtimeChannel | null = null
  let cancelled = false

  const emit = () => void getFeedbackQuota().then(onUpdate)

  supabase.auth.getUser().then(({ data: { user } }) => {
    if (cancelled || !user) return
    channel = supabase
      // Unique per subscription (see nextChannelId) — never reuse a channel name.
      .channel(`feedback-quota-updates-${user.id}-${nextChannelId()}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "responses", filter: `user_id=eq.${user.id}` },
        emit,
      )
      .subscribe()
  })

  return () => {
    cancelled = true
    if (channel) void supabase.removeChannel(channel)
  }
}
