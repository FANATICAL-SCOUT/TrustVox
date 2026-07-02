"use client"

import { useEffect, useMemo, useState } from "react"
import { Building2, Plus, Search, Eye, Edit3, Power } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import {
  addApprovedCompany,
  getApprovedCompanies,
  subscribeToApprovedCompanies,
  toggleApprovedCompanyStatus,
  updateApprovedCompany,
} from "@/lib/approved-company-store"
import { getForms } from "@/lib/feedback-store"

const categories = ["all", "Software", "Service", "Mobile App", "Hardware", "E-Commerce", "Food & Beverage", "Healthcare", "Education", "Finance"]

function StatusBadge({ status }) {
  const active = status === "active"
  return (
    <Badge variant="outline" className={active ? "border-[#a78bfa]/40 text-[#a78bfa]" : "border-[#F87171]/40 text-[#F87171]"}>
      {active ? "Active" : "Inactive"}
    </Badge>
  )
}

export default function ApprovedCompaniesPage() {
  const [companies, setCompanies] = useState([])
  const [forms, setForms] = useState([])
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState("all")
  const [campaignFilter, setCampaignFilter] = useState("all")
  const [sortBy, setSortBy] = useState("name-asc")

  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)

  const [selectedCompany, setSelectedCompany] = useState(null)
  const [newCompanyName, setNewCompanyName] = useState("")
  const [newCompanyCategory, setNewCompanyCategory] = useState("Software")
  const [editCompanyName, setEditCompanyName] = useState("")
  const [editCompanyCategory, setEditCompanyCategory] = useState("Software")

  const loadData = () => {
    const allCompanies = getApprovedCompanies()
    const allForms = getForms()
    setCompanies(allCompanies)
    setForms(allForms)
  }

  useEffect(() => {
    loadData()
    const unsub = subscribeToApprovedCompanies(loadData)
    return () => unsub()
  }, [])

  const campaignStatsByCompanyId = useMemo(() => {
    const map = {}
    for (const company of companies) {
      const related = forms.filter((f) => f.companyId === company.id || (f.clientName || "").toLowerCase() === company.name.toLowerCase())
      const draft = related.filter((f) => f.status === "draft").length
      const pending = related.filter((f) => f.status === "pending").length
      const approved = related.filter((f) => f.status === "approved").length
      const live = approved
      map[company.id] = {
        activeCampaigns: company.baselineActiveCampaigns + live,
        totalCampaigns: company.baselineTotalCampaigns + related.length,
        draft,
        pending,
        approved,
        live,
        history: related,
      }
    }
    return map
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

  function handleAddCompany() {
    if (!newCompanyName.trim()) return
    addApprovedCompany({ name: newCompanyName.trim(), category: newCompanyCategory, status: "active" })
    setNewCompanyName("")
    setNewCompanyCategory("Software")
    setAddOpen(false)
    loadData()
  }

  function handleEditOpen(company) {
    setSelectedCompany(company)
    setEditCompanyName(company.name)
    setEditCompanyCategory(company.category)
    setEditOpen(true)
  }

  function handleSaveEdit() {
    if (!selectedCompany || !editCompanyName.trim()) return
    updateApprovedCompany(selectedCompany.id, {
      name: editCompanyName.trim(),
      category: editCompanyCategory,
    })
    setEditOpen(false)
    setSelectedCompany(null)
    loadData()
  }

  function handleToggle(company) {
    toggleApprovedCompanyStatus(company.id)
    loadData()
  }

  function handleHistory(company) {
    setSelectedCompany(company)
    setHistoryOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[#f5f7ff] font-semibold">
          <Building2 size={16} /> Approved Companies
        </div>
        <Button size="sm" className="bg-[#8b5cf6] hover:bg-[#7c3aed] text-[#090b14]" onClick={() => setAddOpen(true)}>
          <Plus size={14} className="mr-1" /> Add New Company
        </Button>
      </div>

      <main className="space-y-4">
        <div className="grid md:grid-cols-[1fr_220px_220px_220px] gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6c7396]" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search company or category" className="pl-8 bg-[#121526] border-[#2b3150] text-[#f5f7ff]" />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="bg-[#121526] border-[#2b3150] text-[#f5f7ff]"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-[#14182a] border-[#2b3150]">
              {categories.map((c) => (<SelectItem key={c} value={c} className="text-[#d7ddf5]">{c === "all" ? "All Categories" : c}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={campaignFilter} onValueChange={setCampaignFilter}>
            <SelectTrigger className="bg-[#121526] border-[#2b3150] text-[#f5f7ff]"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-[#14182a] border-[#2b3150]">
              <SelectItem value="all" className="text-[#d7ddf5]">All Campaigns</SelectItem>
              <SelectItem value="active" className="text-[#d7ddf5]">Has Active Campaigns</SelectItem>
              <SelectItem value="no-active" className="text-[#d7ddf5]">No Active Campaigns</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="bg-[#121526] border-[#2b3150] text-[#f5f7ff]"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-[#14182a] border-[#2b3150]">
              <SelectItem value="name-asc" className="text-[#d7ddf5]">Sort: Name A-Z</SelectItem>
              <SelectItem value="name-desc" className="text-[#d7ddf5]">Sort: Name Z-A</SelectItem>
              <SelectItem value="active-campaigns" className="text-[#d7ddf5]">Sort: Active Campaigns</SelectItem>
              <SelectItem value="total-campaigns" className="text-[#d7ddf5]">Sort: Total Campaigns</SelectItem>
              <SelectItem value="date-new" className="text-[#d7ddf5]">Sort: Newest Added</SelectItem>
              <SelectItem value="date-old" className="text-[#d7ddf5]">Sort: Oldest Added</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-xl border border-[#2b3150] bg-[#121526] overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-[#14182a] text-[#a5accb]">
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
                  <tr key={company.id} className="border-t border-[#2b3150]">
                    <td className="px-4 py-3 text-[#f5f7ff]">{company.name}</td>
                    <td className="px-4 py-3 text-[#a5accb]">{company.category}</td>
                    <td className="px-4 py-3"><StatusBadge status={company.status} /></td>
                    <td className="px-4 py-3"><Badge className="bg-[#a78bfa]/15 text-[#a78bfa] border border-[#a78bfa]/30">{stats.activeCampaigns}</Badge></td>
                    <td className="px-4 py-3 text-[#d7ddf5]">{stats.totalCampaigns}</td>
                    <td className="px-4 py-3 text-[#a5accb]">{new Date(company.dateAdded).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-[11px] text-[#a5accb]">
                      Draft {stats.draft} · Pending {stats.pending} · Approved {stats.approved} · Live {stats.live}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="ghost" className="text-[#a5accb] hover:text-[#8b5cf6]" onClick={() => handleEditOpen(company)}><Edit3 size={14} /></Button>
                        <Button size="sm" variant="ghost" className="text-[#a5accb] hover:text-[#A78BFA]" onClick={() => handleHistory(company)}><Eye size={14} /></Button>
                        <Button size="sm" variant="ghost" className={company.status === "active" ? "text-[#F87171] hover:text-[#F87171]" : "text-[#a78bfa] hover:text-[#a78bfa]"} onClick={() => handleToggle(company)}><Power size={14} /></Button>
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
        <DialogContent className="bg-[#121526] border-[#2b3150]">
          <DialogHeader><DialogTitle className="text-[#f5f7ff]">Add New Company</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-[#a5accb] text-xs">Company Name</Label>
              <Input value={newCompanyName} onChange={(e) => setNewCompanyName(e.target.value)} className="bg-[#1a1f33] border-[#2b3150] text-[#f5f7ff]" />
            </div>
            <div>
              <Label className="text-[#a5accb] text-xs">Category</Label>
              <Select value={newCompanyCategory} onValueChange={setNewCompanyCategory}>
                <SelectTrigger className="bg-[#1a1f33] border-[#2b3150] text-[#f5f7ff]"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#14182a] border-[#2b3150]">
                  {categories.filter((c) => c !== "all").map((c) => <SelectItem key={c} value={c} className="text-[#d7ddf5]">{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddOpen(false)} className="text-[#a5accb]">Cancel</Button>
            <Button onClick={handleAddCompany} className="bg-[#8b5cf6] hover:bg-[#7c3aed] text-[#090b14]">Add Company</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-[#121526] border-[#2b3150]">
          <DialogHeader><DialogTitle className="text-[#f5f7ff]">Edit Company Details</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input value={editCompanyName} onChange={(e) => setEditCompanyName(e.target.value)} className="bg-[#1a1f33] border-[#2b3150] text-[#f5f7ff]" />
            <Select value={editCompanyCategory} onValueChange={setEditCompanyCategory}>
              <SelectTrigger className="bg-[#1a1f33] border-[#2b3150] text-[#f5f7ff]"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-[#14182a] border-[#2b3150]">
                {categories.filter((c) => c !== "all").map((c) => <SelectItem key={c} value={c} className="text-[#d7ddf5]">{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditOpen(false)} className="text-[#a5accb]">Cancel</Button>
            <Button onClick={handleSaveEdit} className="bg-[#8b5cf6] hover:bg-[#7c3aed] text-[#090b14]">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="bg-[#121526] border-[#2b3150] max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-[#f5f7ff]">Campaign History · {selectedCompany?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[420px] overflow-y-auto">
            {(campaignStatsByCompanyId[selectedCompany?.id]?.history || []).length === 0 ? (
              <div className="p-4 rounded border border-[#2b3150] text-[#a5accb] text-sm">No campaign history for this company yet.</div>
            ) : (
              (campaignStatsByCompanyId[selectedCompany?.id]?.history || []).map((form) => (
                <div key={form.id} className="p-3 rounded border border-[#2b3150] bg-[#14182a] flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#f5f7ff]">{form.title}</p>
                    <p className="text-xs text-[#a5accb]">{form.product} · {form.category}</p>
                  </div>
                  <Badge variant="outline" className="border-[#2b3150] text-[#a5accb] capitalize">{form.status}</Badge>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setHistoryOpen(false)} className="text-[#a5accb]">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

