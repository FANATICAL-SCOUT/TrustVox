"use client"

import { useMemo } from "react"
import { useRouter } from "next/navigation"
import { BarChart3, CheckCircle2, ClipboardList, FolderKanban, MessageSquare, Star } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getCampaignSummaries, type CampaignStatus } from "@/lib/client-campaigns"

const STATUS_STYLE: Record<CampaignStatus, string> = {
	active: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
	draft: "border-amber-400/30 bg-amber-500/10 text-amber-200",
	completed: "border-slate-400/30 bg-slate-500/10 text-slate-200",
}

const STATUS_LABEL: Record<CampaignStatus, string> = {
	active: "Active",
	draft: "Draft",
	completed: "Completed",
}

export default function ClientCampaignsPage() {
	const router = useRouter()
	const campaigns = useMemo(() => getCampaignSummaries(), [])

	return (
		<div className="min-h-screen bg-[#090b14]">
			<main className="mx-auto max-w-6xl px-4 py-8">
				<header className="mb-8">
					<h1 className="text-2xl font-bold text-[#f5f7ff]">Campaigns</h1>
					<p className="mt-1 text-sm text-[#a5accb]">
						Manage campaign-level performance, progress, and form execution from one strategic layer.
					</p>
				</header>

				<section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
					{campaigns.map((campaign) => (
						<Card
							key={campaign.id}
							className="rounded-2xl border border-[#2b3150] bg-[linear-gradient(180deg,rgba(30,27,51,0.95),rgba(18,21,38,0.95))] shadow-[0_10px_30px_rgba(0,0,0,0.25)]"
						>
							<CardHeader className="pb-2">
								<div className="mb-1 flex items-center justify-between gap-2">
									<Badge className={`border ${STATUS_STYLE[campaign.status]}`}>{STATUS_LABEL[campaign.status]}</Badge>
									<FolderKanban className="h-4 w-4 text-[#a78bfa]" />
								</div>
								<CardTitle className="text-lg font-semibold text-[#f5f7ff]">{campaign.name}</CardTitle>
								<p className="text-sm text-[#a5accb]">{campaign.description}</p>
							</CardHeader>

							<CardContent>
								<div className="mb-5 grid grid-cols-3 gap-2 text-center">
									<div className="rounded-lg border border-[#2b3150] bg-[#121526] p-2.5">
										<div className="mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#8b5cf6]/15 text-[#a78bfa]">
											<ClipboardList className="h-3.5 w-3.5" />
										</div>
										<p className="text-sm font-semibold text-[#f5f7ff]">{campaign.formsCount}</p>
										<p className="text-[11px] text-[#6c7396]">Forms</p>
									</div>
									<div className="rounded-lg border border-[#2b3150] bg-[#121526] p-2.5">
										<div className="mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#8b5cf6]/15 text-[#a78bfa]">
											<MessageSquare className="h-3.5 w-3.5" />
										</div>
										<p className="text-sm font-semibold text-[#f5f7ff]">{campaign.totalResponses}</p>
										<p className="text-[11px] text-[#6c7396]">Responses</p>
									</div>
									<div className="rounded-lg border border-[#2b3150] bg-[#121526] p-2.5">
										<div className="mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#8b5cf6]/15 text-[#a78bfa]">
											<Star className="h-3.5 w-3.5" />
										</div>
										<p className="text-sm font-semibold text-[#f5f7ff]">{campaign.averageRating.toFixed(1)}</p>
										<p className="text-[11px] text-[#6c7396]">Avg Rating</p>
									</div>
								</div>

								<Button
									onClick={() => router.push(`/client/campaigns/${campaign.id}`)}
									className="w-full gap-2 bg-[#8b5cf6] text-[#090b14] hover:bg-[#7c3aed]"
								>
									<BarChart3 className="h-4 w-4" />
									Open Campaign
								</Button>
							</CardContent>
						</Card>
					))}
				</section>

				{campaigns.length === 0 ? (
					<div className="mt-8 rounded-2xl border border-[#2b3150] bg-[#121526] px-4 py-12 text-center text-sm text-[#a5accb]">
						No campaigns found.
					</div>
				) : null}
			</main>
		</div>
	)
}
