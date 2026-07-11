"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { CheckCircle2, Sparkles, Lock, Gift, Tv, Shirt, ArrowRight, Copy, Check, type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  emptyWalletState,
  getTVXWalletState,
  redeemTVXItem,
  subscribeToTVXWalletUpdates,
  type Redemption,
  type TVXWalletState,
} from "@/lib/tvx-wallet"
import { getStoreItems, type StoreCategory, type StoreItem } from "@/lib/store-catalog"
import { recordStoreRedemptionNotification } from "@/lib/user-notifications"

const CATEGORY_ICON: Record<StoreCategory, LucideIcon> = {
  vouchers: Gift,
  subscriptions: Tv,
  merch: Shirt,
}

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
  const [wallet, setWallet] = useState<TVXWalletState>(emptyWalletState)
  const [items, setItems] = useState<StoreItem[]>([])
  const [selectedItem, setSelectedItem] = useState<StoreItem | null>(null)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isRedeeming, setIsRedeeming] = useState(false)
  const [feedbackMessage, setFeedbackMessage] = useState<FeedbackMessage | null>(null)
  const [redeemedCoupon, setRedeemedCoupon] = useState<{ item: string; coupon: Redemption } | null>(null)
  const [copied, setCopied] = useState(false)
  const [activeFilter, setActiveFilter] = useState<"all" | StoreCategory>("all")

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

  useEffect(() => {
    void getStoreItems().then(setItems)
  }, [])

  const redeemableCount = useMemo(
    () => items.filter((item) => wallet.balance >= item.cost).length,
    [items, wallet.balance],
  )

  const lowestCost = useMemo(
    () => (items.length ? Math.min(...items.map((item) => item.cost)) : 0),
    [items],
  )
  const firstRewardGap = Math.max(0, lowestCost - wallet.balance)
  const cheapestProgress = lowestCost > 0 ? Math.min(100, Math.round((wallet.balance / lowestCost) * 100)) : 0

  const motivationMessage =
    firstRewardGap > 0
      ? `${firstRewardGap} TVX to your first reward`
      : `${redeemableCount} reward${redeemableCount === 1 ? "" : "s"} ready to redeem`

  const filteredItems = useMemo(
    () => (activeFilter === "all" ? items : items.filter((item) => item.category === activeFilter)),
    [items, activeFilter],
  )

  const openConfirmModal = (item: StoreItem) => {
    setSelectedItem(item)
    setFeedbackMessage(null)
    setRedeemedCoupon(null)
    setCopied(false)
    setIsConfirmOpen(true)
  }

  const handleRedeemConfirm = async () => {
    if (!selectedItem || isRedeeming) return

    const item = selectedItem
    setIsRedeeming(true)
    const result = await redeemTVXItem({ id: item.id, title: item.title })
    setIsRedeeming(false)

    setWallet(result.wallet)

    if (result.success) {
      await recordStoreRedemptionNotification(item.title, item.cost, result.wallet.balance)
      setFeedbackMessage(null)
      // Surface the real coupon the server just created (code + profile pointer),
      // instead of a bare "redeemed" line — the coupon is the point of redeeming.
      if (result.coupon) {
        setRedeemedCoupon({ item: item.title, coupon: result.coupon })
      } else {
        setFeedbackMessage({ type: "success", text: result.message })
      }
      setIsConfirmOpen(false)
      setSelectedItem(null)
      return
    }

    setFeedbackMessage({ type: "error", text: result.message })
  }

  const handleCopyCoupon = async () => {
    if (!redeemedCoupon) return
    try {
      await navigator.clipboard.writeText(redeemedCoupon.coupon.couponCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard blocked (e.g. insecure context) — the code stays visible to copy manually
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div data-reveal-block className="text-center">
        <h1 className="font-display text-4xl font-extrabold tracking-[-0.03em] text-ink">Redemption <span className="tvx-text-gold">store</span></h1>
        <p className="mx-auto mt-3 max-w-xl text-ink-dim">Spend your TVX tokens on vouchers, subscriptions, and community merch.</p>
      </div>

      {/* Balance hero */}
      <div data-reveal-card className="tvx-card-gold mt-8 rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-7">
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

      {/* Coupon reveal — the real code the server just issued, plus where it lives */}
      {redeemedCoupon ? (
        <div
          role="status"
          className="tvx-card-gold mt-6 rounded-xl border border-mint/25 bg-mint/[0.06] p-5"
        >
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 flex-none place-items-center rounded-lg border border-mint/25 bg-mint/10 text-mint">
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">
                <span className="text-mint">{redeemedCoupon.item}</span> redeemed
              </p>
              <p className="mt-0.5 text-xs text-ink-muted">
                Here&apos;s your coupon code — it&apos;s saved in your profile and valid for 30 days.
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <code className="tvx-num rounded-lg border border-gold/25 bg-gold/[0.08] px-3 py-1.5 text-sm font-bold tracking-wider text-gold">
                  {redeemedCoupon.coupon.couponCode}
                </code>
                <button
                  type="button"
                  onClick={handleCopyCoupon}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-xs font-medium text-ink-dim transition-colors hover:border-white/20 hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-mint" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </button>
                <Link
                  href="/user/dashboard?section=profile"
                  className="inline-flex items-center gap-1 text-xs font-medium text-gold hover:underline"
                >
                  View in profile <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : feedbackMessage ? (
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
              disabled={!selectedItem || isRedeeming || wallet.balance < (selectedItem?.cost ?? 0)}
            >
              {isRedeeming ? "Redeeming…" : "Confirm redeem"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
