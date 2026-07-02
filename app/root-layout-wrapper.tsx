"use client"

import { ReactNode } from "react"
import { usePathname } from "next/navigation"
import ClientNavbar from "@/components/client-navbar"

export default function RootLayoutWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  
  // Check if current route is a client route (both /client/* and /client-* paths), excluding auth pages
  const isAuthPage = pathname?.includes("login") || pathname?.includes("signup")
  const isClientRoute = (pathname?.startsWith("/client") || pathname?.startsWith("/user")) && !isAuthPage

  if (isClientRoute) {
    return (
      <div className="min-h-screen bg-[#090b14]">
        <ClientNavbar />
        <main className="pt-16">{children}</main>
      </div>
    )
  }

  return <>{children}</>
}
