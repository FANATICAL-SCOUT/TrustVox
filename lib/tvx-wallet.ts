// ─── TrustVox TVX Wallet ───────────────────────────────────────────────────
// Supabase-backed wallet (migrated in Phase 8.4 — see ARCHITECTURE.md §4, §6, §8).
// Balance/totals are DERIVED (the wallet_balances view = SUM of transactions),
// never stored, so double-credits and drift are structurally impossible.
//
// Both money-moving operations go through trusted SECURITY DEFINER functions
// (migration 0005), NOT client writes — wallet_transactions has no authenticated
// INSERT policy, so a user cannot mint or self-discount TVX:
//   • creditFeedbackReward → credit_feedback_reward(response_id): amount read
//     from the form, idempotent per response.
//   • redeemTVXItem        → redeem_reward(item_id): cost read from the catalog,
//     atomic balance check (no overspend).
import { createClient } from "@/lib/supabase/client"
import type { Tables } from "@/lib/supabase/types"

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

// Redemption only needs the item id (cost is server-authoritative); title is
// used solely for the client-side success message.
export interface RedeemItemInput {
  id: string
  title: string
}

const UPDATE_EVENT = "trustvox:tvx-wallet-updated"

// A signed-out or brand-new wallet: empty and honest (no invented balance).
export const emptyWalletState: TVXWalletState = {
  balance: 0,
  totalEarned: 0,
  totalSpent: 0,
  transactions: [],
}

function isBrowser() {
  return typeof window !== "undefined"
}

function emitWalletUpdate() {
  if (!isBrowser()) return
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT))
}

function mapTransaction(row: Tables<"wallet_transactions">): TVXTransaction {
  return {
    id: row.id,
    amount: row.amount,
    reason: row.reason,
    createdAt: row.created_at,
    referenceId: row.reference_id ?? undefined,
  }
}

// In-tab refresh bus (cross-user realtime lands in 8.7). Kept as a window event
// so the navbar / wallet / store stay in sync after a credit or redeem.
export function subscribeToTVXWalletUpdates(callback: () => void) {
  if (!isBrowser()) {
    return () => {}
  }
  window.addEventListener(UPDATE_EVENT, callback)
  return () => {
    window.removeEventListener(UPDATE_EVENT, callback)
  }
}

export async function getTVXWalletState(): Promise<TVXWalletState> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return emptyWalletState

  const [balances, transactions] = await Promise.all([
    supabase
      .from("wallet_balances")
      .select("balance, total_earned, total_spent")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("wallet_transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ])

  if (balances.error) throw balances.error
  if (transactions.error) throw transactions.error

  return {
    balance: balances.data?.balance ?? 0,
    totalEarned: balances.data?.total_earned ?? 0,
    totalSpent: balances.data?.total_spent ?? 0,
    transactions: (transactions.data ?? []).map(mapTransaction),
  }
}

// Credit the reward for a feedback response the caller owns. The trusted path
// derives the amount from the form (no self-minting) and is idempotent per
// response, so calling it twice for the same submission credits at most once.
export async function creditFeedbackReward(responseId: string): Promise<TVXWalletState> {
  const supabase = createClient()
  const { error } = await supabase.rpc("credit_feedback_reward", { p_response_id: responseId })
  if (error) throw error
  emitWalletUpdate()
  return getTVXWalletState()
}

export async function redeemTVXItem(
  input: RedeemItemInput,
): Promise<{ success: boolean; message: string; wallet: TVXWalletState }> {
  const supabase = createClient()
  const { error } = await supabase.rpc("redeem_reward", { p_item_id: input.id })

  if (error) {
    const message = /insufficient/i.test(error.message)
      ? "Not enough TVX"
      : "Redemption failed. Please try again."
    return { success: false, message, wallet: await getTVXWalletState() }
  }

  emitWalletUpdate()
  return {
    success: true,
    message: `${input.title} redeemed successfully`,
    wallet: await getTVXWalletState(),
  }
}
