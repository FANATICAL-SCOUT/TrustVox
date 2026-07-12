// ─── TrustVox User Notifications ────────────────────────────────────────────
// Supabase-backed notifications. Rows map straight to the `notifications`
// table; dedup for system-generated notices (which forms already got a
// "new opportunity" notice, whether today's streak warning already fired) is
// derived by reading the user's own existing rows instead of separate local
// bookkeeping.
//
// Reward timing note: the TVX credit for a submitted response happens
// immediately via the trusted `credit_feedback_reward` path, so this fires a
// single honest "reward credited" notification right after submission — there
// is no simulated pending/24h-delay step anymore.
import { createClient, getCachedUser, nextChannelId } from "@/lib/supabase/client"
import type { Tables } from "@/lib/supabase/types"
import type { RealtimeChannel } from "@supabase/supabase-js"
import { getApprovedForms } from "@/lib/feedback-store"
import { getFeedbackQuota } from "@/lib/feedback-quota"

export type UserNotificationType =
  | "reward_pending"
  | "reward_credited"
  | "reward_redeemed"
  | "new_opportunity"
  | "streak_risk"

export type UserNotification = {
  id: string
  type: UserNotificationType
  title: string
  message: string
  createdAt: string
  isRead: boolean
  action?: {
    route?: string
    formId?: string
  }
}

function todayKey() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function dateKeyFromIso(iso: string) {
  const date = new Date(iso)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

async function getCurrentUserId(): Promise<string | null> {
  const supabase = createClient()
  const user = await getCachedUser(supabase)
  return user?.id ?? null
}

function mapNotification(row: Tables<"notifications">): UserNotification {
  const action = row.action as { route?: string; formId?: string } | null
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message,
    createdAt: row.created_at,
    isRead: row.is_read,
    action: action ?? undefined,
  }
}

export async function getUserNotifications(): Promise<UserNotification[]> {
  const userId = await getCurrentUserId()
  if (!userId) return []

  const supabase = createClient()
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return (data ?? []).map(mapNotification)
}

export async function getUnreadNotificationsCount(): Promise<number> {
  const notifications = await getUserNotifications()
  return notifications.filter((item) => !item.isRead).length
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", notificationId)
  if (error) throw error
}

export async function markAllNotificationsAsRead(): Promise<void> {
  const userId = await getCurrentUserId()
  if (!userId) return

  const supabase = createClient()
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false)

  if (error) throw error
}

export async function recordFeedbackSubmittedNotification(tokens = 24): Promise<void> {
  const userId = await getCurrentUserId()
  if (!userId) return

  const supabase = createClient()
  const { error } = await supabase.from("notifications").insert({
    user_id: userId,
    type: "reward_credited",
    title: "Reward Credited ✅",
    message: `Your ${tokens} TVX token${tokens !== 1 ? "s" : ""} have been credited to your wallet!`,
  })

  if (error) throw error
}

export async function recordStoreRedemptionNotification(
  itemTitle: string,
  cost: number,
  remainingBalance: number,
): Promise<void> {
  const userId = await getCurrentUserId()
  if (!userId) return

  const supabase = createClient()
  const { error } = await supabase.from("notifications").insert({
    user_id: userId,
    type: "reward_redeemed",
    title: "Reward Redeemed",
    message: `You redeemed ${itemTitle} for ${cost} TVX. Remaining balance: ${remainingBalance} TVX.`,
    action: { route: "/user/store" },
  })

  if (error) throw error
}

// The page and UserNavbar both call this independently on mount, so without
// this guard two concurrent calls read the same "existing" snapshot before
// either has inserted anything and both generate the same system
// notifications — real DB inserts (unlike the old single-blob localStorage
// write) turn that race into visible duplicates. Coalescing concurrent calls
// into one in-flight request closes the common same-tab race; a cross-tab race
// remains possible (two tabs both insert before either sees the other's row
// via Realtime) but is rare and not user-visible beyond a duplicate notice.
let refreshInFlight: Promise<UserNotification[]> | null = null

export function refreshSystemNotifications(): Promise<UserNotification[]> {
  if (refreshInFlight) return refreshInFlight
  refreshInFlight = doRefreshSystemNotifications().finally(() => {
    refreshInFlight = null
  })
  return refreshInFlight
}

async function doRefreshSystemNotifications(): Promise<UserNotification[]> {
  const userId = await getCurrentUserId()
  if (!userId) return []

  // These three reads are independent — fetch them in parallel instead of
  // waterfalling (was existing → forms → quota serially, ~3 extra round-trips
  // deep).
  const [existing, approvedForms, quota] = await Promise.all([
    getUserNotifications(),
    getApprovedForms(),
    getFeedbackQuota(),
  ])

  const notifiedFormIds = new Set(
    existing
      .filter((item) => item.type === "new_opportunity")
      .map((item) => item.action?.formId)
      .filter((formId): formId is string => Boolean(formId)),
  )
  const unseenForms = approvedForms.filter((form) => !notifiedFormIds.has(form.id))

  const supabase = createClient()

  if (unseenForms.length > 0) {
    const { error } = await supabase.from("notifications").insert(
      unseenForms.map((form) => ({
        user_id: userId,
        type: "new_opportunity" as const,
        title: "New Feedback Opportunity",
        message: `${form.clientName} published a new survey for ${form.product}. Give feedback and earn rewards.`,
        action: { route: `/user/feedback/${form.id}`, formId: form.id },
      })),
    )
    if (error) throw error
  }

  const today = todayKey()
  const warnedToday = existing.some(
    (item) => item.type === "streak_risk" && dateKeyFromIso(item.createdAt) === today,
  )

  // quota was fetched in parallel above.
  const shouldWarnForStreak = quota.streakCount > 0 && quota.lastSubmittedDate !== today && !warnedToday

  if (shouldWarnForStreak) {
    const { error } = await supabase.from("notifications").insert({
      user_id: userId,
      type: "streak_risk",
      title: "Streak At Risk",
      message: `You are on a ${quota.streakCount}-day streak. Submit feedback today to keep it alive.`,
      action: { route: "/user/dashboard?section=suggested" },
    })
    if (error) throw error
  }

  if (unseenForms.length > 0 || shouldWarnForStreak) {
    return getUserNotifications()
  }

  return existing
}

// Realtime broadcast for notification changes: any insert or update on the
// caller's own `notifications` rows notifies every
// subscriber, across tabs. RLS already scopes reads to `auth.uid()`; the
// `user_id=eq.<uid>` filter here just avoids subscribing to a broader stream.
export function subscribeToUserNotifications(onUpdate: (notifications: UserNotification[]) => void) {
  if (typeof window === "undefined") return () => {}

  const supabase = createClient()
  let channel: RealtimeChannel | null = null
  let cancelled = false

  const emit = () => void getUserNotifications().then(onUpdate)

  getCachedUser(supabase).then((user) => {
    if (cancelled || !user) return
    channel = supabase
      // Unique per subscription (see nextChannelId) — never reuse a channel name.
      .channel(`user-notifications-updates-${user.id}-${nextChannelId()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        emit,
      )
      .subscribe()
  })

  return () => {
    cancelled = true
    if (channel) void supabase.removeChannel(channel)
  }
}
