"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import UserNavbar from "@/components/user/user-navbar"
import WalletSection from "@/components/user/wallet-section"
import { getFeedbackQuota, subscribeToFeedbackQuotaUpdates } from "@/lib/feedback-quota"
import { refreshSystemNotifications, type UserNotification } from "@/lib/user-notifications"

export default function WalletPage() {
  const router = useRouter()
  const [dailyFeedbackCount, setDailyFeedbackCount] = useState(0)

  useEffect(() => {
    const syncQuota = () => {
      void getFeedbackQuota().then((quota) => setDailyFeedbackCount(quota.remaining))
    }

    void refreshSystemNotifications()
    syncQuota()

    const unsubscribeQuota = subscribeToFeedbackQuotaUpdates((quota) => {
      setDailyFeedbackCount(quota.remaining)
      void refreshSystemNotifications()
    })

    const onFocus = () => {
      syncQuota()
      void refreshSystemNotifications()
    }

    window.addEventListener("focus", onFocus)

    return () => {
      unsubscribeQuota()
      window.removeEventListener("focus", onFocus)
    }
  }, [])

  const handleViewNotification = (notification: UserNotification) => {
    const actionRoute = notification.action?.route

    if (notification.type === "reward_pending" || notification.type === "reward_credited") {
      router.push("/user/dashboard?section=history")
      return
    }

    if (actionRoute) {
      router.push(actionRoute)
    }
  }

  return (
    <div className="min-h-screen">
      <UserNavbar
        activeSection="wallet"
        dailyFeedbackCount={dailyFeedbackCount}
        onViewNotification={handleViewNotification}
      />
      <main className="pt-16">
        <WalletSection />
      </main>
    </div>
  )
}
