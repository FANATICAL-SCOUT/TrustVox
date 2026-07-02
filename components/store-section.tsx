"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { CheckCircle2, Sparkles, Store as StoreIcon, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { getTVXWalletState, redeemTVXItem, subscribeToTVXWalletUpdates } from "@/lib/tvx-wallet"
import { recordStoreRedemptionNotification } from "@/lib/user-notifications"

const STORE_ITEMS = [
  {
    id: "amazon-gift-card",
    title: "Amazon Gift Card",
    description: "Redeem your TVX for a digital voucher and shop what you love.",
    image: "/store-amazon.svg",
    cost: 200,
    badge: "🔥 Popular",
    category: "vouchers",
    glow: "rgba(139, 92, 246, 0.18)",
  },
  {
    id: "netflix-subscription",
    title: "Netflix Subscription",
    description: "Unlock one month of entertainment powered by your TrustVox activity.",
    image: "/store-netflix.svg",
    cost: 150,
    badge: "⚡ Limited",
    category: "subscriptions",
    glow: "rgba(239, 68, 68, 0.15)",
  },
  {
    id: "trustvox-tshirt",
    title: "TrustVox T-Shirt",
    description: "Premium community merch for your most consistent feedback streaks.",
    image: "/store-tshirt.svg",
    cost: 300,
    badge: "💎 Premium",
    category: "merch",
    glow: "rgba(16, 185, 129, 0.16)",
  },
]

export default function StoreSection() {
  const [wallet, setWallet] = useState(() => getTVXWalletState())
  const [selectedItem, setSelectedItem] = useState(null)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [feedbackMessage, setFeedbackMessage] = useState(null)
  const [activeFilter, setActiveFilter] = useState("all")

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

  const redeemableCount = useMemo(() => {
    return STORE_ITEMS.filter((item) => wallet.balance >= item.cost).length
  }, [wallet.balance])

  const lowestCost = useMemo(() => Math.min(...STORE_ITEMS.map((item) => item.cost)), [])
  const firstRewardGap = Math.max(0, lowestCost - wallet.balance)

  const motivationMessage =
    firstRewardGap > 0
      ? `You're ${firstRewardGap} TVX away from your first reward 🎯`
      : "You can redeem a reward now. Keep earning more TVX to unlock premium items."

  const filteredItems = useMemo(() => {
    if (activeFilter === "all") return STORE_ITEMS
    return STORE_ITEMS.filter((item) => item.category === activeFilter)
  }, [activeFilter])

  const filterOptions = [
    { key: "all", label: "All" },
    { key: "vouchers", label: "Vouchers" },
    { key: "subscriptions", label: "Subscriptions" },
    { key: "merch", label: "Merch" },
  ]

  const openConfirmModal = (item) => {
    setSelectedItem(item)
    setFeedbackMessage(null)
    setIsConfirmOpen(true)
  }

  const handleRedeemConfirm = () => {
    if (!selectedItem) return

    const result = redeemTVXItem({
      id: selectedItem.id,
      title: selectedItem.title,
      cost: selectedItem.cost,
    })

    if (result.success) {
      setWallet(result.wallet)
      recordStoreRedemptionNotification(selectedItem.title, selectedItem.cost, result.wallet.balance)
      setFeedbackMessage({ type: "success", text: result.message })
      setIsConfirmOpen(false)
      setSelectedItem(null)
      return
    }

    setFeedbackMessage({ type: "error", text: result.message })
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="space-y-4 text-center">
        <p className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-4 py-1 text-xs font-semibold tracking-wide text-violet-200">
          <StoreIcon className="h-3.5 w-3.5" />
          TrustVox Rewards
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-white">TrustVox Store</h1>
        <p className="text-base text-slate-300">Spend your TVX tokens</p>
      </section>

      <section className="mt-8">
        <div className="space-card rounded-2xl border border-violet-400/20 p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-wide text-violet-200/80">Balance</p>
              <p className="mt-1 text-3xl font-bold text-violet-100">{wallet.balance} TVX</p>
              <p className="mt-2 text-sm text-slate-300">{redeemableCount} item(s) currently redeemable</p>
              <p className="mt-1 text-sm text-violet-200/85">{motivationMessage}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:min-w-[240px]">
              <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3">
                <p className="text-xs text-emerald-200/80">Earned</p>
                <p className="text-lg font-semibold text-emerald-100">{wallet.totalEarned} TVX</p>
              </div>
              <div className="rounded-xl border border-rose-400/20 bg-rose-500/10 p-3">
                <p className="text-xs text-rose-200/80">Spent</p>
                <p className="text-lg font-semibold text-rose-100">{wallet.totalSpent} TVX</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {feedbackMessage ? (
        <section className="mt-6">
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${
              feedbackMessage.type === "success"
                ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
                : "border-rose-400/30 bg-rose-500/10 text-rose-100"
            }`}
          >
            {feedbackMessage.type === "success" ? <CheckCircle2 className="mr-2 inline h-4 w-4" /> : null}
            {feedbackMessage.text}
          </div>
        </section>
      ) : null}

      <section className="mt-8">
        <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
          {filterOptions.map((filter) => (
            <button
              key={filter.key}
              onClick={() => setActiveFilter(filter.key)}
              className={`rounded-full border px-3 py-1.5 text-sm transition-all duration-200 ${
                activeFilter === filter.key
                  ? "border-violet-400/50 bg-violet-500/20 text-violet-100"
                  : "border-slate-600/50 bg-slate-800/40 text-slate-300 hover:border-violet-400/40 hover:text-violet-200"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredItems.map((item) => {
            const canRedeem = wallet.balance >= item.cost
            const needed = Math.max(0, item.cost - wallet.balance)
            const progressPercent = Math.min(100, Math.round((wallet.balance / item.cost) * 100))

            return (
              <Card
                key={item.id}
                className="group overflow-hidden border-violet-300/15 bg-[#0B1222]/70 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 hover:border-violet-300/35 hover:shadow-[0_20px_54px_rgba(76,29,149,0.42)]"
                style={{ boxShadow: `0 10px 34px ${item.glow}` }}
              >
                <div className="relative h-44 w-full overflow-hidden">
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                  />
                  {item.badge ? (
                    <Badge className="absolute left-3 top-3 border-violet-300/60 bg-violet-900/85 text-violet-100 shadow-[0_0_14px_rgba(139,92,246,0.35)]">
                      {item.badge}
                    </Badge>
                  ) : null}
                </div>
                <CardHeader>
                  <CardTitle className="text-xl text-white">{item.title}</CardTitle>
                  <CardDescription className="text-slate-300">{item.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between rounded-lg border border-violet-300/15 bg-violet-950/20 px-3 py-2 text-sm">
                    <span className="text-slate-300">Cost</span>
                    <span className="font-semibold text-violet-100">{item.cost} TVX</span>
                  </div>

                  <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-3">
                    <div className="mb-2 flex items-center justify-between text-xs text-slate-300">
                      <span>Progress</span>
                      <span>
                        {Math.min(wallet.balance, item.cost)} / {item.cost} TVX
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-800/90 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {!canRedeem ? (
                    <p className="text-xs text-amber-300">You need {needed} more TVX</p>
                  ) : (
                    <p className="text-xs text-emerald-300 inline-flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5" />
                      You can redeem this now
                    </p>
                  )}

                  <Button
                    className={`w-full ${
                      canRedeem
                        ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:brightness-110 shadow-[0_0_24px_rgba(124,58,237,0.35)]"
                        : "bg-slate-800/70 text-slate-300 border border-slate-600/70 hover:bg-slate-800/80"
                    }`}
                    disabled={!canRedeem}
                    onClick={() => openConfirmModal(item)}
                  >
                    {canRedeem ? (
                      <>
                        Redeem Now
                        <span className="ml-1">→</span>
                      </>
                    ) : (
                      <>
                        <Lock className="mr-1 h-4 w-4" />
                        Earn {needed} TVX to unlock
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>

      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="border-violet-300/20 bg-[#090F1D] text-slate-100">
          <DialogHeader>
            <DialogTitle>Confirm Redemption</DialogTitle>
            <DialogDescription className="text-slate-300">
              Review your TVX balance before redeeming this reward.
            </DialogDescription>
          </DialogHeader>

          {selectedItem ? (
            <div className="space-y-3 rounded-xl border border-violet-300/20 bg-violet-950/20 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-300">Item</span>
                <span className="font-medium text-white">{selectedItem.title}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-300">Cost</span>
                <span className="font-medium text-violet-100">{selectedItem.cost} TVX</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-300">Current Balance</span>
                <span className="font-medium text-violet-100">{wallet.balance} TVX</span>
              </div>
              {wallet.balance < selectedItem.cost ? <p className="text-xs text-rose-300">Not enough TVX</p> : null}
            </div>
          ) : null}

          <DialogFooter>
            <Button
              variant="outline"
              className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
              onClick={() => setIsConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:brightness-110"
              onClick={handleRedeemConfirm}
              disabled={!selectedItem || wallet.balance < (selectedItem?.cost ?? 0)}
            >
              Confirm Redeem
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
