"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Lightbulb, Save, MessageSquare, ArrowRight, Star, Clock3, Users } from "lucide-react"
import SearchWithAutocomplete from "@/components/search-with-autocomplete"
import { getApprovedForms, subscribeToFormsUpdates, type FeedbackForm } from "@/lib/feedback-store"
import { getTVXWalletState, subscribeToTVXWalletUpdates } from "@/lib/tvx-wallet"

interface SuggestedFeedbackProps {
  handleStartFeedbackFromSuggested: (feedback: any) => void;
  onSaveForLater: (feedback: any) => void;
}

const SuggestedFeedbacks = ({ handleStartFeedbackFromSuggested, onSaveForLater }: SuggestedFeedbackProps) => {
  const [approvedForms, setApprovedForms] = useState<FeedbackForm[]>([])
  const [walletBalance, setWalletBalance] = useState(() => getTVXWalletState().balance)
  const [activeFilter, setActiveFilter] = useState<"all" | "high-reward" | "ending-soon" | "easy">("all")

  useEffect(() => {
    const loadForms = () => {
      setApprovedForms(getApprovedForms())
    }

    loadForms()
    const unsubscribe = subscribeToFormsUpdates(loadForms)
    window.addEventListener("focus", loadForms)

    return () => {
      unsubscribe()
      window.removeEventListener("focus", loadForms)
    }
  }, [])

  useEffect(() => {
    const syncWallet = () => {
      setWalletBalance(getTVXWalletState().balance)
    }

    syncWallet()
    const unsubscribe = subscribeToTVXWalletUpdates(syncWallet)
    window.addEventListener("focus", syncWallet)

    return () => {
      unsubscribe()
      window.removeEventListener("focus", syncWallet)
    }
  }, [])

  const mockSuggestedFeedbacks = useMemo(() => [
    {
      id: "sugg1",
      formId: approvedForms[0]?.id || "",
      company: "GlobalTech Innovations",
      product: "Quantum Leap Software",
      category: "Productivity Software",
      description:
        "Provide feedback on the new UI/UX of Quantum Leap Software's latest update. Focus on ease of navigation and feature accessibility.",
      reward: 25,
      rating: 4.5,
      participants: 1200,
      estimatedTime: "2-3 mins",
      badges: ["🔥 Ending Soon"],
      status: "active",
    },
    {
      id: "sugg2-eco",
      formId: approvedForms[1]?.id || approvedForms[0]?.id || "",
      company: "Eco-Friendly Foods",
      product: "Organic Protein Bar",
      category: "Food & Beverage",
      description: "Taste test and review the new Organic Protein Bar. Comment on flavor, texture, and packaging.",
      reward: 15,
      rating: 0, // No rating yet
      participants: 850,
      estimatedTime: "2 mins",
      badges: ["Easy"],
      status: "active",
    },
    {
      id: "sugg3-fashion",
      formId: approvedForms[2]?.id || approvedForms[0]?.id || "",
      company: "Fashion Forward Group",
      product: "Winter Collection 2024",
      category: "Apparel",
      description: "Review the new Winter Collection. Focus on material quality, design, and overall appeal.",
      reward: 30,
      rating: 0,
      participants: 980,
      estimatedTime: "3-4 mins",
      badges: ["⚡ High Reward", "💎 Premium"],
      status: "active",
    },
    {
      id: "sugg4-health",
      formId: approvedForms[3]?.id || approvedForms[1]?.id || approvedForms[0]?.id || "",
      company: "Health & Wellness Hub",
      product: "Smart Fitness Tracker",
      category: "Wearable Tech",
      description:
        "Test the accuracy of the Smart Fitness Tracker's heart rate monitor and step counter. Provide insights on battery life.",
      reward: 20,
      rating: 4.0,
      participants: 410,
      estimatedTime: "2-3 mins",
      badges: ["Easy"],
      status: "active",
    },
    {
      id: "sugg5-travel",
      formId: approvedForms[4]?.id || approvedForms[2]?.id || approvedForms[0]?.id || "",
      company: "Travel Adventures Ltd.",
      product: "Virtual Reality Travel Experience",
      category: "Entertainment",
      description:
        "Experience the VR travel demo and provide feedback on immersion, realism, and potential improvements.",
      reward: 40,
      rating: 0,
      participants: 1267,
      estimatedTime: "3-5 mins",
      badges: ["⚡ High Reward", "🔥 Ending Soon"],
      status: "active",
    },
  ].map((entry, index) => {
    const form = approvedForms[index]
    if (!form) return null
    return {
      ...entry,
      formId: form.id,
      company: form.clientName,
      product: form.product,
      category: form.category,
      description: form.description || entry.description,
      reward: form.rewardTokens,
      rating: 4.5,
      participants: form.responseCount > 0 ? form.responseCount : entry.participants,
    }
  }).filter((entry): entry is NonNullable<typeof entry> => Boolean(entry)), [approvedForms])

  const rewardGoals = [100, 200, 300, 500]
  const nextGoal = rewardGoals.find((goal) => goal > walletBalance) ?? (walletBalance + 100)
  const tvxAway = Math.max(0, nextGoal - walletBalance)

  const progressMessage =
    tvxAway > 0
      ? `You're ${tvxAway} TVX away from unlocking rewards 🎯`
      : "You have enough TVX to redeem a voucher now"

  const handleSearchSelect = (item: any) => {
    const selectedId = item?.id
    if (typeof selectedId === "string" && selectedId.length > 0) {
      handleStartFeedbackFromSuggested({ formId: selectedId, id: selectedId })
    }
  }

  const handleStartFeedback = (feedback: any) => {
    handleStartFeedbackFromSuggested(feedback)
  }

  const handleSaveDraft = (feedback: any) => {
    onSaveForLater(feedback)
  }

  const getBadgeTone = (badge: string) => {
    if (badge.includes("Ending Soon")) {
      return "border-rose-400/35 bg-rose-500/15 text-rose-200"
    }
    if (badge.includes("High Reward")) {
      return "border-violet-400/35 bg-violet-500/18 text-violet-200"
    }
    if (badge.includes("Premium")) {
      return "border-cyan-400/35 bg-cyan-500/15 text-cyan-200"
    }
    return "border-slate-500/35 bg-slate-500/15 text-slate-200"
  }

  const filteredFeedbacks = useMemo(() => {
    if (activeFilter === "all") return mockSuggestedFeedbacks

    if (activeFilter === "high-reward") {
      return mockSuggestedFeedbacks.filter((feedback) =>
        feedback.badges.some((badge) => badge.includes("High Reward")),
      )
    }

    if (activeFilter === "ending-soon") {
      return mockSuggestedFeedbacks.filter((feedback) =>
        feedback.badges.some((badge) => badge.includes("Ending Soon")),
      )
    }

    return mockSuggestedFeedbacks.filter(
      (feedback) => feedback.estimatedTime.includes("2") || feedback.badges.some((badge) => badge === "Easy"),
    )
  }, [activeFilter, mockSuggestedFeedbacks])

  const searchItems = useMemo(
    () =>
      mockSuggestedFeedbacks.map((feedback) => ({
        id: feedback.formId || feedback.id,
        type: "product",
        name: feedback.product,
        subtitle: feedback.company,
        category: feedback.category,
      })),
    [mockSuggestedFeedbacks],
  )

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-10" data-reveal-block>
        <div className="flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-3">
            <Lightbulb className="w-8 h-8 text-[#a78bfa] flex-shrink-0" />
            <h1 className="text-3xl font-bold text-slate-100">Recommended for you</h1>
          </div>
          <p className="text-slate-300 mt-2 max-w-2xl">Based on your activity and interests</p>
          <div className="mt-4 rounded-full border border-violet-400/30 bg-violet-500/10 px-4 py-2 text-sm text-violet-200 shadow-[0_0_18px_rgba(139,92,246,0.2)]">
            {progressMessage}
          </div>
        </div>

        <div className="mt-6 flex justify-center">
          <SearchWithAutocomplete
            onSelect={handleSearchSelect}
            items={searchItems}
            className="w-full max-w-xl"
            placeholder="Search suggested products, companies, or categories..."
          />
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
        {[
          { key: "all", label: "All" },
          { key: "high-reward", label: "High Reward" },
          { key: "ending-soon", label: "Ending Soon" },
          { key: "easy", label: "Easy" },
        ].map((filter) => (
          <button
            key={filter.key}
            onClick={() => setActiveFilter(filter.key as "all" | "high-reward" | "ending-soon" | "easy")}
            className={`rounded-full border px-3 py-1.5 text-sm transition-all duration-200 ${
              activeFilter === filter.key
                ? "border-violet-400/50 bg-violet-500/20 text-violet-100"
                : "border-slate-600/50 bg-slate-800/40 text-slate-300 hover:border-violet-400/40 hover:text-violet-200"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredFeedbacks.map((feedback) => (
          <Card
            key={feedback.id}
            data-reveal-card
            className="group space-card border-slate-600/30 hover:scale-[1.02] hover:shadow-[0_18px_45px_rgba(139,92,246,0.24)] transition-all duration-300"
          >
            <CardHeader>
              <div className="flex items-start justify-between gap-3 mb-2">
                <CardTitle className="text-slate-100 text-xl leading-tight">{feedback.product}</CardTitle>
                <Badge className="bg-[#8b5cf6]/80 text-white font-medium whitespace-nowrap">Earn {feedback.reward} TVX</Badge>
              </div>
              <div className="flex flex-wrap gap-2 mb-1">
                {feedback.badges.map((badge) => (
                  <span key={badge} className={`text-[11px] px-2 py-1 rounded-full border ${getBadgeTone(badge)}`}>
                    {badge}
                  </span>
                ))}
              </div>
              <CardDescription className="text-slate-300 font-medium">{feedback.company}</CardDescription>
              <Badge variant="outline" className="border-[#8b5cf6]/40 text-[#a78bfa] mt-2">
                {feedback.category}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-slate-200 leading-relaxed line-clamp-3">{feedback.description}</p>

              <div className="flex flex-wrap gap-3 text-xs text-slate-400">
                <span className="inline-flex items-center gap-1">
                  <Clock3 className="w-3.5 h-3.5 text-slate-500" />
                  Takes {feedback.estimatedTime}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-slate-500" />
                  {feedback.participants.toLocaleString()} users participated
                </span>
              </div>

              {feedback.rating > 0 && (
                <div className="flex items-center text-sm text-slate-300">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400 mr-1" />
                  <span>{feedback.rating.toFixed(1)} Average Rating</span>
                </div>
              )}
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSaveDraft(feedback)}
                  className="bg-slate-800/50 border-slate-600 text-slate-200 hover:bg-slate-700/50 font-medium"
                >
                  <Save className="w-4 h-4 mr-1" />
                  Save for Later
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleStartFeedback(feedback)}
                  className="bg-gradient-to-r from-[#7c3aed] to-[#4f46e5] hover:brightness-110 group-hover:shadow-[0_0_28px_rgba(139,92,246,0.45)] text-white font-medium"
                >
                  <MessageSquare className="w-4 h-4 mr-1" />
                  Earn {feedback.reward} TVX
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default SuggestedFeedbacks
