"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Bell, Sparkles, CheckCircle2, Clock, AlertTriangle, BellRing } from "lucide-react"
import {
  getUserNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  refreshSystemNotifications,
  subscribeToUserNotifications,
  type UserNotification,
} from "@/lib/user-notifications"

interface NotificationsModalProps {
  isOpen: boolean
  onClose: () => void
  onViewNotification: (notification: UserNotification) => void
}

export default function NotificationsModal({ isOpen, onClose, onViewNotification }: NotificationsModalProps) {
  const [notifications, setNotifications] = useState<UserNotification[]>([])

  useEffect(() => {
    void refreshSystemNotifications().then(() => setNotifications(getUserNotifications()))

    const unsubscribe = subscribeToUserNotifications((items) => {
      setNotifications(items)
    })

    return unsubscribe
  }, [])

  useEffect(() => {
    if (!isOpen) return
    void refreshSystemNotifications().then(() => setNotifications(getUserNotifications()))
  }, [isOpen])

  const getNotificationBg = (type: UserNotification["type"]) => {
    switch (type) {
      case "new_opportunity":
        return "bg-gold/10 border-gold/25"
      case "reward_pending":
        return "bg-gold/10 border-gold/25"
      case "reward_credited":
        return "bg-mint/10 border-mint/25"
      case "reward_redeemed":
        return "bg-gold/10 border-gold/25"
      case "streak_risk":
        return "bg-destructive/10 border-destructive/25"
      default:
        return "bg-white/[0.03] border-white/[0.08]"
    }
  }

  const iconByType = useMemo(
    () => ({
      new_opportunity: <Sparkles className="h-4 w-4 text-gold" />,
      reward_pending: <Clock className="h-4 w-4 text-gold" />,
      reward_credited: <CheckCircle2 className="h-4 w-4 text-mint" />,
      reward_redeemed: <CheckCircle2 className="h-4 w-4 text-gold" />,
      streak_risk: <AlertTriangle className="h-4 w-4 text-destructive" />,
    }),
    [],
  )

  const formatTimeAgo = (isoDate: string) => {
    const diff = Date.now() - Date.parse(isoDate)
    const mins = Math.floor(diff / (1000 * 60))
    if (mins < 1) return "Just now"
    if (mins < 60) return `${mins} min ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""} ago`
    const days = Math.floor(hours / 24)
    return `${days} day${days !== 1 ? "s" : ""} ago`
  }

  const handleMarkAsRead = (id: string) => {
    markNotificationAsRead(id)
  }

  const handleMarkAllAsRead = () => {
    markAllNotificationsAsRead()
  }

  const handleViewClick = (notification: UserNotification) => {
    onViewNotification(notification)
    handleMarkAsRead(notification.id)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl border-white/[0.08] bg-surface p-6 text-ink shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-gold/20 bg-gradient-to-br from-gold/20 to-gold-deep/20">
              <Bell className="h-5 w-5 text-gold" />
            </div>
            <div>
              <DialogTitle className="font-display text-xl text-ink">Notifications</DialogTitle>
              <DialogDescription className="text-ink-muted">
                Survey updates, reward status, and activity alerts
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-6 space-y-3">
          {notifications.length === 0 && (
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-6 text-center text-sm text-ink-muted">
              <BellRing className="mx-auto mb-2 h-8 w-8 text-ink-muted" />
              No notifications yet. New surveys and reward updates will appear here.
            </div>
          )}
          {notifications.map((notification, index) => (
            <div key={notification.id}>
              <div
                className={`cursor-pointer rounded-xl border p-4 transition-transform duration-200 hover:scale-[1.01] ${getNotificationBg(notification.type)}`}
                onClick={() => handleViewClick(notification)}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1 shrink-0">{iconByType[notification.type]}</div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <h4 className="truncate text-sm font-medium text-ink">{notification.title}</h4>
                      <div className="flex items-center gap-2">
                        {!notification.isRead && (
                          <span className="rounded-full bg-gold px-2 py-0.5 text-xs font-semibold text-[#241a06]">
                            New
                          </span>
                        )}
                        <div className="flex items-center text-xs text-ink-muted">
                          <Clock className="mr-1 h-3 w-3" />
                          {formatTimeAgo(notification.createdAt)}
                        </div>
                      </div>
                    </div>
                    <p className="mb-2 text-sm text-ink-dim">{notification.message}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs capitalize text-ink-muted">{notification.type.replace("_", " ")}</span>
                      <Button size="sm" variant="ghost" className="h-6 px-2 text-gold hover:text-gold">
                        View
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              {index < notifications.length - 1 && <Separator className="my-2 bg-white/[0.06]" />}
            </div>
          ))}
        </div>

        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={handleMarkAllAsRead}
            className="border-white/10 bg-white/[0.03] text-ink-dim hover:bg-white/[0.06] hover:text-ink"
          >
            Mark All as Read
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
