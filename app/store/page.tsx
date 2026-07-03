"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import UserNavbar from "@/components/user-navbar"
import StoreSection from "@/components/store-section"
import { getFeedbackQuota, subscribeToFeedbackQuotaUpdates } from "@/lib/feedback-quota"
import { refreshSystemNotifications, type UserNotification } from "@/lib/user-notifications"

export default function StorePage() {
  const router = useRouter()
  const [dailyFeedbackCount, setDailyFeedbackCount] = useState(getFeedbackQuota().remaining)

  useEffect(() => {
    const syncQuota = () => {
      setDailyFeedbackCount(getFeedbackQuota().remaining)
    }

    refreshSystemNotifications()
    syncQuota()

    const unsubscribeQuota = subscribeToFeedbackQuotaUpdates(() => {
      syncQuota()
      refreshSystemNotifications()
    })

    const onFocus = () => {
      syncQuota()
      refreshSystemNotifications()
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
      router.push("/dashboard?section=history")
      return
    }

    if (actionRoute) {
      router.push(actionRoute)
    }
  }

  return (
    <div className="min-h-screen">
      <UserNavbar
        activeSection="store"
        dailyFeedbackCount={dailyFeedbackCount}
        onViewNotification={handleViewNotification}
      />
      <main className="pt-16">
        <StoreSection />
      </main>
    </div>
  )
}
