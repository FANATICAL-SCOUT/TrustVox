"use client"

import { useEffect, useMemo, useState } from "react"
import { Building2, Plus, Search, Eye, Edit3, Power } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  addApprovedCompany,
  getApprovedCompanies,
  subscribeToApprovedCompanies,
  toggleApprovedCompanyStatus,
  updateApprovedCompany,
  type ApprovedCompany,
  type CompanyStatus,
} from "@/lib/approved-company-store"
import { getForms, type FeedbackForm } from "@/lib/feedback-store"

const categories = ["all", "Software", "Service", "Mobile App", "Hardware", "E-Commerce", "Food & Beverage", "Healthcare", "Education", "Finance"]

type CampaignStats = {
  activeCampaigns: number
  totalCampaigns: number
  draft: number
  pending: number
  approved: number
  live: number
  history: FeedbackForm[]
}

function StatusBadge({ status }: { status: CompanyStatus }) {
  const active = status === "active"
  return (
    <Badge variant="outline" className={active ? "border-mint/40 text-mint" : "border-destructive/40 text-destructive"}>
      {active ? "Active" : "Inactive"}
    </Badge>
  )
}

export default function ApprovedCompaniesPage() {
  const [companies, setCompanies] = useState<ApprovedCompany[]>([])
  const [forms, setForms] = useState<FeedbackForm[]>([])
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState("all")
  const [campaignFilter, setCampaignFilter] = useState("all")
  const [sortBy, setSortBy] = useState("name-asc")

  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [deactivateOpen, setDeactivateOpen] = useState(false)

  const [selectedCompany, setSelectedCompany] = useState<ApprovedCompany | null>(null)
  const [newCompanyName, setNewCompanyName] = useState("")
  const [newCompanyCategory, setNewCompanyCategory] = useState("Software")
  const [editCompanyName, setEditCompanyName] = useState("")
  const [editCompanyCategory, setEditCompanyCategory] = useState("Software")

  const loadData = async () => {
    const [allCompanies, allForms] = await Promise.all([getApprovedCompanies(), getForms()])
    setCompanies(allCompanies)
    setForms(allForms)
  }

  useEffect(() => {
    void loadData()
    const unsub = subscribeToApprovedCompanies(() => void loadData())
    return () => unsub()
  }, [])

  const campaignStatsByCompanyId = useMemo(() => {
    const map: Record<string, CampaignStats> = {}
    for (const company of companies) {
      // Match strictly on the real foreign key: the old
      // `clientName === company.name` fallback double-attributed forms whenever
      // two companies shared a display name. Forms now carry a real companyId
      // (forms.company_id → companies.id), so that's the only correct link.
      const related = forms.filter((f) => f.companyId === company.id)
      const draft = related.filter((f) => f.status === "draft").length
      const pending = related.filter((f) => f.status === "pending").length
      const approved = related.filter((f) => f.status === "approved").length
      const live = approved
      map[company.id] = {
        activeCampaigns: live,
        totalCampaigns: related.length,
        draft,
        pending,
        approved,
        live,
        history: related,
      }
    }
    return map
  }, [companies, forms])

  // Honesty guard: a form whose free-text clientName matches
  // a company by name but which has NO companyId would have been *counted* under
  // the old fuzzy match and now silently drops to zero. Rather than let it
  // vanish without a trace, surface how many there are so the state is visible
  // (a real backfill is a data task, not something this admin view should do).
  const unlinkedNamedFormsCount = useMemo(() => {
    const companyNames = new Set(companies.map((c) => c.name.toLowerCase()))
    return forms.filter((f) => !f.companyId && companyNames.has((f.clientName || "").toLowerCase())).length
  }, [companies, forms])

  const filteredCompanies = companies.filter((company) => {
    const stats = campaignStatsByCompanyId[company.id] || { activeCampaigns: 0 }
    const q = query.trim().toLowerCase()
    const matchQuery = !q || company.name.toLowerCase().includes(q) || company.category.toLowerCase().includes(q)
    const matchCategory = category === "all" || company.category === category
    const matchCampaign =
      campaignFilter === "all" ||
      (campaignFilter === "active" && stats.activeCampaigns > 0) ||
      (campaignFilter === "no-active" && stats.activeCampaigns === 0)
    return matchQuery && matchCategory && matchCampaign
  }).sort((a, b) => {
    const statsA = campaignStatsByCompanyId[a.id] || { activeCampaigns: 0, totalCampaigns: 0 }
    const statsB = campaignStatsByCompanyId[b.id] || { activeCampaigns: 0, totalCampaigns: 0 }
    if (sortBy === "name-asc") return a.name.localeCompare(b.name)
    if (sortBy === "name-desc") return b.name.localeCompare(a.name)
    if (sortBy === "active-campaigns") return statsB.activeCampaigns - statsA.activeCampaigns
    if (sortBy === "total-campaigns") return statsB.totalCampaigns - statsA.totalCampaigns
    if (sortBy === "date-new") return new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime()
    return new Date(a.dateAdded).getTime() - new Date(b.dateAdded).getTime()
  })

  const summaryStats = useMemo(() => {
    const active = companies.filter((c) => c.status === "active").length
    const withCampaigns = companies.filter((c) => (campaignStatsByCompanyId[c.id]?.totalCampaigns || 0) > 0).length
    return [
      { label: "Total Companies", value: companies.length },
      { label: "Active", value: active },
      { label: "With Campaign History", value: withCampaigns },
    ]
  }, [companies, campaignStatsByCompanyId])

  // Each write touches the `companies` table, which subscribeToApprovedCompanies
  // (below) already catches and reloads from — so these handlers no longer call
  // loadData() themselves (that would double-fetch every action). Realtime
  // is the single refresh path.
  async function handleAddCompany() {
    if (!newCompanyName.trim()) return
    await addApprovedCompany({ name: newCompanyName.trim(), category: newCompanyCategory, status: "active" })
    setNewCompanyName("")
    setNewCompanyCategory("Software")
    setAddOpen(false)
  }

  function handleEditOpen(company: ApprovedCompany) {
    setSelectedCompany(company)
    setEditCompanyName(company.name)
    setEditCompanyCategory(company.category)
    setEditOpen(true)
  }

  async function handleSaveEdit() {
    if (!selectedCompany || !editCompanyName.trim()) return
    await updateApprovedCompany(selectedCompany.id, {
      name: editCompanyName.trim(),
      category: editCompanyCategory,
    })
    setEditOpen(false)
    setSelectedCompany(null)
  }

  // Reactivating has no downside — do it immediately. Deactivating an active
  // company needs a confirm because it strands its already-live forms:
  // the active-company gate only blocks *new* approvals, so live forms
  // keep collecting responses (and paying TVX) under a company just marked
  // inactive. We warn how many will keep running rather than silently cascade.
  function handleToggle(company: ApprovedCompany) {
    if (company.status === "active") {
      setSelectedCompany(company)
      setDeactivateOpen(true)
      return
    }
    void applyToggle(company)
  }

  async function applyToggle(company: ApprovedCompany) {
    await toggleApprovedCompanyStatus(company.id)
  }

  async function handleConfirmDeactivate() {
    if (!selectedCompany) return
    await applyToggle(selectedCompany)
    setDeactivateOpen(false)
    setSelectedCompany(null)
  }

  function handleHistory(company: ApprovedCompany) {
    setSelectedCompany(company)
    setHistoryOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display flex items-center gap-2 text-2xl font-bold text-ink">
            <Building2 size={20} className="text-gold" /> Approved Companies
          </h1>
          <p className="mt-1 text-sm text-ink-dim">Manage the companies clients can submit feedback campaigns under.</p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="inline-flex items-center justify-center rounded-lg bg-gradient-to-b from-[#f2c877] to-gold-deep px-4 py-2 text-sm font-semibold text-[#241a06] transition hover:brightness-105"
        >
          <Plus size={14} className="mr-1.5" /> Add New Company
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {summaryStats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
            <p className="tvx-num text-2xl font-bold text-ink">{stat.value}</p>
            <p className="text-xs text-ink-muted mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {unlinkedNamedFormsCount > 0 && (
        <div className="rounded-lg border border-gold/30 bg-gold/[0.06] px-4 py-3 text-xs text-ink-dim">
          <span className="text-gold font-semibold">Note:</span>{" "}
          {unlinkedNamedFormsCount} form{unlinkedNamedFormsCount === 1 ? "" : "s"} name{unlinkedNamedFormsCount === 1 ? "s" : ""} a company that exists here but {unlinkedNamedFormsCount === 1 ? "isn't" : "aren't"} linked to it by ID, so {unlinkedNamedFormsCount === 1 ? "it isn't" : "they aren't"} counted in the totals below. Re-linking {unlinkedNamedFormsCount === 1 ? "it" : "them"} to the right company is a data fix, not something to do from this screen.
        </div>
      )}

      <main className="space-y-4">
        <div className="grid md:grid-cols-[1fr_220px_220px_220px] gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search company or category" className="pl-8 bg-white/[0.04] border-white/[0.08] text-ink" />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-ink"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-surface-raised border-white/10">
              {categories.map((c) => (<SelectItem key={c} value={c} className="text-ink-dim">{c === "all" ? "All Categories" : c}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={campaignFilter} onValueChange={setCampaignFilter}>
            <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-ink"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-surface-raised border-white/10">
              <SelectItem value="all" className="text-ink-dim">All Campaigns</SelectItem>
              <SelectItem value="active" className="text-ink-dim">Has Live Campaigns</SelectItem>
              <SelectItem value="no-active" className="text-ink-dim">No Live Campaigns</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-ink"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-surface-raised border-white/10">
              <SelectItem value="name-asc" className="text-ink-dim">Sort: Name A-Z</SelectItem>
              <SelectItem value="name-desc" className="text-ink-dim">Sort: Name Z-A</SelectItem>
              <SelectItem value="active-campaigns" className="text-ink-dim">Sort: Live Campaigns</SelectItem>
              <SelectItem value="total-campaigns" className="text-ink-dim">Sort: Total Campaigns</SelectItem>
              <SelectItem value="date-new" className="text-ink-dim">Sort: Newest Added</SelectItem>
              <SelectItem value="date-old" className="text-ink-dim">Sort: Oldest Added</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-white/[0.03] text-ink-dim">
              <tr>
                <th className="text-left px-4 py-3">Company Name</th>
                <th className="text-left px-4 py-3">Category</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Live Campaigns</th>
                <th className="text-left px-4 py-3">Total Campaigns</th>
                <th className="text-left px-4 py-3">Date Added</th>
                <th className="text-left px-4 py-3">Campaign Status Mix</th>
                <th className="text-left px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCompanies.map((company) => {
                const stats = campaignStatsByCompanyId[company.id] || { activeCampaigns: 0, totalCampaigns: 0, draft: 0, pending: 0, approved: 0, live: 0 }
                return (
                  <tr key={company.id} className="border-t border-white/[0.07]">
                    <td className="px-4 py-3 text-ink">{company.name}</td>
                    <td className="px-4 py-3 text-ink-dim">{company.category}</td>
                    <td className="px-4 py-3"><StatusBadge status={company.status} /></td>
                    <td className="px-4 py-3"><Badge className="bg-gold/15 text-gold border border-gold/30">{stats.activeCampaigns}</Badge></td>
                    <td className="px-4 py-3 text-ink">{stats.totalCampaigns}</td>
                    <td className="px-4 py-3 text-ink-dim">{new Date(company.dateAdded).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-[11px] text-ink-dim">
                      {stats.totalCampaigns === 0
                        ? "No campaigns yet"
                        : `Draft ${stats.draft} · Pending ${stats.pending} · Live ${stats.live}`}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="ghost" className="text-ink-dim hover:text-gold" onClick={() => handleEditOpen(company)}><Edit3 size={14} /></Button>
                        <Button size="sm" variant="ghost" className="text-ink-dim hover:text-gold" onClick={() => handleHistory(company)}><Eye size={14} /></Button>
                        <Button size="sm" variant="ghost" className={company.status === "active" ? "text-destructive hover:text-destructive" : "text-mint hover:text-mint"} onClick={() => handleToggle(company)}><Power size={14} /></Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </main>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="bg-surface-raised border-white/10">
          <DialogHeader><DialogTitle className="text-ink">Add New Company</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-ink-dim text-xs">Company Name</Label>
              <Input value={newCompanyName} onChange={(e) => setNewCompanyName(e.target.value)} className="bg-white/[0.04] border-white/[0.08] text-ink" />
            </div>
            <div>
              <Label className="text-ink-dim text-xs">Category</Label>
              <Select value={newCompanyCategory} onValueChange={setNewCompanyCategory}>
                <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-ink"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-surface-raised border-white/10">
                  {categories.filter((c) => c !== "all").map((c) => <SelectItem key={c} value={c} className="text-ink-dim">{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddOpen(false)} className="text-ink-dim">Cancel</Button>
            <Button onClick={handleAddCompany} className="bg-gradient-to-b from-[#f2c877] to-gold-deep text-[#241a06] font-semibold hover:brightness-105">Add Company</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-surface-raised border-white/10">
          <DialogHeader><DialogTitle className="text-ink">Edit Company Details</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input value={editCompanyName} onChange={(e) => setEditCompanyName(e.target.value)} className="bg-white/[0.04] border-white/[0.08] text-ink" />
            <Select value={editCompanyCategory} onValueChange={setEditCompanyCategory}>
              <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-ink"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-surface-raised border-white/10">
                {categories.filter((c) => c !== "all").map((c) => <SelectItem key={c} value={c} className="text-ink-dim">{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditOpen(false)} className="text-ink-dim">Cancel</Button>
            <Button onClick={handleSaveEdit} className="bg-gradient-to-b from-[#f2c877] to-gold-deep text-[#241a06] font-semibold hover:brightness-105">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="bg-surface-raised border-white/10 max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-ink">Campaign History · {selectedCompany?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[420px] overflow-y-auto">
            {(campaignStatsByCompanyId[selectedCompany?.id ?? ""]?.history || []).length === 0 ? (
              <div className="p-4 rounded border border-white/[0.07] text-ink-dim text-sm">No campaign history for this company yet.</div>
            ) : (
              (campaignStatsByCompanyId[selectedCompany?.id ?? ""]?.history || []).map((form: FeedbackForm) => (
                <div key={form.id} className="p-3 rounded border border-white/[0.07] bg-white/[0.02] flex items-center justify-between">
                  <div>
                    <p className="text-sm text-ink">{form.title}</p>
                    <p className="text-xs text-ink-dim">{form.product} · {form.category}</p>
                  </div>
                  <Badge variant="outline" className="border-white/15 text-ink-dim capitalize">{form.status}</Badge>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setHistoryOpen(false)} className="text-ink-dim">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deactivateOpen} onOpenChange={setDeactivateOpen}>
        <DialogContent className="bg-surface-raised border-white/10">
          <DialogHeader>
            <DialogTitle className="text-ink flex items-center gap-2">
              <Power size={16} className="text-destructive" /> Deactivate {selectedCompany?.name}?
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-ink-dim">
              Clients won&apos;t be able to submit new feedback forms under this company, and pending forms can no longer be approved for it.
            </p>
            {(() => {
              const live = selectedCompany ? campaignStatsByCompanyId[selectedCompany.id]?.live ?? 0 : 0
              return live > 0 ? (
                <div className="rounded-lg border border-gold/30 bg-gold/[0.06] p-3 text-ink-dim">
                  <span className="text-gold font-semibold">Heads up:</span>{" "}
                  {live} live form{live === 1 ? "" : "s"} will keep running — deactivating the company does <span className="text-ink">not</span> close forms that are already published, so {live === 1 ? "it" : "they"} will keep collecting responses and paying TVX. Close {live === 1 ? "it" : "them"} from the client&apos;s forms if you want {live === 1 ? "it" : "them"} stopped.
                </div>
              ) : (
                <p className="text-xs text-ink-muted">This company has no live forms — nothing is left running.</p>
              )
            })()}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeactivateOpen(false)} className="text-ink-dim">Cancel</Button>
            <Button onClick={handleConfirmDeactivate} className="bg-destructive/90 text-white font-semibold hover:bg-destructive">Deactivate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
