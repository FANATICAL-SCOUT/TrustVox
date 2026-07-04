"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { BarChart3, ClipboardList, FolderKanban, MessageSquare, Star } from "lucide-react"
import { getCampaignSummaries, type CampaignStatus, type CampaignSummary } from "@/lib/client-campaigns"

const STATUS_STYLE: Record<CampaignStatus, string> = {
	active: "border-mint/30 bg-mint/10 text-mint",
	draft: "border-gold/30 bg-gold/10 text-gold",
	completed: "border-white/15 bg-white/[0.04] text-ink-muted",
}

const STATUS_LABEL: Record<CampaignStatus, string> = {
	active: "Active",
	draft: "Draft",
	completed: "Completed",
}

export default function ClientCampaignsPage() {
	const router = useRouter()
	const [campaigns, setCampaigns] = useState<CampaignSummary[]>([])

	useEffect(() => {
		void getCampaignSummaries().then(setCampaigns)
	}, [])

	return (
		<div className="min-h-screen bg-background">
			<main className="mx-auto max-w-6xl px-4 py-8">
				<header className="mb-8">
					<h1 className="font-display text-2xl font-bold text-ink">Campaigns</h1>
					<p className="mt-1 text-sm text-ink-dim">
						Manage campaign-level performance, progress, and form execution from one strategic layer.
					</p>
				</header>

				<section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
					{campaigns.map((campaign) => (
						<div
							key={campaign.id}
							className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5"
						>
							<div className="mb-1 flex items-center justify-between gap-2">
								<span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[campaign.status]}`}>
									{STATUS_LABEL[campaign.status]}
								</span>
								<FolderKanban className="h-4 w-4 text-gold" />
							</div>
							<h3 className="text-lg font-semibold text-ink">{campaign.name}</h3>
							<p className="mb-5 text-sm text-ink-dim">{campaign.description}</p>

							<div className="mb-5 grid grid-cols-3 gap-2 text-center">
								<div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-2.5">
									<div className="mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-gold/10 text-gold">
										<ClipboardList className="h-3.5 w-3.5" />
									</div>
									<p className="text-sm font-semibold text-ink">{campaign.formsCount}</p>
									<p className="text-[11px] text-ink-muted">Forms</p>
								</div>
								<div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-2.5">
									<div className="mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-gold/10 text-gold">
										<MessageSquare className="h-3.5 w-3.5" />
									</div>
									<p className="text-sm font-semibold text-ink">{campaign.totalResponses}</p>
									<p className="text-[11px] text-ink-muted">Responses</p>
								</div>
								<div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-2.5">
									<div className="mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-gold/10 text-gold">
										<Star className="h-3.5 w-3.5" />
									</div>
									<p className="text-sm font-semibold text-ink">{campaign.averageRating > 0 ? campaign.averageRating.toFixed(1) : "—"}</p>
									<p className="text-[11px] text-ink-muted">Avg Rating</p>
								</div>
							</div>

							<button
								onClick={() => router.push(`/client/campaigns/${campaign.id}`)}
								className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-b from-[#f2c877] to-gold-deep px-4 py-2 text-sm font-semibold text-[#241a06] transition hover:brightness-105"
							>
								<BarChart3 className="h-4 w-4" />
								Open Campaign
							</button>
						</div>
					))}
				</section>

				{campaigns.length === 0 ? (
					<div className="mt-8 rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-12 text-center text-sm text-ink-dim">
						No campaigns found.
					</div>
				) : null}
			</main>
		</div>
	)
}
