"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Home, Users, LogOut, ClipboardCheck, Building2, Menu } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { createClient } from "@/lib/supabase/client"
import BrandLogo from "@/components/brand-logo"

const navItems = [
  { name: "Dashboard", href: "/admin", icon: Home, match: ["/admin"] },
  { name: "Approvals", href: "/admin/approvals", icon: ClipboardCheck, match: ["/admin/approvals"] },
  {
    name: "Companies",
    href: "/admin/approved-companies",
    icon: Building2,
    match: ["/admin/approved-companies", "/admin/companies"],
  },
  {
    name: "Users",
    href: "/admin/user-management",
    icon: Users,
    match: ["/admin/user-management", "/admin/users"],
  },
]

export default function AdminNavbar() {
  const router = useRouter()
  const pathname = usePathname()

  const isRouteActive = (route: string) => pathname === route || pathname?.startsWith(`${route}/`)

  const isItemActive = (item: (typeof navItems)[number]) =>
    item.name === "Dashboard" ? pathname === "/admin" : item.match.some((route) => isRouteActive(route))

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.06] bg-background/80 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-ink-dim hover:bg-gold/10 hover:text-gold md:hidden"
                aria-label="Open admin navigation"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[88%] border-white/10 bg-surface p-0 sm:max-w-xs">
              <SheetHeader className="border-b border-white/10 px-4 py-4 text-left">
                <SheetTitle className="text-ink">Admin Navigation</SheetTitle>
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
                            ? "border-gold/40 bg-gold/10 text-gold"
                            : "border-transparent text-ink-dim hover:border-gold/20 hover:bg-gold/5 hover:text-ink"
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
                  className="mt-3 w-full justify-start text-ink-dim hover:bg-destructive/10 hover:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </Button>
              </div>
            </SheetContent>
          </Sheet>

          <Link href="/admin" scroll={false} className="mr-3 inline-flex items-center md:mr-6" aria-label="Go to Dashboard">
            <BrandLogo width={138} height={40} className="h-10 w-auto" />
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => {
              const isActive = isItemActive(item)

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  scroll={false}
                  className={`flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 ${
                    isActive ? "bg-gold/10 text-gold" : "text-ink-dim hover:bg-white/5 hover:text-ink"
                  }`}
                  aria-label={item.name}
                  aria-current={isActive ? "page" : undefined}
                >
                  <item.icon className="mr-1.5 h-4 w-4" />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="hidden items-center gap-2 text-ink-dim hover:bg-destructive/10 hover:text-destructive sm:flex"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>
    </header>
  )
}
