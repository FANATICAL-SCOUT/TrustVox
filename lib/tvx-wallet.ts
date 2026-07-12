// ─── TrustVox TVX Wallet ───────────────────────────────────────────────────
// Supabase-backed wallet. Balance/totals are DERIVED (the wallet_balances view
// = SUM of transactions), never stored, so double-credits and drift are
// structurally impossible.
//
// Both money-moving operations go through trusted SECURITY DEFINER functions,
// NOT client writes — wallet_transactions has no authenticated INSERT policy,
// so a user cannot mint or self-discount TVX:
//   • creditFeedbackReward → credit_feedback_reward(response_id): amount read
//     from the form, idempotent per response.
//   • redeemTVXItem        → redeem_reward(item_id): cost read from the catalog,
//     atomic balance check (no overspend).
import { createClient, getCachedUser, nextChannelId } from "@/lib/supabase/client"
import type { Tables } from "@/lib/supabase/types"
import type { RealtimeChannel } from "@supabase/supabase-js"

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

// A single earn event, shown in the profile's "TVX earned" breakdown:
// which feedback earned it and when.
export interface TVXEarnEntry {
  id: string
  amount: number
  feedbackTitle: string
  createdAt: string
}

// A redeemed coupon with its lifecycle state. Backed by the redemptions table
// — the single source of truth for a user's coupon history.
export interface Redemption {
  id: string
  itemTitle: string
  cost: number
  couponCode: string
  redeemedAt: string
  expiresAt: string
  isExpired: boolean
}

// Redemption only needs the item id (cost is server-authoritative); title is
// used solely for the client-side success message.
export interface RedeemItemInput {
  id: string
  title: string
}

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

function mapTransaction(row: Tables<"wallet_transactions">): TVXTransaction {
  return {
    id: row.id,
    amount: row.amount,
    reason: row.reason,
    createdAt: row.created_at,
    referenceId: row.reference_id ?? undefined,
  }
}

// Realtime broadcast for wallet changes. New rows on `wallet_transactions`
// for the signed-in user (the only writes possible —
// there's no authenticated INSERT policy, only the trusted SECURITY DEFINER
// functions) notify every subscriber, across tabs. RLS already scopes reads to
// the caller's own rows; the `user_id=eq.<uid>` filter here just avoids
// subscribing to a broader stream than needed.
export function subscribeToTVXWalletUpdates(callback: () => void) {
  if (!isBrowser()) {
    return () => {}
  }

  const supabase = createClient()
  let channel: RealtimeChannel | null = null
  let cancelled = false

  getCachedUser(supabase).then((user) => {
    if (cancelled || !user) return
    channel = supabase
      // Unique per subscription (see nextChannelId) — never reuse a channel name.
      .channel(`tvx-wallet-updates-${user.id}-${nextChannelId()}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "wallet_transactions", filter: `user_id=eq.${user.id}` },
        () => callback(),
      )
      .subscribe()
  })

  return () => {
    cancelled = true
    if (channel) void supabase.removeChannel(channel)
  }
}

export async function getTVXWalletState(): Promise<TVXWalletState> {
  const supabase = createClient()
  const user = await getCachedUser(supabase)
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
  return getTVXWalletState()
}

export async function redeemTVXItem(
  input: RedeemItemInput,
): Promise<{ success: boolean; message: string; wallet: TVXWalletState; coupon?: Redemption }> {
  const supabase = createClient()
  const { error } = await supabase.rpc("redeem_reward", { p_item_id: input.id })

  if (error) {
    const message = /insufficient/i.test(error.message)
      ? "Not enough TVX"
      : "Redemption failed. Please try again."
    return { success: false, message, wallet: await getTVXWalletState() }
  }

  // Read back the coupon the trusted path just created (RLS scopes this to the
  // caller) so the store can show the real code + point to the profile. The
  // code is the single source of truth in `redemptions` — never client-invented.
  const [wallet, redemptions] = await Promise.all([getTVXWalletState(), getRedemptions()])
  const coupon = redemptions.find((r) => r.itemTitle === input.title) ?? redemptions[0]

  return {
    success: true,
    message: `${input.title} redeemed successfully`,
    wallet,
    coupon,
  }
}

// Reason text written by credit_feedback_reward: Feedback submitted for "<title>".
const FEEDBACK_EARN_REASON = /^Feedback submitted for "(.*)"$/

// Per-feedback earn breakdown for the profile. Derived from the wallet's own
// earn transactions (positive amount) — no new data needed.
// Titles are recovered from the transaction reason; anything that doesn't match
// the feedback-earn shape falls back to a generic label so nothing is dropped.
export function deriveEarnHistory(transactions: TVXTransaction[]): TVXEarnEntry[] {
  return transactions
    .filter((t) => t.amount > 0)
    .map((t) => {
      const match = FEEDBACK_EARN_REASON.exec(t.reason)
      return {
        id: t.id,
        amount: t.amount,
        feedbackTitle: match?.[1]?.trim() || t.reason,
        createdAt: t.createdAt,
      }
    })
}

// The user's redeemed-coupon history. RLS scopes this to the caller's own
// rows; expiry is computed against expires_at so the profile
// shows an honest active/expired state, not a meaningless countdown.
export async function getRedemptions(): Promise<Redemption[]> {
  const supabase = createClient()
  const user = await getCachedUser(supabase)
  if (!user) return []

  const { data, error } = await supabase
    .from("redemptions")
    .select("id, item_title, cost, coupon_code, redeemed_at, expires_at")
    .eq("user_id", user.id)
    .order("redeemed_at", { ascending: false })
  if (error) throw error

  const now = Date.now()
  return (data ?? []).map((row) => ({
    id: row.id,
    itemTitle: row.item_title,
    cost: row.cost,
    couponCode: row.coupon_code,
    redeemedAt: row.redeemed_at,
    expiresAt: row.expires_at,
    isExpired: new Date(row.expires_at).getTime() < now,
  }))
}
