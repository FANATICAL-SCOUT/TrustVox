"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Coins,
  MessageSquare,
  ShieldAlert,
  Star,
  Users,
  XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  getForms,
  getResponsesByFormId,
  subscribeToFormsUpdates,
  type FeedbackForm,
  type FormResponse,
} from "@/lib/feedback-store"
import {
  getApprovedCompanies,
  getManagedUsers,
  subscribeToApprovedCompanies,
  subscribeToManagedUsers,
  type ApprovedCompany,
  type ManagedUser,
} from "@/lib/approved-company-store"

type ActivityItem = {
  id: string
  label: string
  detail: string
  time: number
  tone: "pending" | "approved" | "response"
}

function timeAgo(iso: string) {
  const then = Date.parse(iso)
  if (Number.isNaN(then)) return ""
  const diffMs = Date.now() - then
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

const ACTIVITY_STYLE: Record<ActivityItem["tone"], { icon: typeof CheckCircle2; className: string }> = {
  pending: { icon: Clock3, className: "border-gold/30 bg-gold/10 text-gold" },
  approved: { icon: CheckCircle2, className: "border-mint/30 bg-mint/10 text-mint" },
  response: { icon: MessageSquare, className: "border-white/15 bg-white/[0.04] text-ink-dim" },
}

export default function AdminCommandCenter() {
  const router = useRouter()
  const [forms, setForms] = useState<FeedbackForm[]>([])
  const [companies, setCompanies] = useState<ApprovedCompany[]>([])
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const loadForms = () => void getForms().then(setForms)
    const loadCompanies = () => setCompanies(getApprovedCompanies())
    const loadUsers = () => setUsers(getManagedUsers())

    loadForms()
    loadCompanies()
    loadUsers()
    setMounted(true)

    const unsubForms = subscribeToFormsUpdates(loadForms)
    const unsubCompanies = subscribeToApprovedCompanies(loadCompanies)
    const unsubUsers = subscribeToManagedUsers(loadUsers)
    return () => {
      unsubForms()
      unsubCompanies()
      unsubUsers()
    }
  }, [])

  const [responsesByForm, setResponsesByForm] = useState<Map<string, FormResponse[]>>(new Map())

  useEffect(() => {
    let active = true
    void (async () => {
      const entries = await Promise.all(
        forms.map(async (form) => [form.id, await getResponsesByFormId(form.id)] as const),
      )
      if (active) setResponsesByForm(new Map(entries))
    })()
    return () => {
      active = false
    }
  }, [forms])

  const allResponses = useMemo(() => Array.from(responsesByForm.values()).flat(), [responsesByForm])

  const averageRating = useMemo(() => {
    const ratings: number[] = []
    for (const form of forms) {
      const ratingQuestionIds = form.questions.filter((q) => q.type === "star-rating").map((q) => q.id)
      if (ratingQuestionIds.length === 0) continue
      for (const response of responsesByForm.get(form.id) || []) {
        for (const qid of ratingQuestionIds) {
          const value = Number(response.answers?.[qid])
          if (Number.isFinite(value) && value > 0) ratings.push(value)
        }
      }
    }
    if (ratings.length === 0) return null
    return ratings.reduce((sum, value) => sum + value, 0) / ratings.length
  }, [forms, responsesByForm])

  const tvxRewarded = useMemo(
    () => allResponses.reduce((sum, response) => sum + (response.rewardTokens || 0), 0),
    [allResponses],
  )

  const pendingForms = forms.filter((f) => f.status === "pending")
  const approvedForms = forms.filter((f) => f.status === "approved")
  const rejectedForms = forms.filter((f) => f.status === "rejected")
  const activeCompanies = companies.filter((c) => c.status === "active")
  const blockedUsers = users.filter((u) => u.status === "Blocked")

  const stats = [
    {
      label: "Total Responses",
      value: allResponses.length.toLocaleString(),
      icon: MessageSquare,
      subtext: "across all live forms",
    },
    {
      label: "Average Rating",
      value: averageRating !== null ? averageRating.toFixed(1) : "—",
      icon: Star,
      subtext: averageRating !== null ? "from real star ratings" : "no ratings yet",
    },
    {
      label: "Approved Companies",
      value: activeCompanies.length.toLocaleString(),
      icon: Building2,
      subtext: `${companies.length.toLocaleString()} total on file`,
    },
    {
      label: "TVX Rewarded",
      value: tvxRewarded.toLocaleString(),
      icon: Coins,
      subtext: "paid out to real responses",
    },
  ]

  const adminControls = [
    {
      title: "Pending Approvals",
      count: pendingForms.length,
      description: "Feedback forms waiting for review before they go live.",
      href: "/admin/approvals",
      icon: ClipboardCheck,
      tone: "text-gold border-gold/30 bg-gold/10",
    },
    {
      title: "Blocked Users",
      count: blockedUsers.length,
      description: "Accounts currently blocked from the platform.",
      href: "/admin/user-management",
      icon: ShieldAlert,
      tone: "text-destructive border-destructive/30 bg-destructive/10",
    },
  ]

  const activity: ActivityItem[] = useMemo(() => {
    const items: ActivityItem[] = []

    for (const form of pendingForms) {
      if (!form.submittedAt) continue
      items.push({
        id: `submit-${form.id}`,
        label: `Submitted for review`,
        detail: `${form.title} · ${form.clientName}`,
        time: Date.parse(form.submittedAt) || 0,
        tone: "pending",
      })
    }

    for (const form of approvedForms) {
      if (!form.approvedAt) continue
      items.push({
        id: `approve-${form.id}`,
        label: "Approved & published",
        detail: `${form.title} · ${form.clientName}`,
        time: Date.parse(form.approvedAt) || 0,
        tone: "approved",
      })
    }

    for (const response of allResponses) {
      const form = forms.find((f) => f.id === response.formId)
      items.push({
        id: `response-${response.id}`,
        label: "New response received",
        detail: `${form?.title || "Feedback form"} · +${response.rewardTokens || 0} TVX paid`,
        time: Date.parse(response.submittedAt) || 0,
        tone: "response",
      })
    }

    return items.sort((a, b) => b.time - a.time).slice(0, 8)
  }, [pendingForms, approvedForms, allResponses, forms])

  if (!mounted) return <div className="min-h-[60vh]" />

  return (
    <div className="space-y-8">
      <section className="tvx-card-gold relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-surface to-[#0e1017] p-5 md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-ink md:text-3xl">Admin Command Center</h1>
            <p className="mt-1 text-sm text-ink-dim">Unified view of approvals, companies, and users across the platform.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <button
              onClick={() => router.push("/admin/approvals")}
              className="inline-flex items-center justify-center rounded-lg bg-gradient-to-b from-[#f2c877] to-gold-deep px-4 py-2 text-sm font-semibold text-[#241a06] transition hover:brightness-105"
            >
              Review Approvals
            </button>
            <Button
              variant="outline"
              className="border-white/15 bg-white/[0.03] text-ink-dim hover:border-gold/30 hover:text-gold"
              onClick={() => router.push("/admin/approved-companies")}
            >
              Manage Companies
            </Button>
            <Button
              variant="outline"
              className="border-white/15 bg-white/[0.03] text-ink-dim hover:border-gold/30 hover:text-gold"
              onClick={() => router.push("/admin/user-management")}
            >
              Manage Users
            </Button>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-lg font-semibold text-ink">Platform Overview</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-ink-muted">{stat.label}</p>
                  <p className="tvx-num mt-1 text-2xl font-semibold text-ink">{stat.value}</p>
                  <p className="mt-1 text-[11px] text-ink-muted">{stat.subtext}</p>
                </div>
                <stat.icon className="h-5 w-5 text-gold" />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">Needs Attention</h2>
          <span className="text-xs uppercase tracking-[0.15em] text-ink-muted">Action required</span>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {adminControls.map((control) => (
            <div key={control.title} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-ink">{control.title}</h3>
                  <p className="mt-1 text-xs text-ink-dim">{control.description}</p>
                </div>
                <span className={`rounded-md border p-2 ${control.tone}`}>
                  <control.icon className="h-4 w-4" />
                </span>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <p className="tvx-num text-2xl font-semibold text-ink">{control.count}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/15 bg-white/[0.03] text-ink-dim hover:border-gold/30 hover:text-gold"
                  onClick={() => router.push(control.href)}
                >
                  Review Now
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">Recent Activity</h2>
          {rejectedForms.length > 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs text-destructive">
              <XCircle className="h-3.5 w-3.5" />
              {rejectedForms.length} rejected form{rejectedForms.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.02]">
          {activity.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="mb-3 h-8 w-8 text-ink-muted" />
              <p className="text-sm text-ink-dim">No activity recorded yet.</p>
            </div>
          ) : (
            <ul className="divide-y divide-white/[0.06]">
              {activity.map((item) => {
                const style = ACTIVITY_STYLE[item.tone]
                const Icon = style.icon
                return (
                  <li key={item.id} className="flex items-center gap-3 px-5 py-3.5">
                    <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${style.className}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-ink">{item.label}</p>
                      <p className="truncate text-xs text-ink-muted">{item.detail}</p>
                    </div>
                    <span className="shrink-0 text-xs text-ink-muted">{timeAgo(new Date(item.time).toISOString())}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  )
}
