"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Star, MessageSquare, Save } from "lucide-react"

interface CompanyDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  company: {
    id: string
    company: string
    product: string
    category: string
    rating: number
    feedback: string // Using this for a mock description
  } | null
  onStartFeedback: (feedbackData: any) => void
  onSaveForLater: (feedbackData: any) => void
}

export default function CompanyDetailsModal({
  isOpen,
  onClose,
  company,
  onStartFeedback,
  onSaveForLater,
}: CompanyDetailsModalProps) {
  if (!company) return null

  const handleStartFeedbackClick = () => {
    onStartFeedback(company)
    onClose()
  }

  const handleSaveForLaterClick = () => {
    onSaveForLater(company)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="border-white/[0.08] bg-surface text-ink sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl text-ink">{company.product}</DialogTitle>
          <DialogDescription className="text-ink-muted">
            Details about {company.company} and its {company.product}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 py-4">
          <div className="flex items-center justify-between">
            <span className="font-medium text-ink-dim">Company:</span>
            <span className="text-ink">{company.company}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium text-ink-dim">Category:</span>
            <span className="inline-flex items-center rounded-full border border-gold/25 bg-gold/10 px-2.5 py-0.5 text-[11px] font-medium text-gold">
              {company.category}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium text-ink-dim">Average Rating:</span>
            <div className="flex items-center">
              <Star className="mr-1 h-4 w-4 fill-gold text-gold" />
              <span className="tvx-num text-ink">{company.rating.toFixed(1)}</span>
            </div>
          </div>
          <div>
            <span className="mb-2 block font-medium text-ink-dim">Description:</span>
            <p className="leading-relaxed text-ink-muted">{company.feedback}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={handleSaveForLaterClick}
            className="border-white/10 bg-white/[0.03] text-ink-dim hover:bg-white/[0.06] hover:text-ink"
          >
            <Save className="mr-2 h-4 w-4" />
            Save for Later
          </Button>
          <Button
            onClick={handleStartFeedbackClick}
            className="bg-gradient-to-b from-[#f2c877] to-gold-deep font-semibold text-[#241a06] hover:brightness-105"
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            Start Feedback
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
