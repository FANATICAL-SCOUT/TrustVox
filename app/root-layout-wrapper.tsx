"use client"

import { ReactNode } from "react"
import { usePathname } from "next/navigation"
import ClientNavbar from "@/components/client-navbar"

export default function RootLayoutWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  
  // Client area gets the shared ClientNavbar shell. Auth pages are excluded, and
  // so are the focused /user/* flows, which provide their own back navigation.
  const isAuthPage = pathname?.includes("login") || pathname?.includes("signup")
  const isClientRoute = pathname?.startsWith("/client") && !isAuthPage

  if (isClientRoute) {
    return (
      <div className="min-h-screen bg-background">
        <ClientNavbar />
        <main className="pt-16">{children}</main>
      </div>
    )
  }

  return <>{children}</>
}
