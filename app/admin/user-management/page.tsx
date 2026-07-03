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
    Admin: "border-gold/35 bg-gold/15 text-gold",
    Client: "border-white/25 bg-white/[0.08] text-ink",
    User: "border-white/20 bg-white/[0.06] text-ink-dim",
  }
  return <Badge variant="outline" className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${map[role] || "border-white/15 text-ink-dim"}`}>{role}</Badge>
}

function StatusBadge({ status }: { status: UserStatus }) {
  const className =
    status === "Active"
      ? "border-mint/35 bg-mint/15 text-mint"
      : "border-destructive/35 bg-destructive/15 text-destructive"

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
        tint: "border-gold/20 bg-gold/10 text-gold",
      },
      {
        label: "Active Users",
        value: activeUsers.toLocaleString(),
        icon: UserCheck,
        tint: "border-mint/20 bg-mint/10 text-mint",
      },
      {
        label: "Blocked Users",
        value: blockedUsers.toLocaleString(),
        icon: UserX,
        tint: "border-destructive/20 bg-destructive/10 text-destructive",
      },
      {
        label: "Total Feedback Submitted",
        value: totalFeedbackSubmitted.toLocaleString(),
        icon: MessageSquare,
        tint: "border-white/15 bg-white/[0.04] text-ink-dim",
      },
    ]
  }, [users])

  function toggleStatus(user: ManagedUser) {
    const next: UserStatus = user.status === "Active" ? "Blocked" : "Active"
    updateManagedUserStatus(user.id, next)
    loadUsers()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display flex items-center gap-2 text-2xl font-bold text-ink md:text-3xl">
            <Users size={20} className="text-gold" />
            User Management
          </h1>
          <p className="mt-1 text-sm text-ink-dim">Review accounts and manage access across users, clients, and admins.</p>
        </div>
        <div className="text-xs font-medium text-ink-muted">{filteredUsers.length} users</div>
      </div>

      <main className="space-y-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {summaryStats.map((stat) => {
            const StatIcon = stat.icon

            return (
              <div key={stat.label} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.12em] text-ink-muted">{stat.label}</p>
                    <p className="tvx-num mt-2 text-2xl font-semibold text-ink">{stat.value}</p>
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
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by user, email, role, or status"
            className="h-10 pl-9 pr-3 bg-white/[0.04] border-white/[0.08] text-ink placeholder:text-ink-muted focus-visible:border-gold/40 focus-visible:ring-2 focus-visible:ring-gold/20"
          />
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/[0.07] bg-white/[0.02]">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-white/[0.03] text-ink-dim">
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
            <tbody className="divide-y divide-white/[0.06]">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="transition-colors hover:bg-gold/[0.04]">
                  <td className="px-4 py-3.5 text-ink">
                    <span className="font-medium">{user.name}</span>
                  </td>
                  <td className="px-4 py-3.5 text-ink-dim">{user.email}</td>
                  <td className="px-4 py-3.5"><RoleBadge role={user.role} /></td>
                  <td className="px-4 py-3.5"><StatusBadge status={user.status} /></td>
                  <td className="px-4 py-3.5 text-ink">{user.feedbackSubmittedCount.toLocaleString()}</td>
                  <td className="px-4 py-3.5 text-ink-muted">{new Date(user.lastActiveAt).toLocaleString()}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 rounded-lg border border-white/[0.08] p-0 text-ink-dim hover:border-gold/35 hover:bg-gold/10 hover:text-gold"
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
                        className={`h-8 w-8 rounded-lg border p-0 ${
                          user.status === "Active"
                            ? "border-destructive/25 text-destructive hover:border-destructive/45 hover:bg-destructive/15"
                            : "border-mint/25 text-mint hover:border-mint/45 hover:bg-mint/15"
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

          {filteredUsers.length === 0 && (
            <div className="px-4 py-10 text-center text-sm text-ink-muted">
              {query.trim() ? <>No users match &quot;{query}&quot;.</> : "No users yet."}
            </div>
          )}
        </div>
      </main>

      <Dialog open={activityOpen} onOpenChange={setActivityOpen}>
        <DialogContent className="bg-surface-raised border-white/10">
          <DialogHeader>
            <DialogTitle className="text-ink">User Activity</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <p className="text-ink"><span className="text-ink-dim">Name:</span> {selectedUser?.name}</p>
            <p className="text-ink"><span className="text-ink-dim">Email:</span> {selectedUser?.email}</p>
            <p className="text-ink"><span className="text-ink-dim">Role:</span> {selectedUser?.role}</p>
            <p className="text-ink"><span className="text-ink-dim">Status:</span> {selectedUser?.status}</p>
            <p className="text-ink"><span className="text-ink-dim">Feedback submitted:</span> {selectedUser?.feedbackSubmittedCount}</p>
            <p className="text-ink"><span className="text-ink-dim">Last active:</span> {selectedUser ? new Date(selectedUser.lastActiveAt).toLocaleString() : "-"}</p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setActivityOpen(false)} className="text-ink-dim">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
