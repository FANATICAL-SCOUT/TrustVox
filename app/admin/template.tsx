"use client"

import type { ReactNode } from "react"
import { usePathname } from "next/navigation"

export default function AdminTemplate({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  return (
    <div key={pathname} className="admin-content-transition">
      {children}
    </div>
  )
}
