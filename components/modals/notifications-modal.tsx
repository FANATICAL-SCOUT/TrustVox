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
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
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
    refreshSystemNotifications()
    setNotifications(getUserNotifications())

    const unsubscribe = subscribeToUserNotifications((items) => {
      setNotifications(items)
    })

    return unsubscribe
  }, [])

  useEffect(() => {
    if (!isOpen) return
    refreshSystemNotifications()
    setNotifications(getUserNotifications())
  }, [isOpen])

  const getNotificationBg = (type: UserNotification["type"]) => {
    switch (type) {
      case "new_opportunity":
        return "bg-yellow-500/10 border-yellow-500/20"
      case "reward_pending":
        return "bg-cyan-500/10 border-cyan-500/20"
      case "reward_credited":
        return "bg-green-500/10 border-green-500/20"
      case "reward_redeemed":
        return "bg-violet-500/10 border-violet-500/20"
      case "streak_risk":
        return "bg-orange-500/10 border-orange-500/20"
      default:
        return "bg-slate-700/30 border-slate-600/30"
    }
  }

  const iconByType = useMemo(
    () => ({
      new_opportunity: <Sparkles className="w-4 h-4 text-yellow-300" />,
      reward_pending: <Clock className="w-4 h-4 text-cyan-300" />,
      reward_credited: <CheckCircle2 className="w-4 h-4 text-green-300" />,
      reward_redeemed: <CheckCircle2 className="w-4 h-4 text-violet-300" />,
      streak_risk: <AlertTriangle className="w-4 h-4 text-orange-300" />,
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
      <DialogContent
        className="bg-[#0f172a] text-white p-6 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <DialogHeader>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-purple-600 rounded-full flex items-center justify-center">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl text-slate-100">Notifications</DialogTitle>
              <DialogDescription className="text-slate-400">
                Survey updates, reward status, and activity alerts
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 mt-6">
          {notifications.length === 0 && (
            <Card className="space-card border-slate-700/60 bg-slate-900/40">
              <CardContent className="p-6 text-center text-slate-300">
                <BellRing className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                No notifications yet. New surveys and reward updates will appear here.
              </CardContent>
            </Card>
          )}
          {notifications.map((notification, index) => (
            <div key={notification.id}>
              <Card
                className={`space-card ${getNotificationBg(notification.type)} hover:scale-[1.01] transition-transform duration-200 cursor-pointer`}
                onClick={() => handleViewClick(notification)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">{iconByType[notification.type]}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-sm font-medium text-slate-100 truncate">{notification.title}</h4>
                        <div className="flex items-center space-x-2">
                          {!notification.isRead && (
                            <Badge className="bg-teal-600 text-white text-xs px-2 py-0.5">New</Badge>
                          )}
                          <div className="flex items-center text-xs text-slate-400">
                            <Clock className="w-3 h-3 mr-1" />
                            {formatTimeAgo(notification.createdAt)}
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-slate-300 mb-2">{notification.message}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400 capitalize">{notification.type.replace("_", " ")}</span>
                        <Button size="sm" variant="ghost" className="text-teal-400 hover:text-teal-300 h-6 px-2">
                          View
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              {index < notifications.length - 1 && <Separator className="bg-slate-700/50 my-2" />}
            </div>
          ))}
        </div>

        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={handleMarkAllAsRead}
            className="bg-slate-800/50 border-slate-600 text-slate-300"
          >
            Mark All as Read
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
