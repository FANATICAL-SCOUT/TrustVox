"use client"

import { useEffect, useMemo, useState } from "react"
import { Users, Search, ShieldCheck, ShieldX, Eye, UserCheck, UserX, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  getManagedUsers,
  subscribeToManagedUsers,
  updateManagedUserStatus,
  type ManagedUser,
  type UserRole,
  type UserStatus,
} from "@/lib/approved-company-store"

function RoleBadge({ role }: { role: UserRole }) {
  const map: Record<UserRole, string> = {
    Admin: "border-[#A78BFA]/35 bg-[#A78BFA]/15 text-[#cfc3ff]",
    Client: "border-[#60A5FA]/35 bg-[#60A5FA]/15 text-[#bfddff]",
    User: "border-[#8b5cf6]/35 bg-[#8b5cf6]/15 text-[#d8ccff]",
  }
  return <Badge variant="outline" className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${map[role] || "border-[#2b3150] text-[#a5accb]"}`}>{role}</Badge>
}

function StatusBadge({ status }: { status: UserStatus }) {
  const className =
    status === "Active"
      ? "border-emerald-400/35 bg-emerald-400/15 text-emerald-200 shadow-[0_0_16px_rgba(52,211,153,0.2)]"
      : "border-rose-400/35 bg-rose-400/15 text-rose-200"

  return (
    <Badge variant="outline" className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${className}`}>
      {status}
    </Badge>
  )
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [query, setQuery] = useState("")
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null)
  const [activityOpen, setActivityOpen] = useState(false)

  const loadUsers = () => setUsers(getManagedUsers())

  useEffect(() => {
    loadUsers()
    const unsub = subscribeToManagedUsers(loadUsers)
    return () => unsub()
  }, [])

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return users
    return users.filter((user) =>
      user.name.toLowerCase().includes(q) ||
      user.email.toLowerCase().includes(q) ||
      user.role.toLowerCase().includes(q) ||
      user.status.toLowerCase().includes(q)
    )
  }, [users, query])

  const summaryStats = useMemo(() => {
    const totalUsers = users.length
    const activeUsers = users.filter((user) => user.status === "Active").length
    const blockedUsers = users.filter((user) => user.status === "Blocked").length
    const totalFeedbackSubmitted = users.reduce((sum, user) => sum + user.feedbackSubmittedCount, 0)

    return [
      {
        label: "Total Users",
        value: totalUsers.toLocaleString(),
        icon: Users,
        tint: "border-violet-300/20 bg-violet-500/10 text-violet-100",
      },
      {
        label: "Active Users",
        value: activeUsers.toLocaleString(),
        icon: UserCheck,
        tint: "border-emerald-300/20 bg-emerald-500/10 text-emerald-100",
      },
      {
        label: "Blocked Users",
        value: blockedUsers.toLocaleString(),
        icon: UserX,
        tint: "border-rose-300/20 bg-rose-500/10 text-rose-100",
      },
      {
        label: "Total Feedback Submitted",
        value: totalFeedbackSubmitted.toLocaleString(),
        icon: MessageSquare,
        tint: "border-sky-300/20 bg-sky-500/10 text-sky-100",
      },
    ]
  }, [users])

  function toggleStatus(user: ManagedUser) {
    const next: UserStatus = user.status === "Active" ? "Blocked" : "Active"
    updateManagedUserStatus(user.id, next)
    loadUsers()
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-[#f5f7ff] md:text-3xl">
          <Users size={20} className="text-[#c9b8ff]" />
          User Management
        </h1>
        <div className="text-xs font-medium text-[#8f95b7]">{filteredUsers.length} users</div>
      </div>

      <main className="space-y-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {summaryStats.map((stat) => {
            const StatIcon = stat.icon

            return (
              <div
                key={stat.label}
                className="rounded-xl border border-white/10 bg-[#111528]/70 p-4 shadow-[0_10px_30px_rgba(7,10,22,0.45)] backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:border-violet-300/25"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.12em] text-[#9ca3c7]">{stat.label}</p>
                    <p className="mt-2 text-2xl font-semibold text-[#f5f7ff]">{stat.value}</p>
                  </div>
                  <span className={`inline-flex rounded-lg border p-2 ${stat.tint}`}>
                    <StatIcon className="h-4 w-4" />
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        <div className="relative max-w-md">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#7f87ad]" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by user, email, role, or status"
            className="h-10 pl-9 pr-3 bg-[#121526]/80 border-[#313b62] text-[#f5f7ff] placeholder:text-[#8f96ba] transition-all duration-200 focus-visible:border-[#8b5cf6]/70 focus-visible:ring-2 focus-visible:ring-[#8b5cf6]/30 focus-visible:shadow-[0_0_18px_rgba(139,92,246,0.3)]"
          />
        </div>

        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#101426]/68 shadow-[0_18px_40px_rgba(7,10,22,0.52)] backdrop-blur-xl">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-[#14182a]/88 text-[#bcc3e3]">
              <tr>
                <th className="px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-[0.1em]">Name</th>
                <th className="px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-[0.1em]">Email</th>
                <th className="px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-[0.1em]">Role</th>
                <th className="px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-[0.1em]">Status</th>
                <th className="px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-[0.1em]">Feedback Submitted</th>
                <th className="px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-[0.1em]">Last Active</th>
                <th className="px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-[0.1em]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/8">
              {filteredUsers.map((user) => (
                <tr
                  key={user.id}
                  className="group relative transition-all duration-300 hover:bg-[#8b5cf6]/8 hover:shadow-[inset_2px_0_0_rgba(139,92,246,0.7)]"
                >
                  <td className="px-4 py-3.5 text-[#f5f7ff]">
                    <span className="font-medium">{user.name}</span>
                  </td>
                  <td className="px-4 py-3.5 text-[#a9b0cf]">{user.email}</td>
                  <td className="px-4 py-3.5"><RoleBadge role={user.role} /></td>
                  <td className="px-4 py-3.5"><StatusBadge status={user.status} /></td>
                  <td className="px-4 py-3.5 text-[#d7ddf5]">{user.feedbackSubmittedCount.toLocaleString()}</td>
                  <td className="px-4 py-3.5 text-[#9ba4c7]">{new Date(user.lastActiveAt).toLocaleString()}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 rounded-lg border border-violet-300/15 p-0 text-[#b5bddf] transition-all duration-200 hover:scale-105 hover:border-violet-300/35 hover:bg-violet-500/15 hover:text-[#d6c9ff]"
                        onClick={() => {
                          setSelectedUser(user)
                          setActivityOpen(true)
                        }}
                      >
                        <Eye size={14} />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className={`h-8 w-8 rounded-lg border p-0 transition-all duration-200 hover:scale-105 ${
                          user.status === "Active"
                            ? "border-rose-300/25 text-rose-300 hover:border-rose-300/45 hover:bg-rose-500/15"
                            : "border-emerald-300/25 text-emerald-300 hover:border-emerald-300/45 hover:bg-emerald-500/15"
                        }`}
                        onClick={() => toggleStatus(user)}
                      >
                        {user.status === "Active" ? <ShieldX size={14} /> : <ShieldCheck size={14} />}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      <Dialog open={activityOpen} onOpenChange={setActivityOpen}>
        <DialogContent className="bg-[#121526] border-[#2b3150]">
          <DialogHeader>
            <DialogTitle className="text-[#f5f7ff]">User Activity</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <p className="text-[#f5f7ff]"><span className="text-[#a5accb]">Name:</span> {selectedUser?.name}</p>
            <p className="text-[#f5f7ff]"><span className="text-[#a5accb]">Email:</span> {selectedUser?.email}</p>
            <p className="text-[#f5f7ff]"><span className="text-[#a5accb]">Role:</span> {selectedUser?.role}</p>
            <p className="text-[#f5f7ff]"><span className="text-[#a5accb]">Status:</span> {selectedUser?.status}</p>
            <p className="text-[#f5f7ff]"><span className="text-[#a5accb]">Feedback submitted:</span> {selectedUser?.feedbackSubmittedCount}</p>
            <p className="text-[#f5f7ff]"><span className="text-[#a5accb]">Last active:</span> {selectedUser ? new Date(selectedUser.lastActiveAt).toLocaleString() : "-"}</p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setActivityOpen(false)} className="text-[#a5accb]">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

