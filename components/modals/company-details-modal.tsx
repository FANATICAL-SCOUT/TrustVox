"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
      <DialogContent className="sm:max-w-[500px] bg-slate-800/90 border-slate-600/50 backdrop-blur-sm text-slate-100">
        <DialogHeader>
          <DialogTitle className="text-slate-100 text-2xl">{company.product}</DialogTitle>
          <DialogDescription className="text-slate-300">
            Details about {company.company} and its {company.product}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex items-center justify-between">
            <span className="text-slate-200 font-medium">Company:</span>
            <span className="text-slate-100">{company.company}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-200 font-medium">Category:</span>
            <Badge variant="outline" className="border-teal-500/30 text-teal-300">
              {company.category}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-200 font-medium">Average Rating:</span>
            <div className="flex items-center">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400 mr-1" />
              <span className="text-slate-100">{company.rating.toFixed(1)}</span>
            </div>
          </div>
          <div>
            <span className="text-slate-200 font-medium block mb-2">Description:</span>
            <p className="text-slate-300 leading-relaxed">{company.feedback}</p>
          </div>
        </div>
        <div className="flex justify-end space-x-2">
          <Button
            variant="outline"
            onClick={handleSaveForLaterClick}
            className="bg-slate-700/50 border-slate-600 text-slate-200 hover:bg-slate-600/50"
          >
            <Save className="w-4 h-4 mr-2" />
            Save for Later
          </Button>
          <Button
            onClick={handleStartFeedbackClick}
            className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Start Feedback
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
