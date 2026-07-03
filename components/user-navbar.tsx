"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Home, Lightbulb, History, User, Bell, Wallet, Store } from "lucide-react"
import BrandLogo from "@/components/brand-logo"
import NotificationsModal from "@/components/modals/notifications-modal"
import { getUnreadNotificationsCount, refreshSystemNotifications, type UserNotification } from "@/lib/user-notifications"
import { getTVXWalletState, subscribeToTVXWalletUpdates } from "@/lib/tvx-wallet"

interface UserNavbarProps {
  activeSection: string
  setActiveSection?: (section: string) => void
  dailyFeedbackCount: number
  onViewNotification: (notification: UserNotification) => void
}

const navItems = [
  { name: "Home", section: "home", icon: Home, route: "/dashboard" },
  { name: "Suggested", section: "suggested", icon: Lightbulb, route: "/dashboard?section=suggested" },
  { name: "History", section: "history", icon: History, route: "/dashboard?section=history" },
  { name: "Wallet", section: "wallet", icon: Wallet, route: "/wallet" },
  { name: "Store", section: "store", icon: Store, route: "/store" },
]

export default function UserNavbar({
  activeSection,
  setActiveSection,
  dailyFeedbackCount,
  onViewNotification,
}: UserNavbarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [tvxBalance, setTvxBalance] = useState(0)
  const [isMounted, setIsMounted] = useState(false)

  const handleNavClick = (item: (typeof navItems)[number]) => {
    const isDashboardSection = item.section === "home" || item.section === "suggested" || item.section === "history"

    if (isDashboardSection && setActiveSection && pathname === "/dashboard") {
      setActiveSection(item.section)
    }

    router.push(item.route)
  }

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    refreshSystemNotifications()
    setUnreadCount(getUnreadNotificationsCount())

    const updateUnread = () => {
      refreshSystemNotifications()
      setUnreadCount(getUnreadNotificationsCount())
    }

    window.addEventListener("trustvox:user-notifications-updated", updateUnread)
    window.addEventListener("focus", updateUnread)

    return () => {
      window.removeEventListener("trustvox:user-notifications-updated", updateUnread)
      window.removeEventListener("focus", updateUnread)
    }
  }, [])

  useEffect(() => {
    const syncWallet = () => {
      setTvxBalance(getTVXWalletState().balance)
    }

    syncWallet()
    const unsubscribe = subscribeToTVXWalletUpdates(syncWallet)
    window.addEventListener("focus", syncWallet)

    return () => {
      unsubscribe()
      window.removeEventListener("focus", syncWallet)
    }
  }, [])

  return (
    <header className="fixed top-0 z-50 w-full border-b border-white/[0.06] bg-background/70 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center"
          onClick={() => setActiveSection?.("home")}
          aria-label="Go to Home"
        >
          <BrandLogo width={132} height={38} className="h-9 w-auto" />
        </Link>

        <nav className="ml-2 hidden items-center gap-1 md:flex">
          {navItems.map((item) => {
            const active = activeSection === item.section
            return (
              <button
                key={item.name}
                onClick={() => handleNavClick(item)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 ${
                  active ? "bg-gold/10 text-gold" : "text-ink-dim hover:bg-white/5 hover:text-ink"
                }`}
                aria-label={item.name}
                aria-current={active ? "page" : undefined}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </button>
            )
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          {isMounted && (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-gold/25 bg-gold/10 px-3 py-1.5 text-xs font-semibold text-gold">
              <span className="h-3 w-3 rounded-full bg-[radial-gradient(circle_at_35%_30%,#f6d798,#c89545)]" />
              <span className="tvx-num">{tvxBalance.toLocaleString()}</span> TVX
            </div>
          )}

          <div className="hidden items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs text-ink-muted sm:inline-flex">
            <span>Today</span>
            <span className="tvx-num font-semibold text-ink">{dailyFeedbackCount}</span>
          </div>

          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Notifications"
              onClick={() => setIsNotificationsOpen(true)}
              className="text-ink-dim hover:text-ink"
            >
              <Bell className="h-5 w-5" />
            </Button>
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-[1rem] place-items-center rounded-full bg-gold px-1 text-[10px] font-bold text-[#241a06]">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            aria-label="Profile"
            onClick={() => {
              setActiveSection?.("profile")
              router.push("/dashboard?section=profile")
            }}
            className={`rounded-full border ${
              activeSection === "profile"
                ? "border-gold/50 bg-gold/10 text-gold"
                : "border-white/10 text-ink-dim hover:border-white/25 hover:text-ink"
            }`}
          >
            <User className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => {
          setIsNotificationsOpen(false)
          setUnreadCount(getUnreadNotificationsCount())
        }}
        onViewNotification={(notification) => {
          onViewNotification(notification)
          setUnreadCount(getUnreadNotificationsCount())
        }}
      />
    </header>
  )
}
