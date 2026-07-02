"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Home, Users, Bell, LogOut, ClipboardCheck, Building2, Menu } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { clearUserSession } from "@/lib/auth-utils"
import BrandLogo from "@/components/brand-logo"

const navItems = [
  { name: "Dashboard", href: "/admin", icon: Home, match: ["/admin", "/admin/dashboard"] },
  { name: "Users", href: "/admin/users", icon: Users, match: ["/admin/users", "/admin/user-management"] },
  {
    name: "Approvals",
    href: "/admin/approvals",
    icon: ClipboardCheck,
    match: ["/admin/approvals"],
  },
  {
    name: "Companies",
    href: "/admin/companies",
    icon: Building2,
    match: ["/admin/companies", "/admin/approved-companies"],
  },
  {
    name: "User Management",
    href: "/admin/user-management",
    icon: Users,
    match: ["/admin/user-management"],
  },
]

export default function AdminNavbar() {
  const router = useRouter()
  const pathname = usePathname()

  const isRouteActive = (route: string) => pathname === route || pathname?.startsWith(`${route}/`)

  const isItemActive = (item: (typeof navItems)[number]) => item.match.some((route) => isRouteActive(route))

  const handleLogout = () => {
    clearUserSession()
    router.push("/")
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#30363D] bg-[#0D1117]/80 backdrop-blur-sm">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden text-[#d7ddf5] hover:bg-[#8b5cf6]/10 hover:text-[#cbbfff]"
                aria-label="Open admin navigation"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[88%] border-[#2b3150] bg-[#0D1117] p-0 sm:max-w-xs">
              <SheetHeader className="border-b border-[#2b3150] px-4 py-4 text-left">
                <SheetTitle className="text-[#f5f7ff]">Admin Navigation</SheetTitle>
              </SheetHeader>
              <div className="space-y-1 p-3">
                {navItems.map((item) => {
                  const isActive = isItemActive(item)

                  return (
                    <SheetClose asChild key={item.name}>
                      <Link
                        href={item.href}
                        scroll={false}
                        className={`flex items-center rounded-md border px-3 py-2.5 text-sm font-medium transition-all ${
                          isActive
                            ? "border-[#8b5cf6]/45 bg-[#8b5cf6]/15 text-[#c5b7ff] shadow-[0_0_16px_rgba(139,92,246,0.26)]"
                            : "border-transparent text-[#d7ddf5] hover:border-[#8b5cf6]/25 hover:bg-[#8b5cf6]/10 hover:text-[#cbbfff]"
                        }`}
                      >
                        <item.icon className="mr-2 h-4 w-4" />
                        {item.name}
                      </Link>
                    </SheetClose>
                  )
                })}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="mt-3 w-full justify-start text-[#C9D1D9] hover:bg-[#F87171]/10 hover:text-[#F87171]"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </Button>
              </div>
            </SheetContent>
          </Sheet>

          <Link
            href="/admin"
            scroll={false}
            className="inline-flex items-center mr-3 md:mr-6"
            aria-label="Go to Dashboard"
          >
            <BrandLogo width={138} height={40} className="h-10 w-auto" />
          </Link>
          <nav className="hidden md:flex items-center gap-2">
            {navItems.map((item) => {
              const isActive = isItemActive(item)

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  scroll={false}
                  className={`flex items-center rounded-md border px-3 py-2 text-sm font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8b5cf6]/60 ${
                    isActive
                      ? "border-[#8b5cf6]/40 bg-[#8b5cf6]/15 text-[#c5b7ff] shadow-[0_0_18px_rgba(139,92,246,0.28)]"
                      : "border-transparent text-[#d7ddf5] hover:border-[#8b5cf6]/25 hover:bg-[#8b5cf6]/10 hover:text-[#cbbfff]"
                  }`}
                  aria-label={item.name}
                >
                  <item.icon className="mr-1.5 h-4 w-4" />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>
        <div className="flex items-center space-x-2 sm:space-x-4">
          <Button
            variant="ghost"
            size="icon"
            className="text-[#d7ddf5] hover:bg-[#8b5cf6]/10 hover:text-[#cbbfff]"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="hidden sm:flex text-[#C9D1D9] hover:bg-[#F87171]/10 hover:text-[#F87171] items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </div>
    </header>
  )
}
