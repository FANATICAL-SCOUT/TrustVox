"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, Rocket, LogOut, FileText, Plus, User, ChevronDown, BarChart3, History, Menu } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import BrandLogo from "@/components/brand-logo"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

const navItems = [
  { name: "Dashboard", href: "/client/dashboard", icon: LayoutDashboard, match: ["/client/dashboard"] },
  { name: "My Forms", href: "/client/forms", icon: FileText, match: ["/client/forms"] },
  { name: "Create Form", href: "/client/create", icon: Plus, match: ["/client/create", "/client/create-feedback"] },
  { name: "Campaigns", href: "/client/campaigns", icon: Rocket, match: ["/client/campaigns"] },
  { name: "Analytics", href: "/client/analytics", icon: BarChart3, match: ["/client/analytics"] },
  { name: "History", href: "/client/history", icon: History, match: ["/client/history"] },
]

export default function ClientNavbar() {
  const router = useRouter()
  const pathname = usePathname()
  const [profile, setProfile] = useState({
    email: "client@trustvox.com",
    company: "Client",
  })

  useEffect(() => {
    let active = true
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data } = await supabase
        .from("profiles")
        .select("email, company_name")
        .eq("id", user.id)
        .single()
      if (!active) return
      setProfile({
        email: data?.email || user.email || "client@trustvox.com",
        company: data?.company_name || "Client",
      })
    })
    return () => {
      active = false
    }
  }, [pathname])

  const initials = (profile.company || "C").slice(0, 1).toUpperCase()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
  }

  return (
    <header className="fixed top-0 z-50 w-full border-b border-white/[0.06] bg-background/70 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 md:gap-6">
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
                  const active = item.match.some((route) => pathname?.startsWith(route))
                  return (
                    <SheetClose asChild key={item.name}>
                      <Link
                        href={item.href}
                        className={`flex items-center rounded-md border px-3 py-2.5 text-sm font-medium transition-all ${
                          active
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

                <div className="my-2 border-t border-white/10" />

                <SheetClose asChild>
                  <Link
                    href="/client/profile"
                    className="flex items-center rounded-md border border-transparent px-3 py-2.5 text-sm font-medium text-ink-dim transition-all hover:border-gold/20 hover:bg-gold/5 hover:text-ink"
                  >
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </SheetClose>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="mt-1 w-full justify-start text-ink-dim hover:bg-destructive/10 hover:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </Button>
              </div>
            </SheetContent>
          </Sheet>

          <Link href="/client/dashboard" className="inline-flex items-center">
            <BrandLogo width={138} height={40} className="h-10 w-auto" />
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const active = item.match.some((route) => pathname?.startsWith(route))
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`relative flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 ${
                    active ? "bg-gold/10 text-gold" : "text-ink-dim hover:bg-white/5 hover:text-ink"
                  }`}
                  aria-label={item.name}
                  aria-current={active ? "page" : undefined}
                >
                  <item.icon className="mr-1.5 h-4 w-4" />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="flex items-center space-x-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="flex items-center gap-2 text-ink-dim hover:text-ink" aria-label="Client profile menu">
                <Avatar className="h-7 w-7 border border-white/10">
                  <AvatarFallback className="bg-surface-raised text-xs text-ink">{initials}</AvatarFallback>
                </Avatar>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="border-white/10 bg-surface-raised text-ink">
              <DropdownMenuLabel className="text-xs text-ink-muted">{profile.email}</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem className="cursor-pointer focus:bg-gold/10 focus:text-gold" onClick={() => router.push("/client/profile")}>
                <User className="mr-2 h-4 w-4" /> Profile
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" /> Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
