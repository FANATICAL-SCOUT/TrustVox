// ─── TrustVox User Notifications ────────────────────────────────────────────
// Supabase-backed notifications (migrated in Phase 8.6 — see
// ARCHITECTURE.md §4, §6, §8). Rows map straight to the `notifications` table;
// dedup for system-generated notices (which forms already got a
// "new opportunity" notice, whether today's streak warning already fired) is
// derived by reading the user's own existing rows instead of separate local
// bookkeeping.
//
// Reward timing note: the TVX credit for a submitted response happens
// immediately via the trusted `credit_feedback_reward` path (Phase 8.4), so
// this fires a single honest "reward credited" notification right after
// submission — there is no simulated pending/24h-delay step anymore.
import { createClient } from "@/lib/supabase/client"
import type { Tables } from "@/lib/supabase/types"
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

const NOTIFICATION_UPDATED_EVENT = "trustvox:user-notifications-updated"

function emitNotificationsUpdate() {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(NOTIFICATION_UPDATED_EVENT))
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
  const {
    data: { user },
  } = await supabase.auth.getUser()
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
  emitNotificationsUpdate()
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
  emitNotificationsUpdate()
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
  emitNotificationsUpdate()
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
  emitNotificationsUpdate()
}

// The page and UserNavbar both call this independently on mount, so without
// this guard two concurrent calls read the same "existing" snapshot before
// either has inserted anything and both generate the same system
// notifications — real DB inserts (unlike the old single-blob localStorage
// write) turn that race into visible duplicates. Coalescing concurrent calls
// into one in-flight request closes the common same-tab race; the residual
// cross-tab race is rarer and left to the Realtime rework in 8.7.
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

  const existing = await getUserNotifications()

  const notifiedFormIds = new Set(
    existing
      .filter((item) => item.type === "new_opportunity")
      .map((item) => item.action?.formId)
      .filter((formId): formId is string => Boolean(formId)),
  )
  const approvedForms = await getApprovedForms()
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

  const quota = await getFeedbackQuota()
  const shouldWarnForStreak = quota.streakCount > 0 && quota.lastSubmittedDate !== today && !warnedToday

  if (shouldWarnForStreak) {
    const { error } = await supabase.from("notifications").insert({
      user_id: userId,
      type: "streak_risk",
      title: "Streak At Risk",
      message: `You are on a ${quota.streakCount}-day streak. Submit feedback today to keep it alive.`,
      action: { route: "/user/feedbacks" },
    })
    if (error) throw error
  }

  if (unseenForms.length > 0 || shouldWarnForStreak) {
    emitNotificationsUpdate()
    return getUserNotifications()
  }

  return existing
}

export function subscribeToUserNotifications(onUpdate: (notifications: UserNotification[]) => void) {
  if (typeof window === "undefined") return () => {}

  const emit = () => void getUserNotifications().then(onUpdate)

  window.addEventListener(NOTIFICATION_UPDATED_EVENT, emit)
  return () => {
    window.removeEventListener(NOTIFICATION_UPDATED_EVENT, emit)
  }
}
