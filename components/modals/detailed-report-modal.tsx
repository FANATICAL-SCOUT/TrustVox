"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Star, MessageSquare, Calendar, BarChart3, CheckCircle, Info } from "lucide-react"

interface DetailedReportModalProps {
  isOpen: boolean
  onClose: () => void
  campaign: {
    id: number
    title: string
    product: string
    date: string
    status: string
    feedbacks: number
    averageRating: number
    positiveComments: string[] // Array of positive comments
  } | null
}

export default function DetailedReportModal({ isOpen, onClose, campaign }: DetailedReportModalProps) {
  if (!campaign) return null

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500/80 text-white"
      case "active":
        return "bg-blue-500/80 text-white"
      case "pending":
        return "bg-yellow-500/80 text-white"
      default:
        return "bg-slate-500/80 text-white"
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] bg-slate-800/90 border-slate-700 text-slate-100 backdrop-blur-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-slate-100 flex items-center">
            <BarChart3 className="w-6 h-6 mr-2 text-teal-400" />
            Detailed Campaign Report
          </DialogTitle>
          <DialogDescription className="text-slate-300">
            In-depth analysis for: <span className="font-semibold">{campaign.title}</span>
          </DialogDescription>
        </DialogHeader>
        <Separator className="bg-slate-700 my-4" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Campaign Overview */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-slate-100 flex items-center">
              <Info className="w-5 h-5 mr-2 text-cyan-400" />
              Overview
            </h3>
            <div className="bg-slate-700/30 p-4 rounded-lg border border-slate-600/50 space-y-2">
              <p className="text-slate-200">
                <span className="font-medium text-slate-400">Product:</span> {campaign.product}
              </p>
              <p className="text-slate-200 flex items-center">
                <Calendar className="w-4 h-4 mr-2 text-purple-400" />
                <span className="font-medium text-slate-400">Date:</span> {campaign.date}
              </p>
              <p className="text-slate-200 flex items-center">
                <MessageSquare className="w-4 h-4 mr-2 text-purple-400" />
                <span className="font-medium text-slate-400">Total Feedbacks:</span> {campaign.feedbacks}
              </p>
              <p className="text-slate-200 flex items-center">
                <Star className="w-4 h-4 mr-2 text-yellow-400" />
                <span className="font-medium text-slate-400">Average Rating:</span>{" "}
                {campaign.averageRating > 0 ? `${campaign.averageRating.toFixed(1)} / 5.0` : "N/A"}
              </p>
              <div className="flex items-center">
                <Badge className={`${getStatusColor(campaign.status)} font-medium`}>{campaign.status}</Badge>
              </div>
            </div>
          </div>

          {/* Most Typed Positive Comments */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-slate-100 flex items-center">
              <MessageSquare className="w-5 h-5 mr-2 text-green-400" />
              Most Typed Positive Comments
            </h3>
            <div className="bg-slate-700/30 p-4 rounded-lg border border-slate-600/50 max-h-60 overflow-y-auto custom-scrollbar">
              {campaign.positiveComments && campaign.positiveComments.length > 0 ? (
                <ul className="space-y-3">
                  {campaign.positiveComments.map((comment, index) => (
                    <li key={index} className="flex items-start text-slate-200">
                      <CheckCircle className="w-4 h-4 mr-2 mt-1 flex-shrink-0 text-green-400" />
                      <span className="leading-relaxed">{comment}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-400 italic">No positive comments available yet.</p>
              )}
            </div>
          </div>
        </div>

        <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #334155; /* slate-700 */
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #64748b; /* slate-500 */
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8; /* slate-400 */
        }
      `}</style>
      </DialogContent>
    </Dialog>
  )
}
