"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Home, Lightbulb, History, User, Bell, Wallet, Store, Menu } from "lucide-react"
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import BrandLogo from "@/components/brand-logo"
import NotificationsModal from "@/components/modals/notifications-modal"
import {
  getUnreadNotificationsCount,
  refreshSystemNotifications,
  subscribeToUserNotifications,
  type UserNotification,
} from "@/lib/user-notifications"
import { getTVXWalletState, subscribeToTVXWalletUpdates } from "@/lib/tvx-wallet"

interface UserNavbarProps {
  activeSection: string
  setActiveSection?: (section: string) => void
  dailyFeedbackCount: number
  onViewNotification: (notification: UserNotification) => void
}

const navItems = [
  { name: "Home", section: "home", icon: Home, route: "/user/dashboard" },
  { name: "Suggested", section: "suggested", icon: Lightbulb, route: "/user/dashboard?section=suggested" },
  { name: "History", section: "history", icon: History, route: "/user/dashboard?section=history" },
  { name: "Wallet", section: "wallet", icon: Wallet, route: "/user/wallet" },
  { name: "Store", section: "store", icon: Store, route: "/user/store" },
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

    if (isDashboardSection && setActiveSection && pathname === "/user/dashboard") {
      setActiveSection(item.section)
    }

    router.push(item.route)
  }

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    const updateUnread = () => {
      void refreshSystemNotifications().then((items) => setUnreadCount(items.filter((item) => !item.isRead).length))
    }

    updateUnread()

    const unsubscribe = subscribeToUserNotifications((items) =>
      setUnreadCount(items.filter((item) => !item.isRead).length),
    )
    window.addEventListener("focus", updateUnread)

    return () => {
      unsubscribe()
      window.removeEventListener("focus", updateUnread)
    }
  }, [])

  useEffect(() => {
    const syncWallet = () => {
      void getTVXWalletState().then((wallet) => setTvxBalance(wallet.balance))
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
      <div className="flex h-16 items-center gap-2 px-3 sm:gap-4 sm:px-6 lg:px-8">
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-ink-dim hover:bg-gold/10 hover:text-gold md:hidden"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[88%] border-white/10 bg-surface p-0 sm:max-w-xs">
            <SheetHeader className="border-b border-white/10 px-4 py-4 text-left">
              <SheetTitle className="text-ink">Menu</SheetTitle>
            </SheetHeader>
            <div className="space-y-1 p-3">
              {navItems.map((item) => {
                const active = activeSection === item.section
                return (
                  <SheetClose asChild key={item.name}>
                    <button
                      onClick={() => handleNavClick(item)}
                      className={`flex w-full items-center rounded-md border px-3 py-2.5 text-sm font-medium transition-all ${
                        active
                          ? "border-gold/40 bg-gold/10 text-gold"
                          : "border-transparent text-ink-dim hover:border-gold/20 hover:bg-gold/5 hover:text-ink"
                      }`}
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {item.name}
                    </button>
                  </SheetClose>
                )
              })}

              <div className="my-2 border-t border-white/10" />

              <SheetClose asChild>
                <button
                  onClick={() => {
                    setActiveSection?.("profile")
                    router.push("/user/dashboard?section=profile")
                  }}
                  className={`flex w-full items-center rounded-md border px-3 py-2.5 text-sm font-medium transition-all ${
                    activeSection === "profile"
                      ? "border-gold/40 bg-gold/10 text-gold"
                      : "border-transparent text-ink-dim hover:border-gold/20 hover:bg-gold/5 hover:text-ink"
                  }`}
                >
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </button>
              </SheetClose>
            </div>
          </SheetContent>
        </Sheet>

        <Link
          href="/user/dashboard"
          className="inline-flex items-center"
          onClick={() => setActiveSection?.("home")}
          aria-label="Go to Home"
        >
          <BrandLogo width={132} height={38} className="h-7 w-auto sm:h-9" />
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

        <div className="ml-auto flex items-center gap-1 sm:gap-3">
          {isMounted && (
            <div className="hidden items-center gap-1.5 rounded-full border border-gold/25 bg-gold/10 px-3 py-1.5 text-xs font-semibold text-gold sm:inline-flex">
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
              router.push("/user/dashboard?section=profile")
            }}
            className={`hidden rounded-full border sm:inline-flex ${
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
          void getUnreadNotificationsCount().then(setUnreadCount)
        }}
        onViewNotification={(notification) => {
          onViewNotification(notification)
          void getUnreadNotificationsCount().then(setUnreadCount)
        }}
      />
    </header>
  )
}
