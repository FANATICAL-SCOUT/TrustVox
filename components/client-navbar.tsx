"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, Rocket, LogOut, FileText, Plus, User, ChevronDown, BarChart3, History } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { clearUserSession, getStoredClientData } from "@/lib/auth-utils"
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

const navItems = [
  { name: "Dashboard", href: "/client/dashboard", icon: LayoutDashboard, match: ["/client/dashboard", "/client/home", "/client-home"] },
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
    const stored = getStoredClientData()
    const email = stored?.contactEmail || stored?.email || "client@trustvox.com"
    const company = stored?.companyName || "Client"
    setProfile({ email, company })
  }, [pathname])

  const initials = (profile.company || "C").slice(0, 1).toUpperCase()

  const handleLogout = () => {
    clearUserSession()
    router.push("/")
  }

  return (
    <header className="fixed top-0 z-50 w-full border-b border-[#30363D] bg-[#0D1117]/90 backdrop-blur-sm">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
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
                  className={`relative flex items-center rounded-md px-3 py-2 text-sm transition-colors ${
                    active ? "text-[#A78BFA] bg-[#A78BFA]/10" : "text-[#C9D1D9] hover:text-[#F0F6FC] hover:bg-white/5"
                  }`}
                  aria-label={item.name}
                >
                  <item.icon className="mr-1.5 h-4 w-4" />
                  {item.name}
                  {active ? <span className="absolute inset-x-2 -bottom-1 h-0.5 rounded-full bg-[#A78BFA]" /> : null}
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="flex items-center space-x-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-[#C9D1D9] hover:text-[#F0F6FC] flex items-center gap-2" aria-label="Client profile menu">
                <Avatar className="h-7 w-7 border border-[#30363D]">
                  <AvatarFallback className="bg-[#21262D] text-[#F0F6FC] text-xs">{initials}</AvatarFallback>
                </Avatar>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-[#161B22] border-[#30363D] text-[#F0F6FC]">
              <DropdownMenuLabel className="text-[#8B949E] text-xs">{profile.email}</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-[#30363D]" />
              <DropdownMenuItem className="cursor-pointer" onClick={() => router.push("/client/profile")}>
                <User className="mr-2 h-4 w-4" /> Profile
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer text-[#F87171] focus:text-[#F87171]" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" /> Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
