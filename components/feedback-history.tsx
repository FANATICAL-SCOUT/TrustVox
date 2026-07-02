"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { History, Coins, Star, MessageSquare, Eye, Save } from "lucide-react"
import CompanyDetailsModal from "./modals/company-details-modal"
import { getForms, getResponsesByFormId, subscribeToFormsUpdates } from "@/lib/feedback-store"

interface FeedbackHistoryProps {
  newFeedbacks: any[]
  savedFeedbacks: any[] // New prop for saved feedbacks
  onContinueEditing: (feedbackData: any) => void // New prop to continue editing a draft
}

interface FeedbackHistoryModalHandlers {
  onStartFeedback?: (feedback: any) => void;
  onSaveForLater?: (feedback: any) => void;
}

type FeedbackHistoryAllProps = FeedbackHistoryProps & FeedbackHistoryModalHandlers;

export default function FeedbackHistory({ newFeedbacks, savedFeedbacks, onContinueEditing, onStartFeedback, onSaveForLater }: FeedbackHistoryAllProps) {
  const [selectedFeedback, setSelectedFeedback] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [allFeedbacks, setAllFeedbacks] = useState<any[]>([])
  const [helpfulMessageId, setHelpfulMessageId] = useState<string | null>(null) // State for helpful message

  useEffect(() => {
    const loadLiveHistory = () => {
      const forms = getForms()

      const mapped = forms.flatMap((form) => {
        const responses = getResponsesByFormId(form.id)

        return responses.map((response, index) => {
          const answerValues = Object.values(response.answers || {})
          const textAnswer = answerValues.find((value) => typeof value === "string" && value.trim().length > 0)
          const feedbackText =
            typeof textAnswer === "string"
              ? textAnswer
              : `Feedback submitted for ${form.product}.`

          return {
            id: response.id,
            company: form.clientName,
            product: form.product,
            feedback: feedbackText,
            date: response.submittedAt.slice(0, 10),
            status: "approved",
            tokensEarned: response.rewardTokens ?? form.rewardTokens,
            interactions: 1 + (index % 6),
            rating: 4.5,
            category: form.category,
          }
        })
      })

      const sorted = mapped.sort((a, b) => Date.parse(String(b.date)) - Date.parse(String(a.date)))
      setAllFeedbacks([...newFeedbacks, ...sorted])
    }

    loadLiveHistory()
    const unsubscribe = subscribeToFormsUpdates(loadLiveHistory)
    window.addEventListener("focus", loadLiveHistory)

    return () => {
      unsubscribe()
      window.removeEventListener("focus", loadLiveHistory)
    }
  }, [newFeedbacks])

  const userStats = {
    totalFeedbacks: allFeedbacks.length + savedFeedbacks.length, // Include drafts in total
    tokensEarned: allFeedbacks.reduce((sum, f) => sum + f.tokensEarned, 0),
    averageRating: allFeedbacks.length > 0 ? (allFeedbacks.reduce((sum, f) => sum + f.rating, 0) / allFeedbacks.length).toFixed(1) : "0.0",
    totalInteractions: allFeedbacks.reduce((sum, f) => sum + f.interactions, 0),
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-500/80 text-white"
      case "pending":
        return "bg-yellow-500/80 text-white"
      case "rejected":
        return "bg-red-500/80 text-white"
      case "draft":
        return "bg-blue-500/80 text-white" // Color for drafts
      default:
        return "bg-slate-500/80 text-white"
    }
  }

  const handleViewDetails = (feedback: any) => {
    setSelectedFeedback(feedback)
    setIsModalOpen(true)
  }

  const handleHelpfulClick = (id: string) => {
    setHelpfulMessageId(id)
    setTimeout(() => {
      setHelpfulMessageId(null)
    }, 2000) // Message disappears after 2 seconds
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center mb-8" data-reveal-block>
        <History className="w-8 h-8 text-[#a78bfa] mr-4" />
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Feedback History & Rewards</h1>
          <p className="text-slate-300 mt-2">Track your contributions and earnings</p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="space-card border-slate-600/30" data-reveal-card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">Total Feedbacks</CardTitle>
            <MessageSquare className="h-4 w-4 text-[#a78bfa]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-100">{userStats.totalFeedbacks}</div>
            <p className="text-xs text-slate-400 font-medium">+3 from last week</p>
          </CardContent>
        </Card>

        <Card className="space-card border-slate-600/30" data-reveal-card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">Tokens Earned</CardTitle>
            <Coins className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-400">{userStats.tokensEarned}</div>
            <p className="text-xs text-slate-400 font-medium">+185 from last week</p>
          </CardContent>
        </Card>

        <Card className="space-card border-slate-600/30" data-reveal-card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">Avg. Rating</CardTitle>
            <Star className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">{userStats.averageRating}</div>
            <p className="text-xs text-slate-400 font-medium">{userStats.totalInteractions} total interactions</p>
          </CardContent>
        </Card>
      </div>

      {/* Saved for Later Feedbacks */}
      {savedFeedbacks.length > 0 && (
        <Card className="mb-8 space-card border-slate-600/30" data-reveal-card>
          <CardHeader>
            <CardTitle className="text-slate-100 flex items-center">
              <Save className="w-5 h-5 text-[#a78bfa] mr-2" />
              Saved Drafts
            </CardTitle>
            <CardDescription className="text-slate-300">Feedbacks you've saved to complete later</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {savedFeedbacks.map((feedback) => (
                <div
                  key={feedback.id}
                  className="border border-slate-600/50 rounded-lg p-4 hover:bg-slate-800/30 transition-colors space-card"
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-2">
                    <div>
                      <h3 className="font-semibold text-lg text-slate-100">{feedback.company}</h3>
                      <p className="text-slate-300 font-medium">{feedback.product}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={`${getStatusColor(feedback.status)} font-medium`}>{feedback.status}</Badge>
                      <span className="text-sm text-slate-400 font-medium">Draft</span>
                    </div>
                  </div>

                  <p className="text-slate-200 mb-3 leading-relaxed line-clamp-2">
                    {feedback.feedback || "No feedback entered yet."}
                  </p>

                  <div className="flex justify-end items-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onContinueEditing(feedback)}
                      className="bg-slate-800/50 border-slate-600 text-slate-200 hover:bg-slate-700/50 font-medium"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Continue Editing
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Feedbacks */}
      <Card className="space-card border-slate-600/30" data-reveal-card>
        <CardHeader>
          <CardTitle className="text-slate-100">Recent Feedbacks</CardTitle>
          <CardDescription className="text-slate-300">
            Your latest feedback submissions and their status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {allFeedbacks.map((feedback) => (
              <div
                key={feedback.id}
                className="border border-slate-600/50 rounded-lg p-4 hover:bg-slate-800/30 transition-colors space-card"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-lg text-slate-100">{feedback.company}</h3>
                    <p className="text-slate-300 font-medium">{feedback.product}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={`${getStatusColor(feedback.status)} font-medium`}>{feedback.status}</Badge>
                    <span className="text-sm text-slate-400 font-medium">{feedback.date}</span>
                  </div>
                </div>

                <p className="text-slate-200 mb-3 leading-relaxed">{feedback.feedback}</p>

                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      <Coins className="w-4 h-4 text-yellow-400 mr-1" />
                      <span className="text-sm text-slate-200 font-medium">{feedback.tokensEarned} tokens</span>
                    </div>
                    <div className="flex items-center">
                      <MessageSquare className="w-4 h-4 text-blue-400 mr-1" />
                      <span className="text-sm text-slate-200 font-medium">{feedback.interactions} interactions</span>
                    </div>
                    <div className="flex items-center">
                      <Star className="w-4 h-4 text-yellow-400 mr-1" />
                      <span className="text-sm text-slate-200 font-medium">{feedback.rating}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleHelpfulClick(feedback.id)}
                      className="text-[#a78bfa] hover:text-[#c4b5fd]"
                    >
                      Helpful?
                    </Button>
                    {helpfulMessageId === feedback.id && (
                      <span className="text-xs text-green-400">Thank you for the suggestion!</span>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDetails(feedback)}
                      className="bg-slate-800/50 border-slate-600 text-slate-200 hover:bg-slate-700/50 font-medium"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View Details
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Company Details Modal */}
      {selectedFeedback && (
        <CompanyDetailsModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          company={selectedFeedback}
          onStartFeedback={() => (onStartFeedback ? onStartFeedback(selectedFeedback) : undefined)}
          onSaveForLater={() => (onSaveForLater ? onSaveForLater(selectedFeedback) : undefined)}
        />
      )}
    </div>
  )
}
