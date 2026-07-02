"use client"

import { ReactNode } from "react"
import { isUserLoggedIn, getLoggedInUserInfo } from "@/lib/auth-utils"

export function ClientAuthProvider({ children }: { children: ReactNode }) {
  // Check if user is logged in on client side
  // This can be expanded to auto-redirect to dashboard if accessing login/signup pages
  if (typeof window !== "undefined") {
    const userInfo = getLoggedInUserInfo()
    // You can add auto-navigation logic here if needed
    // For example, redirecting from login page if already logged in
  }

  return <>{children}</>
}
