"use client"

import { useEffect, useMemo, useState } from "react"
import { CheckCircle2, Sparkles, Store as StoreIcon, Lock, Gift, Tv, Shirt, ArrowRight, type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { getTVXWalletState, redeemTVXItem, subscribeToTVXWalletUpdates, type TVXWalletState } from "@/lib/tvx-wallet"
import { recordStoreRedemptionNotification } from "@/lib/user-notifications"

type StoreCategory = "vouchers" | "subscriptions" | "merch"

interface StoreItem {
  id: string
  title: string
  description: string
  cost: number
  badge: string
  category: StoreCategory
}

const CATEGORY_ICON: Record<StoreCategory, LucideIcon> = {
  vouchers: Gift,
  subscriptions: Tv,
  merch: Shirt,
}

const STORE_ITEMS: StoreItem[] = [
  {
    id: "amazon-gift-card",
    title: "Amazon Gift Card",
    description: "Redeem your TVX for a digital voucher and shop what you love.",
    cost: 200,
    badge: "Popular",
    category: "vouchers",
  },
  {
    id: "netflix-subscription",
    title: "Netflix Subscription",
    description: "Unlock one month of entertainment powered by your TrustVox activity.",
    cost: 150,
    badge: "Limited",
    category: "subscriptions",
  },
  {
    id: "trustvox-tshirt",
    title: "TrustVox T-Shirt",
    description: "Premium community merch for your most consistent feedback streaks.",
    cost: 300,
    badge: "Premium",
    category: "merch",
  },
]

const FILTER_OPTIONS: { key: "all" | StoreCategory; label: string }[] = [
  { key: "all", label: "All" },
  { key: "vouchers", label: "Vouchers" },
  { key: "subscriptions", label: "Subscriptions" },
  { key: "merch", label: "Merch" },
]

interface FeedbackMessage {
  type: "success" | "error"
  text: string
}

function StatTile({ label, value, unit, tone }: { label: string; value: number; unit?: string; tone: "gold" | "mint" | "ink" }) {
  const toneClass = tone === "mint" ? "text-mint" : tone === "gold" ? "text-gold" : "text-ink"
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
      <p className="text-xs uppercase tracking-wide text-ink-muted">{label}</p>
      <p className={`tvx-num mt-1.5 text-2xl font-bold ${toneClass}`}>
        {value.toLocaleString()}
        {unit ? <span className="ml-1 text-sm font-semibold text-ink-muted">{unit}</span> : null}
      </p>
    </div>
  )
}

export default function StoreSection() {
  const [wallet, setWallet] = useState<TVXWalletState>(() => getTVXWalletState())
  const [selectedItem, setSelectedItem] = useState<StoreItem | null>(null)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [feedbackMessage, setFeedbackMessage] = useState<FeedbackMessage | null>(null)
  const [activeFilter, setActiveFilter] = useState<"all" | StoreCategory>("all")

  useEffect(() => {
    const syncWallet = () => setWallet(getTVXWalletState())
    syncWallet()
    const unsubscribe = subscribeToTVXWalletUpdates(syncWallet)
    window.addEventListener("focus", syncWallet)
    return () => {
      unsubscribe()
      window.removeEventListener("focus", syncWallet)
    }
  }, [])

  const redeemableCount = useMemo(
    () => STORE_ITEMS.filter((item) => wallet.balance >= item.cost).length,
    [wallet.balance],
  )

  const lowestCost = useMemo(() => Math.min(...STORE_ITEMS.map((item) => item.cost)), [])
  const firstRewardGap = Math.max(0, lowestCost - wallet.balance)
  const cheapestProgress = Math.min(100, Math.round((wallet.balance / lowestCost) * 100))

  const motivationMessage =
    firstRewardGap > 0
      ? `${firstRewardGap} TVX to your first reward`
      : `${redeemableCount} reward${redeemableCount === 1 ? "" : "s"} ready to redeem`

  const filteredItems = useMemo(
    () => (activeFilter === "all" ? STORE_ITEMS : STORE_ITEMS.filter((item) => item.category === activeFilter)),
    [activeFilter],
  )

  const openConfirmModal = (item: StoreItem) => {
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
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div data-reveal-block className="text-center">
        <p className="inline-flex items-center gap-2 rounded-full border border-gold/20 bg-gold/[0.08] px-4 py-1.5 text-sm font-semibold text-gold">
          <StoreIcon className="h-4 w-4" /> TrustVox rewards
        </p>
        <h1 className="mt-4 font-display text-4xl font-extrabold tracking-[-0.03em] text-ink">Redemption store</h1>
        <p className="mx-auto mt-3 max-w-xl text-ink-dim">Spend your TVX tokens on vouchers, subscriptions, and community merch.</p>
      </div>

      {/* Balance hero */}
      <div data-reveal-card className="tvx-card-gold mt-8 rounded-2xl border border-white/[0.08] bg-gradient-to-b from-surface to-[#0e1017] p-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-ink-muted">Available balance</p>
            <div className="tvx-num mt-1 text-5xl font-bold text-ink">
              {wallet.balance.toLocaleString()} <span className="text-2xl font-bold text-gold">TVX</span>
            </div>
          </div>
          <span className="rounded-full border border-mint/25 bg-mint/10 px-3 py-1 text-xs font-semibold text-mint">{motivationMessage}</span>
        </div>
        <div className="mt-6">
          <div className="mb-1.5 flex items-center justify-between text-xs text-ink-muted">
            <span>Toward your first reward</span>
            <span className="tvx-num">{cheapestProgress}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
            <div className="h-2 rounded-full bg-gradient-to-r from-gold-deep to-gold" style={{ width: `${cheapestProgress}%` }} />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile label="Redeemable now" value={redeemableCount} tone="ink" />
        <StatTile label="Total earned" value={wallet.totalEarned} unit="TVX" tone="mint" />
        <StatTile label="Total spent" value={wallet.totalSpent} unit="TVX" tone="gold" />
      </div>

      {/* Redemption result banner */}
      {feedbackMessage ? (
        <div
          role="status"
          className={`mt-6 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${
            feedbackMessage.type === "success"
              ? "border-mint/25 bg-mint/10 text-mint"
              : "border-destructive/30 bg-destructive/10 text-destructive"
          }`}
        >
          {feedbackMessage.type === "success" ? <CheckCircle2 className="h-4 w-4 flex-none" /> : <Lock className="h-4 w-4 flex-none" />}
          {feedbackMessage.text}
        </div>
      ) : null}

      {/* Filters */}
      <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
        {FILTER_OPTIONS.map((filter) => {
          const active = activeFilter === filter.key
          return (
            <button
              key={filter.key}
              onClick={() => setActiveFilter(filter.key)}
              aria-pressed={active}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 ${
                active
                  ? "border-gold/40 bg-gold/10 text-gold"
                  : "border-white/[0.08] bg-white/[0.03] text-ink-dim hover:border-white/15 hover:text-ink"
              }`}
            >
              {filter.label}
            </button>
          )
        })}
      </div>

      {/* Catalog */}
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredItems.map((item) => {
          const canRedeem = wallet.balance >= item.cost
          const needed = Math.max(0, item.cost - wallet.balance)
          const progressPercent = Math.min(100, Math.round((wallet.balance / item.cost) * 100))
          const Icon = CATEGORY_ICON[item.category]

          return (
            <div
              key={item.id}
              data-reveal-card
              className="group flex flex-col overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.02] transition-all duration-200 hover:-translate-y-1 hover:border-white/15"
            >
              {/* Icon header */}
              <div className="relative flex h-32 items-center justify-center border-b border-white/[0.06] bg-gradient-to-b from-gold/[0.07] to-transparent">
                <Icon className="h-12 w-12 text-gold/85 transition-transform duration-300 group-hover:scale-110" />
                <span className="absolute left-3 top-3 rounded-full border border-white/[0.1] bg-background/60 px-2.5 py-1 text-[11px] font-semibold text-ink-dim backdrop-blur-sm">
                  {item.badge}
                </span>
              </div>

              <div className="flex flex-1 flex-col p-5">
                <h3 className="font-display text-lg font-bold text-ink">{item.title}</h3>
                <p className="mt-1.5 flex-1 text-sm leading-relaxed text-ink-muted">{item.description}</p>

                <div className="mt-4 flex items-center justify-between rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-2">
                  <span className="text-sm text-ink-muted">Cost</span>
                  <span className="tvx-num text-sm font-bold text-gold">{item.cost.toLocaleString()} TVX</span>
                </div>

                {canRedeem ? (
                  <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-mint">
                    <Sparkles className="h-3.5 w-3.5" /> Ready to redeem
                  </p>
                ) : (
                  <div className="mt-3">
                    <div className="mb-1.5 flex items-center justify-between text-xs text-ink-muted">
                      <span className="tvx-num">{wallet.balance.toLocaleString()} / {item.cost.toLocaleString()}</span>
                      <span className="tvx-num">{progressPercent}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                      <div className="h-1.5 rounded-full bg-gradient-to-r from-gold-deep to-gold" style={{ width: `${progressPercent}%` }} />
                    </div>
                  </div>
                )}

                <Button
                  className={`mt-5 w-full ${
                    canRedeem
                      ? "bg-gradient-to-b from-[#f2c877] to-gold-deep font-semibold text-[#241a06] hover:brightness-105"
                      : "cursor-not-allowed border border-white/10 bg-white/[0.03] text-ink-muted hover:bg-white/[0.03]"
                  }`}
                  disabled={!canRedeem}
                  onClick={() => openConfirmModal(item)}
                >
                  {canRedeem ? (
                    <>
                      Redeem now <ArrowRight className="ml-1 h-4 w-4" />
                    </>
                  ) : (
                    <>
                      <Lock className="mr-1 h-4 w-4" /> Earn {needed.toLocaleString()} more TVX
                    </>
                  )}
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Confirm dialog */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="border-white/[0.08] bg-surface text-ink">
          <DialogHeader>
            <DialogTitle className="font-display text-ink">Confirm redemption</DialogTitle>
            <DialogDescription className="text-ink-muted">
              Review your balance before redeeming this reward.
            </DialogDescription>
          </DialogHeader>

          {selectedItem ? (
            <div className="space-y-2.5 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-muted">Item</span>
                <span className="font-medium text-ink">{selectedItem.title}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-muted">Cost</span>
                <span className="tvx-num font-semibold text-gold">−{selectedItem.cost.toLocaleString()} TVX</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-muted">Current balance</span>
                <span className="tvx-num font-medium text-ink">{wallet.balance.toLocaleString()} TVX</span>
              </div>
              <div className="flex items-center justify-between border-t border-white/[0.06] pt-2.5 text-sm">
                <span className="text-ink-muted">Balance after</span>
                <span className="tvx-num font-semibold text-ink">
                  {Math.max(0, wallet.balance - selectedItem.cost).toLocaleString()} TVX
                </span>
              </div>
              {wallet.balance < selectedItem.cost ? (
                <p className="text-xs text-destructive">Not enough TVX to redeem this reward.</p>
              ) : null}
            </div>
          ) : null}

          <DialogFooter>
            <Button
              variant="outline"
              className="border-white/10 bg-white/[0.03] text-ink-dim hover:bg-white/[0.06] hover:text-ink"
              onClick={() => setIsConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-gradient-to-b from-[#f2c877] to-gold-deep font-semibold text-[#241a06] hover:brightness-105"
              onClick={handleRedeemConfirm}
              disabled={!selectedItem || wallet.balance < (selectedItem?.cost ?? 0)}
            >
              Confirm redeem
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
