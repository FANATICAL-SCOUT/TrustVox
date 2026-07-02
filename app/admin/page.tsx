"use client"

import { useMemo, useState } from "react"
import {
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Coins,
  MessageSquare,
  Star,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const dashboardStats = [
  {
    label: "Total Feedbacks",
    value: "13,400",
    context: "Active this week",
    trend: "+12% from last week",
    direction: "up",
    icon: MessageSquare,
  },
  {
    label: "Average Rating",
    value: "4.5",
    context: "Quality baseline",
    trend: "+3% improvement",
    direction: "up",
    icon: Star,
  },
  {
    label: "Active Users",
    value: "8,920",
    context: "Weekly participants",
    trend: "+8% engagement",
    direction: "up",
    icon: Users,
  },
  {
    label: "Total Companies",
    value: "250",
    context: "Verified organizations",
    trend: "+4 net additions",
    direction: "up",
    icon: Building2,
  },
  {
    label: "Tokens Distributed",
    value: "2,500,000",
    context: "Reward economy",
    trend: "-3% payout variance",
    direction: "down",
    icon: Coins,
  },
]

const adminControls = [
  {
    title: "Pending Approvals",
    count: 14,
    description: "Campaigns waiting for admin review",
    href: "/admin/approvals",
    icon: CheckCircle2,
  },
  {
    title: "New Campaign Submissions",
    count: 11,
    description: "Recently submitted campaigns",
    href: "/admin/approvals",
    icon: Clock3,
  },
]

const campaignOptions = ["All Campaigns", "TrustVox Pro", "Voice Insights", "Enterprise Sentiment"]
const rangeOptions = ["Last 7 days", "Last 30 days"]

const feedbackTrendsByRange = {
  "Last 7 days": [420, 480, 530, 610, 700, 640, 760],
  "Last 30 days": [2780, 3120, 3490, 4010],
}

const campaignMultipliers = {
  "All Campaigns": 1,
  "TrustVox Pro": 0.84,
  "Voice Insights": 0.66,
  "Enterprise Sentiment": 0.92,
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const [timeRange, setTimeRange] = useState("Last 7 days")
  const [campaign, setCampaign] = useState("All Campaigns")

  const totalFeedback = useMemo(() => {
    const base = feedbackTrendsByRange[timeRange] || feedbackTrendsByRange["Last 7 days"]
    const multiplier = campaignMultipliers[campaign] ?? 1
    return Math.round(base.reduce((acc, cur) => acc + cur, 0) * multiplier)
  }, [campaign, timeRange])

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#f5f3ff] md:text-3xl">Admin Command Center</h1>
            <p className="mt-1 text-sm text-[#b6b0d1]">Unified dashboard for approvals and operations.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <Button className="bg-violet-600 text-white hover:bg-violet-500" onClick={() => router.push("/admin/approvals")}>
              Approve Campaigns
            </Button>
            <Button variant="outline" className="border-violet-300/30 bg-violet-500/10 text-violet-100 hover:bg-violet-500/20" onClick={() => router.push("/admin/users")}>
              Manage Users
            </Button>
            <Button variant="outline" className="border-emerald-400/30 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20" onClick={() => router.push("/admin/companies")}>
              View Companies
            </Button>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight text-[#f5f3ff]">Stats Overview</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {dashboardStats.map((card) => {
            const TrendIcon = card.direction === "up" ? TrendingUp : TrendingDown
            return (
              <Card
                key={card.label}
                className="group border-violet-300/15 bg-white/[0.03] backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:border-violet-300/30 hover:shadow-[0_0_24px_rgba(124,58,237,0.35)]"
              >
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.14em] text-[#a29ac2]">{card.label}</p>
                      <p className="mt-2 text-2xl font-semibold text-[#f6f2ff]">{card.value}</p>
                    </div>
                    <div className="rounded-lg border border-violet-300/20 bg-violet-500/15 p-2 text-violet-100">
                      <card.icon className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#b7b0d4]">{card.context}</span>
                    <span className={`inline-flex items-center gap-1 ${card.direction === "up" ? "text-emerald-300" : "text-rose-300"}`}>
                      <TrendIcon className="h-3.5 w-3.5" />
                      {card.trend}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight text-[#f5f3ff]">Admin Controls</h2>
          <span className="text-xs uppercase tracking-[0.15em] text-[#9f97be]">Action Required</span>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {adminControls.map((control) => {
            const ControlIcon = control.icon
            return (
              <Card key={control.title} className="border-violet-300/15 bg-white/[0.03] backdrop-blur-md">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base text-[#f5f3ff]">{control.title}</CardTitle>
                      <CardDescription className="mt-1 text-xs text-[#a9a2c8]">{control.description}</CardDescription>
                    </div>
                    <span className="rounded-md border border-violet-300/30 bg-violet-500/10 px-2 py-1 text-xs text-violet-100">
                      <ControlIcon className="inline h-3.5 w-3.5" />
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="flex items-center justify-between pt-1">
                  <p className="text-2xl font-semibold text-[#faf7ff]">{control.count}</p>
                  <Button
                    variant="outline"
                    className="border-violet-300/25 bg-violet-500/10 text-violet-100 hover:bg-violet-500/20"
                    onClick={() => router.push(control.href)}
                  >
                    Review Now
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 className="text-xl font-semibold tracking-tight text-[#f5f3ff]">Live Snapshot</h2>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[170px] border-violet-300/25 bg-[#0f1224] text-violet-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-violet-300/20 bg-[#0e1020] text-violet-100">
                {rangeOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={campaign} onValueChange={setCampaign}>
              <SelectTrigger className="w-[190px] border-violet-300/25 bg-[#0f1224] text-violet-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-violet-300/20 bg-[#0e1020] text-violet-100">
                {campaignOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card className="border-violet-300/15 bg-white/[0.03] backdrop-blur-md">
          <CardContent className="p-6">
            <p className="text-sm text-[#b6b0d1]">Estimated feedback volume for the selected filters</p>
            <p className="mt-2 text-4xl font-semibold text-[#f5f3ff]">{totalFeedback.toLocaleString()}</p>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
