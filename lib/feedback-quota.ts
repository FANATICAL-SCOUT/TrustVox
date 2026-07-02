const FREE_USER_DAILY_LIMIT = 3
const QUOTA_STORAGE_PREFIX = "trustvox:feedback-quota:v1:"
const QUOTA_UPDATED_EVENT = "trustvox:feedback-quota-updated"

type FeedbackQuotaState = {
  date: string
  remaining: number
  completedToday: number
  completedTotal: number
  streakCount: number
  lastSubmittedDate: string | null
}

type FeedbackQuotaResult = {
  dailyLimit: number
  remaining: number
  completedToday: number
  completedTotal: number
  streakCount: number
  lastSubmittedDate: string | null
  canSubmit: boolean
}

function yesterdayKey() {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const year = yesterday.getFullYear()
  const month = String(yesterday.getMonth() + 1).padStart(2, "0")
  const day = String(yesterday.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

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

function getUserQuotaStorageKey() {
  if (typeof window === "undefined") return `${QUOTA_STORAGE_PREFIX}anonymous`

  const userRaw = localStorage.getItem("currentUser")
  const parsed = safeParse<Record<string, unknown>>(userRaw)
  const identity = String(parsed?.email || parsed?.name || "anonymous").trim().toLowerCase()
  return `${QUOTA_STORAGE_PREFIX}${identity || "anonymous"}`
}

function normalizeState(state: FeedbackQuotaState | null): FeedbackQuotaState {
  const today = todayKey()

  if (!state) {
    return {
      date: today,
      remaining: FREE_USER_DAILY_LIMIT,
      completedToday: 0,
      completedTotal: 0,
      streakCount: 0,
      lastSubmittedDate: null,
    }
  }

  if (state.date !== today) {
    return {
      date: today,
      remaining: FREE_USER_DAILY_LIMIT,
      completedToday: 0,
      completedTotal: Number.isFinite(state.completedTotal) ? state.completedTotal : 0,
      streakCount: Math.max(0, Number(state.streakCount) || 0),
      lastSubmittedDate: typeof state.lastSubmittedDate === "string" ? state.lastSubmittedDate : null,
    }
  }

  const remaining = Math.max(0, Math.min(FREE_USER_DAILY_LIMIT, Number(state.remaining) || 0))
  const completedToday = Math.max(0, Number(state.completedToday) || 0)
  const completedTotal = Math.max(0, Number(state.completedTotal) || 0)
  const streakCount = Math.max(0, Number(state.streakCount) || 0)
  const lastSubmittedDate = typeof state.lastSubmittedDate === "string" ? state.lastSubmittedDate : null

  return {
    date: today,
    remaining,
    completedToday,
    completedTotal,
    streakCount,
    lastSubmittedDate,
  }
}

function writeState(state: FeedbackQuotaState) {
  if (typeof window === "undefined") return

  const key = getUserQuotaStorageKey()
  localStorage.setItem(key, JSON.stringify(state))

  window.dispatchEvent(
    new CustomEvent(QUOTA_UPDATED_EVENT, {
      detail: {
        remaining: state.remaining,
        completedToday: state.completedToday,
        completedTotal: state.completedTotal,
        streakCount: state.streakCount,
        lastSubmittedDate: state.lastSubmittedDate,
      },
    })
  )
}

function readState() {
  if (typeof window === "undefined") {
    return normalizeState(null)
  }

  const key = getUserQuotaStorageKey()
  const raw = localStorage.getItem(key)
  const parsed = safeParse<FeedbackQuotaState>(raw)
  const normalized = normalizeState(parsed)

  if (!parsed || JSON.stringify(parsed) !== JSON.stringify(normalized)) {
    writeState(normalized)
  }

  return normalized
}

export function getFeedbackQuota(): FeedbackQuotaResult {
  const state = readState()
  return {
    dailyLimit: FREE_USER_DAILY_LIMIT,
    remaining: state.remaining,
    completedToday: state.completedToday,
    completedTotal: state.completedTotal,
    streakCount: state.streakCount,
    lastSubmittedDate: state.lastSubmittedDate,
    canSubmit: state.remaining > 0,
  }
}

export function consumeFeedbackQuota() {
  const current = readState()

  if (current.remaining <= 0) {
    return {
      ok: false,
      quota: getFeedbackQuota(),
    }
  }

  const today = todayKey()
  const yesterday = yesterdayKey()

  let nextStreak = current.streakCount
  if (current.lastSubmittedDate !== today) {
    if (current.lastSubmittedDate === yesterday) {
      nextStreak = Math.max(1, current.streakCount + 1)
    } else {
      nextStreak = 1
    }
  }

  const nextState: FeedbackQuotaState = {
    ...current,
    remaining: current.remaining - 1,
    completedToday: current.completedToday + 1,
    completedTotal: current.completedTotal + 1,
    streakCount: nextStreak,
    lastSubmittedDate: today,
  }

  writeState(nextState)

  return {
    ok: true,
    quota: getFeedbackQuota(),
  }
}

export function subscribeToFeedbackQuotaUpdates(onUpdate: (quota: FeedbackQuotaResult) => void) {
  if (typeof window === "undefined") return () => {}

  const handleQuotaUpdate = () => onUpdate(getFeedbackQuota())

  const handleStorage = (event: StorageEvent) => {
    if (event.key && event.key.startsWith(QUOTA_STORAGE_PREFIX)) {
      onUpdate(getFeedbackQuota())
    }
  }

  window.addEventListener(QUOTA_UPDATED_EVENT, handleQuotaUpdate)
  window.addEventListener("storage", handleStorage)

  return () => {
    window.removeEventListener(QUOTA_UPDATED_EVENT, handleQuotaUpdate)
    window.removeEventListener("storage", handleStorage)
  }
}
