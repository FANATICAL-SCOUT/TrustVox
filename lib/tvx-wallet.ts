export interface TVXTransaction {
  id: string
  amount: number
  reason: string
  createdAt: string
  referenceId?: string
}

export interface TVXWalletState {
  balance: number
  totalEarned: number
  totalSpent: number
  transactions: TVXTransaction[]
}

export interface RedeemItemInput {
  id: string
  title: string
  cost: number
}

const STORAGE_KEY = "trustvox:tvx-wallet"
const UPDATE_EVENT = "trustvox:tvx-wallet-updated"

const defaultWalletState: TVXWalletState = {
  balance: 240,
  totalEarned: 360,
  totalSpent: 120,
  transactions: [
    {
      id: "tx-1",
      amount: 20,
      reason: "Submitted Insight",
      createdAt: "2026-03-23T09:15:00.000Z",
    },
    {
      id: "tx-2",
      amount: -50,
      reason: "Redeemed Amazon Voucher",
      createdAt: "2026-03-22T12:08:00.000Z",
    },
    {
      id: "tx-3",
      amount: 10,
      reason: "Daily Bonus",
      createdAt: "2026-03-22T08:00:00.000Z",
    },
  ],
}

function isBrowser() {
  return typeof window !== "undefined"
}

function safeParseWallet(raw: string | null): TVXWalletState | null {
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as Partial<TVXWalletState>
    if (typeof parsed?.balance !== "number") return null
    if (typeof parsed?.totalEarned !== "number") return null
    if (typeof parsed?.totalSpent !== "number") return null
    if (!Array.isArray(parsed?.transactions)) return null

    return {
      balance: parsed.balance,
      totalEarned: parsed.totalEarned,
      totalSpent: parsed.totalSpent,
      transactions: parsed.transactions,
    }
  } catch {
    return null
  }
}

function emitWalletUpdate() {
  if (!isBrowser()) return
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT))
}

export function getTVXWalletState(): TVXWalletState {
  if (!isBrowser()) {
    return defaultWalletState
  }

  const saved = safeParseWallet(localStorage.getItem(STORAGE_KEY))
  if (saved) {
    return saved
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultWalletState))
  return defaultWalletState
}

export function setTVXWalletState(nextState: TVXWalletState) {
  if (!isBrowser()) return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState))
  emitWalletUpdate()
}

export function subscribeToTVXWalletUpdates(callback: () => void) {
  if (!isBrowser()) {
    return () => {}
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      callback()
    }
  }

  window.addEventListener(UPDATE_EVENT, callback)
  window.addEventListener("storage", handleStorage)
  return () => {
    window.removeEventListener(UPDATE_EVENT, callback)
    window.removeEventListener("storage", handleStorage)
  }
}

export function addTVXReward(amount: number, reason: string, options?: { referenceId?: string }) {
  const current = getTVXWalletState()
  const safeAmount = Math.max(0, Math.floor(amount))
  const referenceId = options?.referenceId?.trim()

  if (referenceId && current.transactions.some((transaction) => transaction.referenceId === referenceId)) {
    return current
  }

  const next: TVXWalletState = {
    ...current,
    balance: current.balance + safeAmount,
    totalEarned: current.totalEarned + safeAmount,
    transactions: [
      {
        id: `tx-${Date.now()}`,
        amount: safeAmount,
        reason,
        createdAt: new Date().toISOString(),
        referenceId,
      },
      ...current.transactions,
    ],
  }

  setTVXWalletState(next)
  return next
}

export function redeemTVXItem(input: RedeemItemInput): { success: boolean; message: string; wallet: TVXWalletState } {
  const current = getTVXWalletState()
  const safeCost = Math.max(0, Math.floor(input.cost))

  if (current.balance < safeCost) {
    return {
      success: false,
      message: "Not enough TVX",
      wallet: current,
    }
  }

  const next: TVXWalletState = {
    ...current,
    balance: current.balance - safeCost,
    totalSpent: current.totalSpent + safeCost,
    transactions: [
      {
        id: `tx-${Date.now()}`,
        amount: -safeCost,
        reason: `Redeemed ${input.title}`,
        createdAt: new Date().toISOString(),
      },
      ...current.transactions,
    ],
  }

  setTVXWalletState(next)

  return {
    success: true,
    message: `${input.title} redeemed successfully`,
    wallet: next,
  }
}
