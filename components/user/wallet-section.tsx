"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowUpRight, ArrowDownRight } from "lucide-react"
import { emptyWalletState, getTVXWalletState, subscribeToTVXWalletUpdates } from "@/lib/tvx-wallet"

const FIRST_REWARD_TARGET = 150

function StatTile({ label, value, tone }: { label: string; value: number; tone: "mint" | "gold" | "ink" }) {
  const toneClass = tone === "mint" ? "text-mint" : tone === "gold" ? "text-gold" : "text-ink"
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
      <p className="text-xs uppercase tracking-wide text-ink-muted">{label}</p>
      <p className={`tvx-num mt-1.5 text-2xl font-bold ${toneClass}`}>
        {value.toLocaleString()} <span className="text-sm font-semibold text-ink-muted">TVX</span>
      </p>
    </div>
  )
}

export default function WalletSection() {
  const [wallet, setWallet] = useState(emptyWalletState)

  useEffect(() => {
    const syncWallet = () => void getTVXWalletState().then(setWallet)
    syncWallet()
    const unsubscribe = subscribeToTVXWalletUpdates(syncWallet)
    window.addEventListener("focus", syncWallet)
    return () => {
      unsubscribe()
      window.removeEventListener("focus", syncWallet)
    }
  }, [])

  const net = useMemo(() => wallet.totalEarned - wallet.totalSpent, [wallet.totalEarned, wallet.totalSpent])
  const rewardGap = Math.max(0, FIRST_REWARD_TARGET - wallet.balance)
  const progress = Math.min(100, Math.round((wallet.balance / FIRST_REWARD_TARGET) * 100))
  const motivation = rewardGap > 0 ? `${rewardGap} TVX to your next reward` : "Ready to redeem in the store"

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div data-reveal-block className="text-center">
        <h1 className="font-display text-4xl font-extrabold tracking-[-0.03em] text-ink">Your TVX <span className="tvx-text-gold">wallet</span></h1>
        <p className="mx-auto mt-3 max-w-xl text-ink-dim">Track your balance and every credit and debit in one place.</p>
      </div>

      {/* Balance hero */}
      <div data-reveal-card className="tvx-card-gold mt-8 rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-ink-muted">Current balance</p>
            <div className="tvx-num mt-1 text-5xl font-bold text-ink">
              {wallet.balance.toLocaleString()} <span className="text-2xl font-bold text-gold">TVX</span>
            </div>
          </div>
          <span className="rounded-full border border-mint/25 bg-mint/10 px-3 py-1 text-xs font-semibold text-mint">{motivation}</span>
        </div>
        <div className="mt-6">
          <div className="mb-1.5 flex items-center justify-between text-xs text-ink-muted">
            <span>Toward next reward</span>
            <span className="tvx-num">{progress}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
            <div className="h-2 rounded-full bg-gradient-to-r from-gold-deep to-gold" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile label="Total earned" value={wallet.totalEarned} tone="mint" />
        <StatTile label="Total spent" value={wallet.totalSpent} tone="gold" />
        <StatTile label="Net" value={net} tone="ink" />
      </div>

      {/* Transactions */}
      <div className="mt-10">
        <h2 className="font-display text-xl font-bold text-ink">Transaction history</h2>
        <p className="mt-1 text-sm text-ink-muted">Recent TVX credits and debits</p>

        {wallet.transactions.length === 0 ? (
          <p className="mt-4 rounded-xl border border-white/[0.07] bg-white/[0.02] p-6 text-center text-sm text-ink-muted">
            No transactions yet. Complete a feedback to earn your first TVX.
          </p>
        ) : (
          <div className="mt-4 divide-y divide-white/[0.06] overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.02]">
            {wallet.transactions.map((transaction) => {
              const isPositive = transaction.amount >= 0
              return (
                <div key={transaction.id} className="flex items-center justify-between gap-4 px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <span className={`grid h-9 w-9 flex-none place-items-center rounded-lg border ${isPositive ? "border-mint/20 bg-mint/10 text-mint" : "border-gold/20 bg-gold/10 text-gold"}`}>
                      {isPositive ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-ink">{transaction.reason}</p>
                      <p className="text-xs text-ink-muted">{new Date(transaction.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                  <span className={`tvx-num flex-none text-sm font-bold ${isPositive ? "text-mint" : "text-gold"}`}>
                    {isPositive ? "+" : ""}{transaction.amount} TVX
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
