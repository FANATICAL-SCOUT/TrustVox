"use client"

import { useEffect, useMemo, useState } from "react"
import { Wallet, TrendingUp, TrendingDown, Activity } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getTVXWalletState, subscribeToTVXWalletUpdates } from "@/lib/tvx-wallet"

const FIRST_REWARD_TARGET = 150

export default function WalletSection() {
  const [wallet, setWallet] = useState(() => getTVXWalletState())

  useEffect(() => {
    const syncWallet = () => {
      setWallet(getTVXWalletState())
    }

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
  const motivationMessage =
    rewardGap > 0
      ? `You're ${rewardGap} TVX away from reward.`
      : "You have enough TVX to redeem rewards in the store."

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="space-y-4 text-center">
        <p className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-4 py-1 text-xs font-semibold tracking-wide text-violet-200">
          <Wallet className="h-3.5 w-3.5" />
          Token Wallet
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-white">TVX Wallet</h1>
        <p className="text-base text-slate-300">Track your token balance and transaction activity</p>
      </section>

      <section className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card className="space-card border-violet-400/25 md:col-span-1">
          <CardHeader className="pb-3">
            <CardDescription className="text-slate-300">Current Balance</CardDescription>
            <CardTitle className="text-3xl text-violet-100">{wallet.balance} TVX</CardTitle>
          </CardHeader>
        </Card>

        <Card className="space-card border-emerald-400/25 md:col-span-1">
          <CardHeader className="pb-3">
            <CardDescription className="text-slate-300">Total Earned</CardDescription>
            <CardTitle className="text-2xl text-emerald-200">{wallet.totalEarned} TVX</CardTitle>
          </CardHeader>
        </Card>

        <Card className="space-card border-rose-400/25 md:col-span-1">
          <CardHeader className="pb-3">
            <CardDescription className="text-slate-300">Total Spent</CardDescription>
            <CardTitle className="text-2xl text-rose-200">{wallet.totalSpent} TVX</CardTitle>
          </CardHeader>
        </Card>

        <Card className="space-card border-sky-400/25 md:col-span-1">
          <CardHeader className="pb-3">
            <CardDescription className="text-slate-300">Net</CardDescription>
            <CardTitle className={`text-2xl ${net >= 0 ? "text-sky-200" : "text-amber-200"}`}>{net} TVX</CardTitle>
          </CardHeader>
        </Card>
      </section>

      <section className="mt-6">
        <div className="rounded-xl border border-violet-300/20 bg-violet-950/20 px-4 py-3 text-sm text-violet-100">
          <Activity className="mr-2 inline h-4 w-4" />
          {motivationMessage}
        </div>
      </section>

      <section className="mt-8">
        <Card className="space-card border-slate-600/30">
          <CardHeader>
            <CardTitle className="text-slate-100">Transaction History</CardTitle>
            <CardDescription className="text-slate-300">Recent TVX credits and debits</CardDescription>
          </CardHeader>
          <CardContent>
            {wallet.transactions.length === 0 ? (
              <p className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-4 text-sm text-slate-400">
                No transactions yet.
              </p>
            ) : (
              <div className="space-y-3">
                {wallet.transactions.map((transaction) => {
                  const isPositive = transaction.amount >= 0
                  return (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between rounded-lg border border-slate-700/60 bg-slate-900/40 px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-100">{transaction.reason}</p>
                        <p className="text-xs text-slate-400">
                          {new Date(transaction.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge
                          className={
                            isPositive
                              ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                              : "border-rose-400/30 bg-rose-500/10 text-rose-200"
                          }
                        >
                          {isPositive ? <TrendingUp className="mr-1 h-3.5 w-3.5" /> : <TrendingDown className="mr-1 h-3.5 w-3.5" />}
                          {isPositive ? "+" : ""}
                          {transaction.amount} TVX
                        </Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
