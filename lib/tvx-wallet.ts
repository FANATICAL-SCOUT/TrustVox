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
import { createClient, nextChannelId } from "@/lib/supabase/client"
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

// Realtime replaces the old same-tab CustomEvent bus (Phase 8.7). New rows on
// `wallet_transactions` for the signed-in user (the only writes possible —
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

  supabase.auth.getUser().then(({ data: { user } }) => {
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

  return {
    success: true,
    message: `${input.title} redeemed successfully`,
    wallet: await getTVXWalletState(),
  }
}
