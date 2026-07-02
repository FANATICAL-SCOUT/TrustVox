"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Home, Lightbulb, History, User, Bell, Wallet, Coins, Store } from "lucide-react"
import BrandLogo from "@/components/brand-logo"
import NotificationsModal from "@/components/modals/notifications-modal"
import { getUnreadNotificationsCount, refreshSystemNotifications } from "@/lib/user-notifications"
import { getTVXWalletState, subscribeToTVXWalletUpdates } from "@/lib/tvx-wallet"

interface UserNavbarProps {
  activeSection: string;
  setActiveSection?: (section: string) => void;
  dailyFeedbackCount: number;
  onViewNotification: (notification: any) => void;
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
    <header className="fixed top-0 z-50 w-full border-b border-violet-300/10 bg-[#050714]/45 backdrop-blur-md shadow-[0_1px_0_rgba(167,139,250,0.10)]">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center mr-6"
            onClick={() => setActiveSection?.("home")}
            aria-label="Go to Home"
          >
            <BrandLogo width={138} height={40} className="h-10 w-auto" />
          </Link>
          <nav className="hidden md:flex items-center space-x-4">
            {navItems.map((item) => (
              <button
                key={item.name}
                onClick={() => handleNavClick(item)}
                className={`flex items-center text-sm font-medium transition-colors hover:text-[#a78bfa] focus:outline-none ${
                  activeSection === item.section ? "text-[#a78bfa]" : "text-[rgba(241,245,249,0.75)]"
                }`}
                aria-label={item.name}
              >
                <item.icon className="w-4 h-4 mr-1" />
                {item.name}
              </button>
            ))}
          </nav>
        </div>
        <div className="flex items-center space-x-4">
          {isMounted && (
            <div className="flex items-center gap-1.5 rounded-full border border-violet-400/30 bg-violet-500/12 px-3 py-1 text-xs font-semibold text-violet-100 shadow-[0_0_18px_rgba(139,92,246,0.28)]">
              <Coins className="h-3.5 w-3.5 text-violet-200" />
              <span>{tvxBalance} TVX</span>
            </div>
          )}
          <div className="flex items-center text-xs text-[rgba(241,245,249,0.55)] bg-[rgba(255,255,255,0.04)] rounded px-2 py-1 border border-[rgba(255,255,255,0.08)]">
            <span className="mr-1">Daily Feedbacks:</span>
            <span className="font-bold text-[#a78bfa]">{dailyFeedbackCount}</span>
          </div>
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Notifications"
              onClick={() => setIsNotificationsOpen(true)}
            >
              <Bell className="w-5 h-5" />
            </Button>
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 min-w-[1rem] h-4 px-1 rounded-full bg-violet-500 text-[10px] leading-4 text-white text-center">
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
            className={`rounded-full border ${activeSection === "profile" ? "border-violet-400/60 bg-violet-500/10 text-violet-300" : "border-white/10 text-slate-200 hover:border-violet-400/40"}`}
          >
            <User className="w-4 h-4" />
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
  );
}
