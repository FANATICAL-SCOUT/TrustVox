import type { ReactNode } from "react"
import AdminNavbar from "@/components/admin-navbar"

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-ink">
      <AdminNavbar />
      <main className="mx-auto w-full max-w-7xl px-4 pb-12 pt-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  )
}
