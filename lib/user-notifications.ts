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

type PendingReward = {
  rewardId: string
  tokens: number
  releaseAt: string
}

type NotificationState = {
  notifications: UserNotification[]
  pendingRewards: PendingReward[]
  seenOpportunityIds: string[]
  lastStreakRiskDate: string | null
}

const NOTIFICATION_KEY_PREFIX = "trustvox:user-notifications:v1:"
const NOTIFICATION_UPDATED_EVENT = "trustvox:user-notifications-updated"

function todayKey() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function getStorageKey() {
  if (typeof window === "undefined") return `${NOTIFICATION_KEY_PREFIX}anonymous`

  const userRaw = localStorage.getItem("currentUser")
  const user = safeParse<Record<string, unknown>>(userRaw)
  const identity = String(user?.email || user?.name || "anonymous").trim().toLowerCase()
  return `${NOTIFICATION_KEY_PREFIX}${identity || "anonymous"}`
}

function normalizeState(state: NotificationState | null): NotificationState {
  if (!state) {
    return {
      notifications: [],
      pendingRewards: [],
      seenOpportunityIds: [],
      lastStreakRiskDate: null,
    }
  }

  return {
    notifications: Array.isArray(state.notifications) ? state.notifications : [],
    pendingRewards: Array.isArray(state.pendingRewards) ? state.pendingRewards : [],
    seenOpportunityIds: Array.isArray(state.seenOpportunityIds) ? state.seenOpportunityIds : [],
    lastStreakRiskDate: typeof state.lastStreakRiskDate === "string" ? state.lastStreakRiskDate : null,
  }
}

function writeState(state: NotificationState) {
  if (typeof window === "undefined") return

  localStorage.setItem(getStorageKey(), JSON.stringify(state))
  window.dispatchEvent(new CustomEvent(NOTIFICATION_UPDATED_EVENT))
}

function readState() {
  if (typeof window === "undefined") return normalizeState(null)

  const raw = localStorage.getItem(getStorageKey())
  const parsed = safeParse<NotificationState>(raw)
  const normalized = normalizeState(parsed)

  if (!parsed || JSON.stringify(parsed) !== JSON.stringify(normalized)) {
    writeState(normalized)
  }

  return normalized
}

function pushNotification(
  state: NotificationState,
  notification: Omit<UserNotification, "id" | "createdAt" | "isRead">
) {
  const entry: UserNotification = {
    id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
    isRead: false,
    ...notification,
  }

  return {
    ...state,
    notifications: [entry, ...state.notifications],
  }
}

export function getUserNotifications() {
  const state = readState()
  return [...state.notifications].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
}

export function getUnreadNotificationsCount() {
  return getUserNotifications().filter((item) => !item.isRead).length
}

export function markNotificationAsRead(notificationId: string) {
  const state = readState()
  const next = {
    ...state,
    notifications: state.notifications.map((item) =>
      item.id === notificationId ? { ...item, isRead: true } : item
    ),
  }
  writeState(next)
}

export function markAllNotificationsAsRead() {
  const state = readState()
  const next = {
    ...state,
    notifications: state.notifications.map((item) => ({ ...item, isRead: true })),
  }
  writeState(next)
}

export function recordFeedbackSubmittedNotification(tokens = 24) {
  const state = readState()
  const rewardId = `reward-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const releaseAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

  const withCongrats = pushNotification(state, {
    type: "reward_pending",
    title: "Survey Completed 🎉",
    message: `Congratulations on completing the survey! You've earned ${tokens} TVX token${tokens !== 1 ? "s" : ""}. Your reward will be released in 24 hours.`,
  })

  const next = {
    ...withCongrats,
    pendingRewards: [...withCongrats.pendingRewards, { rewardId, tokens, releaseAt }],
  }

  writeState(next)
}

export function recordStoreRedemptionNotification(itemTitle: string, cost: number, remainingBalance: number) {
  const state = readState()

  const next = pushNotification(state, {
    type: "reward_redeemed",
    title: "Reward Redeemed",
    message: `You redeemed ${itemTitle} for ${cost} TVX. Remaining balance: ${remainingBalance} TVX.`,
    action: {
      route: "/store",
    },
  })

  writeState(next)
}

export function refreshSystemNotifications() {
  let state = readState()
  const nowMs = Date.now()

  const dueRewards = state.pendingRewards.filter((reward) => Date.parse(reward.releaseAt) <= nowMs)
  if (dueRewards.length > 0) {
    dueRewards.forEach((reward) => {
      state = pushNotification(state, {
        type: "reward_credited",
        title: "Reward Credited ✅",
        message: `Your ${reward.tokens} TVX token${reward.tokens !== 1 ? "s" : ""} have been credited to your wallet!`,
      })
    })

    state = {
      ...state,
      pendingRewards: state.pendingRewards.filter((reward) => Date.parse(reward.releaseAt) > nowMs),
    }
  }

  const approvedForms = getApprovedForms()
  const unseenForms = approvedForms.filter((form) => !state.seenOpportunityIds.includes(form.id))
  if (unseenForms.length > 0) {
    unseenForms.forEach((form) => {
      state = pushNotification(state, {
        type: "new_opportunity",
        title: "New Feedback Opportunity",
        message: `${form.clientName} published a new survey for ${form.product}. Give feedback and earn rewards.`,
        action: {
          route: `/user/feedback/${form.id}`,
          formId: form.id,
        },
      })
    })

    state = {
      ...state,
      seenOpportunityIds: Array.from(new Set([...state.seenOpportunityIds, ...unseenForms.map((form) => form.id)])),
    }
  }

  const quota = getFeedbackQuota()
  const today = todayKey()
  const shouldWarnForStreak =
    quota.streakCount > 0 && quota.lastSubmittedDate !== today && state.lastStreakRiskDate !== today

  if (shouldWarnForStreak) {
    state = pushNotification(state, {
      type: "streak_risk",
      title: "Streak At Risk",
      message: `You are on a ${quota.streakCount}-day streak. Submit feedback today to keep it alive.`,
      action: {
        route: "/user/feedbacks",
      },
    })
    state = {
      ...state,
      lastStreakRiskDate: today,
    }
  }

  writeState(state)
  return getUserNotifications()
}

export function subscribeToUserNotifications(onUpdate: (notifications: UserNotification[]) => void) {
  if (typeof window === "undefined") return () => {}

  const emit = () => onUpdate(getUserNotifications())

  const handleStorage = (event: StorageEvent) => {
    if (event.key && event.key.startsWith(NOTIFICATION_KEY_PREFIX)) {
      emit()
    }
  }

  window.addEventListener(NOTIFICATION_UPDATED_EVENT, emit)
  window.addEventListener("storage", handleStorage)

  return () => {
    window.removeEventListener(NOTIFICATION_UPDATED_EVENT, emit)
    window.removeEventListener("storage", handleStorage)
  }
}
