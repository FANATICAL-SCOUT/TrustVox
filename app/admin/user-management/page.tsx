"use client"

import { useEffect, useMemo, useState } from "react"
import { Users, Search, ShieldCheck, ShieldX, Eye, UserCheck, UserX, MessageSquare, Star, Coins, Loader2, Activity } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  AdminLockoutError,
  getCurrentUserId,
  getManagedUsers,
  subscribeToManagedUsers,
  updateManagedUserStatus,
  type ManagedUser,
  type UserRole,
  type UserStatus,
} from "@/lib/approved-company-store"
import { getUserActivity, type UserActivityEvent } from "@/lib/feedback-store"

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
  const [activity, setActivity] = useState<UserActivityEvent[]>([])
  const [activityLoading, setActivityLoading] = useState(false)
  // Block/unblock confirmation (bug #8b): blocking signs the user out
  // platform-wide on their next request, so it shouldn't fire on one click.
  const [confirmTarget, setConfirmTarget] = useState<ManagedUser | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  const loadUsers = async () => setUsers(await getManagedUsers())

  useEffect(() => {
    void loadUsers()
    void getCurrentUserId().then(setCurrentUserId)
    const unsub = subscribeToManagedUsers(() => void loadUsers())
    return () => unsub()
  }, [])

  // Load the selected user's real activity when the modal opens (bug #4). Keyed
  // to the user's id so re-opening a different row can't show a stale feed; the
  // read runs under the admin's own RLS (admins may read any user's responses +
  // wallet rows — see getUserActivity).
  useEffect(() => {
    if (!activityOpen || !selectedUser) return
    const userId = selectedUser.id
    let cancelled = false
    setActivity([])
    setActivityLoading(true)
    getUserActivity(userId)
      .then((events) => { if (!cancelled) setActivity(events) })
      .catch(() => { if (!cancelled) setActivity([]) })
      .finally(() => { if (!cancelled) setActivityLoading(false) })
    return () => { cancelled = true }
  }, [activityOpen, selectedUser])

  const showToast = (msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 3000)
  }

  // Self-lockout guard (Phase 13.2, bug #6): the block button is disabled for
  // rows that would strand /admin — the current admin's own row, and the last
  // active admin. `updateManagedUserStatus` re-checks this server-side too.
  const activeAdminCount = useMemo(
    () => users.filter((u) => u.role === "Admin" && u.status === "Active").length,
    [users],
  )

  const blockDisabledReason = (user: ManagedUser): string | null => {
    // Only blocking an active account can lock anyone out; unblocking is safe.
    if (user.status !== "Active") return null
    if (currentUserId && user.id === currentUserId) return "You can't block your own admin account."
    if (user.role === "Admin" && activeAdminCount <= 1) return "You can't block the last active admin."
    return null
  }

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

  // Clicking block/unblock now opens a confirm (bug #8b) rather than writing
  // immediately. The self/last-admin guard is re-checked here so a stale render
  // can't even open the dialog for a blocked action.
  function requestToggle(user: ManagedUser) {
    if (user.status === "Active") {
      const reason = blockDisabledReason(user)
      if (reason) {
        showToast(reason)
        return
      }
    }
    setConfirmTarget(user)
  }

  async function confirmToggle() {
    const user = confirmTarget
    if (!user) return
    setConfirmTarget(null)
    const next: UserStatus = user.status === "Active" ? "Blocked" : "Active"
    // UI already disables these, but re-check so a stale render can't slip past.
    if (next === "Blocked") {
      const reason = blockDisabledReason(user)
      if (reason) {
        showToast(reason)
        return
      }
    }
    try {
      await updateManagedUserStatus(user.id, next)
    } catch (err) {
      // The store's trusted backstop refused it (self / last-admin block).
      showToast(err instanceof AdminLockoutError ? err.message : "Couldn't update user status.")
      return
    }
    // The status write updates `profiles`, which subscribeToManagedUsers (mount
    // effect) already catches and reloads from — no manual loadUsers() here
    // (bug #9: that double-fetched every block/unblock). Realtime is the single
    // refresh path.
  }

  return (
    <div className="space-y-6">
      {/* Toast — surfaces a blocked action (self / last-admin guard, #6) */}
      {toastMsg && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-xl border border-gold/40 bg-surface-raised px-4 py-3 text-sm font-medium text-gold shadow-2xl">
          <ShieldX size={15} />
          {toastMsg}
        </div>
      )}

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
                <th className="px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-[0.1em]">Joined</th>
                <th className="px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-[0.1em]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {filteredUsers.map((user) => {
                const blockReason = blockDisabledReason(user)
                return (
                <tr key={user.id} className="transition-colors hover:bg-gold/[0.04]">
                  <td className="px-4 py-3.5 text-ink">
                    <span className="font-medium">{user.name}</span>
                  </td>
                  <td className="px-4 py-3.5 text-ink-dim">{user.email}</td>
                  <td className="px-4 py-3.5"><RoleBadge role={user.role} /></td>
                  <td className="px-4 py-3.5"><StatusBadge status={user.status} /></td>
                  <td className="px-4 py-3.5 text-ink">{user.feedbackSubmittedCount.toLocaleString()}</td>
                  <td className="px-4 py-3.5 text-ink-muted">{new Date(user.joinedAt).toLocaleDateString()}</td>
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
                        disabled={!!blockReason}
                        title={blockReason ?? (user.status === "Active" ? "Block user" : "Unblock user")}
                        aria-label={blockReason ?? (user.status === "Active" ? "Block user" : "Unblock user")}
                        className={`h-8 w-8 rounded-lg border p-0 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent ${
                          user.status === "Active"
                            ? "border-destructive/25 text-destructive hover:border-destructive/45 hover:bg-destructive/15"
                            : "border-mint/25 text-mint hover:border-mint/45 hover:bg-mint/15"
                        }`}
                        onClick={() => requestToggle(user)}
                      >
                        {user.status === "Active" ? <ShieldX size={14} /> : <ShieldCheck size={14} />}
                      </Button>
                    </div>
                  </td>
                </tr>
                )
              })}
            </tbody>
          </table>

          {filteredUsers.length === 0 && (
            <div className="px-4 py-10 text-center text-sm text-ink-muted">
              {query.trim() ? <>No users match &quot;{query}&quot;.</> : "No users yet."}
            </div>
          )}
        </div>
      </main>

      {/* User Activity (bug #4) — real recent activity for the selected user,
          read live from the DB (see getUserActivity), not a re-dump of the row. */}
      <Dialog open={activityOpen} onOpenChange={setActivityOpen}>
        <DialogContent className="bg-surface-raised border-white/10 max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-ink flex items-center gap-2">
              <Activity size={18} className="text-gold" />
              User Activity
            </DialogTitle>
          </DialogHeader>

          {/* Identity header */}
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink truncate">{selectedUser?.name}</p>
                <p className="text-xs text-ink-dim truncate">{selectedUser?.email}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {selectedUser && <RoleBadge role={selectedUser.role} />}
                {selectedUser && <StatusBadge status={selectedUser.status} />}
              </div>
            </div>
            <p className="mt-3 text-xs text-ink-muted">
              Joined {selectedUser ? new Date(selectedUser.joinedAt).toLocaleDateString() : "-"}
              {" · "}
              {selectedUser?.feedbackSubmittedCount ?? 0} feedback submitted
            </p>
          </div>

          {/* Activity feed */}
          <div className="mt-1">
            <p className="text-[11px] uppercase tracking-[0.12em] text-ink-muted mb-2">Recent activity</p>
            {activityLoading ? (
              <div className="flex items-center gap-2 py-8 text-sm text-ink-muted">
                <Loader2 size={15} className="animate-spin" />
                Loading activity…
              </div>
            ) : activity.length === 0 ? (
              <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-8 text-center text-sm text-ink-muted">
                No activity yet — this user hasn&apos;t submitted feedback or earned TVX.
              </div>
            ) : (
              <div className="space-y-2">
                {activity.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3"
                  >
                    <span
                      className={`inline-flex shrink-0 rounded-lg border p-2 ${
                        event.kind === "earn"
                          ? "border-gold/25 bg-gold/10 text-gold"
                          : "border-white/15 bg-white/[0.04] text-ink-dim"
                      }`}
                    >
                      {event.kind === "earn" ? <Coins className="h-3.5 w-3.5" /> : <MessageSquare className="h-3.5 w-3.5" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-ink">
                        {event.kind === "earn" ? (
                          <>Earned <span className="tvx-num font-semibold text-gold">+{event.amount} TVX</span></>
                        ) : (
                          <>Submitted feedback for <span className="text-ink-dim">{event.title}</span></>
                        )}
                      </p>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-ink-muted">
                        <span>{new Date(event.at).toLocaleString()}</span>
                        {event.kind === "feedback" && typeof event.rating === "number" && (
                          <span className="flex items-center gap-0.5 text-gold">
                            <Star size={11} className="fill-gold" />
                            {event.rating}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setActivityOpen(false)} className="text-ink-dim">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Block / unblock confirmation (bug #8b) */}
      <Dialog open={!!confirmTarget} onOpenChange={(o) => { if (!o) setConfirmTarget(null) }}>
        <DialogContent className="bg-surface-raised border-white/10 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-ink flex items-center gap-2">
              {confirmTarget?.status === "Active" ? (
                <ShieldX size={18} className="text-destructive" />
              ) : (
                <ShieldCheck size={18} className="text-mint" />
              )}
              {confirmTarget?.status === "Active" ? "Block user" : "Unblock user"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-ink-dim">
            {confirmTarget?.status === "Active" ? (
              <>
                Block <span className="text-ink font-medium">{confirmTarget?.name}</span>? They&apos;ll be signed
                out platform-wide on their next request and can&apos;t sign back in until unblocked.
              </>
            ) : (
              <>
                Unblock <span className="text-ink font-medium">{confirmTarget?.name}</span>? They&apos;ll be able
                to sign in again immediately.
              </>
            )}
          </p>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setConfirmTarget(null)} className="text-ink-dim">
              Cancel
            </Button>
            <Button
              onClick={confirmToggle}
              className={
                confirmTarget?.status === "Active"
                  ? "bg-destructive/20 hover:bg-destructive/30 text-destructive border border-destructive/30"
                  : "bg-mint/20 hover:bg-mint/30 text-mint border border-mint/30"
              }
            >
              {confirmTarget?.status === "Active" ? (
                <><ShieldX size={14} className="mr-1.5" />Block user</>
              ) : (
                <><ShieldCheck size={14} className="mr-1.5" />Unblock user</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
