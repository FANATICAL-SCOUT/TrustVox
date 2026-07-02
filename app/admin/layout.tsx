import type { ReactNode } from "react"
import AdminNavbar from "@/components/admin-navbar"

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#070811] text-[#f5f3ff]">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_12%_18%,rgba(139,92,246,0.18),transparent_40%),radial-gradient(circle_at_86%_12%,rgba(124,58,237,0.14),transparent_38%),linear-gradient(180deg,#070811_0%,#090b14_45%,#05060d_100%)]" />
      <AdminNavbar />
      <main className="mx-auto w-full max-w-7xl px-4 pb-12 pt-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  )
}
