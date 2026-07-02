"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MessageSquare, Star, Save, Coins, Trophy, Flame, Clock3 } from "lucide-react"
import SearchWithAutocomplete from "./search-with-autocomplete"
import { getApprovedForms, subscribeToFormsUpdates, type FeedbackForm } from "@/lib/feedback-store"

interface LandingSectionProps {
  handleStartFeedbackFromSuggested: (feedbackData: any) => void
  setSelectedCompanyForModal: (company: any) => void
  setIsCompanyModalOpen: (isOpen: boolean) => void
  onSaveForLater: (feedbackData: any) => void
  dailyFeedbackRemaining: number
  dailyFeedbackLimit: number
  completedToday: number
}

interface FeedbackOpportunity {
  id: string
  formId: string
  company: string
  product: string
  category: string
  rating: number
  reward: number
  totalFeedbacks: number
  description: string
  tags: string[]
}

export default function LandingSection({
  handleStartFeedbackFromSuggested,
  setSelectedCompanyForModal,
  setIsCompanyModalOpen,
  onSaveForLater,
  dailyFeedbackRemaining,
  dailyFeedbackLimit,
  completedToday,
}: LandingSectionProps) {
  const sectionRef = useRef<HTMLDivElement | null>(null)
  const orbLayerRefs = useRef<Array<HTMLDivElement | null>>([])
  const [userName, setUserName] = useState("there")
  const [approvedForms, setApprovedForms] = useState<FeedbackForm[]>([])

  useEffect(() => {
    const sectionEl = sectionRef.current
    if (!sectionEl) return

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return
    }

    const orbLayers = orbLayerRefs.current
    const orbDepths = [12, 18, 15]

    let rect = sectionEl.getBoundingClientRect()
    let rafId = 0
    let targetX = 0
    let targetY = 0
    let currentX = 0
    let currentY = 0

    const tick = () => {
      currentX += (targetX - currentX) * 0.08
      currentY += (targetY - currentY) * 0.08

      orbLayers.forEach((orbLayer, index) => {
        if (!orbLayer) return
        const depth = orbDepths[index] ?? 12
        orbLayer.style.transform = `translate3d(${(currentX * depth).toFixed(2)}px, ${(currentY * depth).toFixed(2)}px, 0)`
      })

      const stillMoving = Math.abs(targetX - currentX) > 0.001 || Math.abs(targetY - currentY) > 0.001
      if (stillMoving) {
        rafId = window.requestAnimationFrame(tick)
      } else {
        rafId = 0
      }
    }

    const queueTick = () => {
      if (!rafId) {
        rafId = window.requestAnimationFrame(tick)
      }
    }

    const handleMouseMove = (event: MouseEvent) => {
      const x = (event.clientX - rect.left) / rect.width
      const y = (event.clientY - rect.top) / rect.height

      // Normalize to -1..1 so movement stays subtle and proportional.
      targetX = (x - 0.5) * 2
      targetY = (y - 0.5) * 2
      queueTick()
    }

    const handleMouseLeave = () => {
      targetX = 0
      targetY = 0
      queueTick()
    }

    const handleResize = () => {
      rect = sectionEl.getBoundingClientRect()
    }

    sectionEl.addEventListener("mousemove", handleMouseMove)
    sectionEl.addEventListener("mouseleave", handleMouseLeave)
    window.addEventListener("resize", handleResize)

    return () => {
      sectionEl.removeEventListener("mousemove", handleMouseMove)
      sectionEl.removeEventListener("mouseleave", handleMouseLeave)
      window.removeEventListener("resize", handleResize)

      if (rafId) {
        window.cancelAnimationFrame(rafId)
      }
    }
  }, [])

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
    try {
      const currentUserRaw = localStorage.getItem("currentUser")
      if (!currentUserRaw) return

      const currentUser = JSON.parse(currentUserRaw)
      const resolvedName = (currentUser?.name || "there").toString().trim()
      if (resolvedName) {
        setUserName(resolvedName)
      }
    } catch {
      // Keep default name fallback when localStorage payload is invalid.
    }
  }, [])

  const handleSearchSelect = (item: any) => {
    const selectedId = item?.id
    if (typeof selectedId === "string" && selectedId.length > 0) {
      handleStartFeedbackFromSuggested({ formId: selectedId, id: selectedId })
      return
    }

    setSelectedCompanyForModal({
      id: item.id,
      company: item.type === "company" ? item.name : "Mock Company",
      product: item.type === "product" ? item.name : "Mock Product",
      category: "General", // Mock category
      rating: 4.2, // Mock rating
      feedback: `This is a mock description for ${item.name}. It's a great ${item.type} and we'd love your feedback!`,
    })
    setIsCompanyModalOpen(true)
  }

  const recommendedFeedbacks: FeedbackOpportunity[] = useMemo(() => [
    {
      id: "rec1",
      formId: approvedForms[0]?.id || "",
      company: "Tech Innovations Inc.",
      product: "Quantum Leap Software",
      category: "Productivity",
      rating: 4.7,
      reward: 42,
      totalFeedbacks: 1200,
      description: "Users are loving the new AI features. Provide your thoughts on its impact on workflow.",
      tags: ["⚡ High Reward", "🔥 Ending Soon"],
    },
    {
      id: "rec2",
      formId: approvedForms[1]?.id || approvedForms[0]?.id || "",
      company: "Global Foods Co.",
      product: "Spicy Mango Salsa",
      category: "Food & Beverage",
      rating: 4.5,
      reward: 28,
      totalFeedbacks: 850,
      description: "The new salsa is a hit! Share your recipe ideas or serving suggestions.",
      tags: ["🕒 Limited Slots", "Popular"],
    },
    {
      id: "rec3",
      formId: approvedForms[2]?.id || approvedForms[0]?.id || "",
      company: "Urban Style Apparel",
      product: "Sustainable Denim Line",
      category: "Fashion",
      rating: 4.8,
      reward: 36,
      totalFeedbacks: 980,
      description: "Review our eco-friendly denim. How does it feel? What do you think of the designs?",
      tags: ["⚡ High Reward", "Popular"],
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
      reward: form.rewardTokens,
      description: form.description || entry.description,
      totalFeedbacks: form.responseCount,
    }
  }).filter((entry): entry is FeedbackOpportunity => Boolean(entry)), [approvedForms])

  const continueItems: FeedbackOpportunity[] = [
    {
      id: "cont1",
      formId: approvedForms[0]?.id || "",
      company: "Health & Wellness Hub",
      product: "Smart Fitness Tracker",
      category: "Wearable Tech",
      rating: 4.0,
      reward: 20,
      totalFeedbacks: 410,
      description: "Resume your draft and complete this feedback in about 3 minutes.",
      tags: ["Draft", "🕒 Limited Slots"],
    },
    {
      id: "cont2",
      formId: approvedForms[1]?.id || approvedForms[0]?.id || "",
      company: "Travel Adventures Ltd.",
      product: "VR Travel Experience",
      category: "Entertainment",
      rating: 4.2,
      reward: 33,
      totalFeedbacks: 267,
      description: "You viewed this recently. Finish it today to unlock bonus rewards.",
      tags: ["Recently Viewed", "🔥 Ending Soon"],
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
      reward: form.rewardTokens,
      description: form.description || entry.description,
      totalFeedbacks: form.responseCount,
    }
  }).filter((entry): entry is FeedbackOpportunity => Boolean(entry))

  const optionalTrending: FeedbackOpportunity[] = [
    {
      id: "trend1",
      formId: approvedForms[2]?.id || approvedForms[0]?.id || "",
      company: "FinEdge Payments",
      product: "Neo Wallet App",
      category: "Fintech",
      rating: 4.6,
      reward: 24,
      totalFeedbacks: 1460,
      description: "Help evaluate onboarding speed and card management flows.",
      tags: ["Popular"],
    },
    {
      id: "trend2",
      formId: approvedForms[3]?.id || approvedForms[1]?.id || approvedForms[0]?.id || "",
      company: "HomeGrid",
      product: "Smart Air Purifier",
      category: "Home Tech",
      rating: 4.4,
      reward: 18,
      totalFeedbacks: 1080,
      description: "Give quick feedback on setup and app controls.",
      tags: ["🕒 Limited Slots"],
    },
  ].map((entry, index) => {
    const form = approvedForms[index + 2]
    if (!form) return null
    return {
      ...entry,
      formId: form.id,
      company: form.clientName,
      product: form.product,
      category: form.category,
      reward: form.rewardTokens,
      description: form.description || entry.description,
      totalFeedbacks: form.responseCount,
    }
  }).filter((entry): entry is FeedbackOpportunity => Boolean(entry))

  const newOpportunitiesCount = recommendedFeedbacks.length

  const stats = useMemo(
    () => [
      { label: "Feedbacks Given", value: "18", icon: MessageSquare, tone: "from-violet-600 to-indigo-600" },
      { label: "Tokens Earned", value: "1,240 TVX", icon: Coins, tone: "from-purple-500 to-violet-600" },
      { label: "User Rank", value: "Top 12%", icon: Trophy, tone: "from-fuchsia-500 to-purple-600" },
      { label: "Activity Streak", value: "7 days", icon: Flame, tone: "from-indigo-500 to-purple-600" },
    ],
    [],
  )

  const handleStartFeedback = (feedback: any) => {
    handleStartFeedbackFromSuggested(feedback)
  }

  const handleSaveDraft = (feedback: any) => {
    onSaveForLater(feedback)
  }

  return (
    <div ref={sectionRef} className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-[#020617] via-[#090b14] to-[#111226] relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div ref={(el) => { orbLayerRefs.current[0] = el }} className="absolute top-20 left-20 orb-layer">
          <div className="w-72 h-72 bg-violet-500/12 rounded-full blur-3xl orb-animate-1"></div>
        </div>
        <div ref={(el) => { orbLayerRefs.current[1] = el }} className="absolute bottom-20 right-20 orb-layer">
          <div className="w-96 h-96 bg-indigo-500/12 rounded-full blur-3xl orb-animate-2"></div>
        </div>
        <div ref={(el) => { orbLayerRefs.current[2] = el }} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 orb-layer">
          <div className="w-64 h-64 bg-fuchsia-500/8 rounded-full blur-2xl orb-animate-3"></div>
        </div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Personalized Hero Section */}
        <div className="py-14 text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-4 py-1.5 text-sm text-violet-200">
            <Clock3 className="h-4 w-4" />
            {newOpportunitiesCount} new opportunities waiting
          </p>
          <h1 className="mt-5 text-4xl font-extrabold leading-tight text-slate-100 sm:text-5xl lg:text-6xl">
            Welcome back, <span className="bg-gradient-to-r from-violet-300 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent">{userName}</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-300">
            Your next rewards are one decision away. Pick an opportunity, share your insight, and level up your impact today.
          </p>
          <div className="mx-auto mt-5 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-4 py-1.5 text-sm text-violet-200">
            <MessageSquare className="h-4 w-4" />
            Daily feedbacks left: {dailyFeedbackRemaining}/{dailyFeedbackLimit} • Submitted today: {completedToday}
          </div>
          <div className="mx-auto mt-8 max-w-3xl">
            <SearchWithAutocomplete onSelect={handleSearchSelect} />
          </div>
        </div>

        {/* Stats Bar */}
        <div className="mb-14 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.label} className="space-card border-slate-600/30 transition-transform duration-300 hover:-translate-y-1">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-400">{stat.label}</p>
                    <p className="mt-1 text-xl font-semibold text-slate-100">{stat.value}</p>
                  </div>
                  <div className={`grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br ${stat.tone}`}>
                    <stat.icon className="h-5 w-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recommended For You */}
        <div className="mb-16">
          <div className="mb-8 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-3xl font-bold text-slate-100">Recommended for you</h2>
              <p className="mt-2 text-slate-300">Based on your activity and saved interests</p>
            </div>
            <Button
              variant="outline"
              onClick={() => handleStartFeedbackFromSuggested(null)}
              className="border-slate-600 bg-slate-800/40 text-slate-200 hover:bg-slate-700/50"
            >
              View all
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recommendedFeedbacks.map((feedback) => (
              <Card
                key={feedback.id}
                className="space-card border-slate-600/30 hover:shadow-lg hover:shadow-violet-500/10 transition-all duration-300"
              >
                <CardHeader>
                  <div className="mb-2 flex flex-wrap gap-2">
                    {feedback.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="border-violet-400/30 bg-violet-500/10 text-violet-200">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <CardTitle className="text-slate-100 text-xl">{feedback.product}</CardTitle>
                    <div className="flex items-center text-sm text-slate-300">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400 mr-1" />
                      <span>{feedback.rating.toFixed(1)}</span>
                    </div>
                  </div>
                  <CardDescription className="text-slate-300 font-medium">{feedback.company}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-slate-200 leading-relaxed line-clamp-3">{feedback.description}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-400">{feedback.reward} TVX reward</span>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSaveDraft(feedback)}
                        className="bg-slate-800/50 border-slate-600 text-slate-200 hover:bg-slate-700/50 font-medium"
                      >
                        <Save className="w-4 h-4 mr-1" />
                        Save
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleStartFeedback(feedback)}
                        className="bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white font-medium"
                      >
                        Start now
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Continue Where You Left Off */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-slate-100">Continue where you left off</h2>
          <p className="mt-2 text-slate-300">Pick up recent drafts and viewed items in one tap</p>

          <div className="mt-7 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {continueItems.slice(0, 3).map((item) => (
              <Card key={item.id} className="space-card border-slate-600/30">
                <CardContent className="p-5">
                  <div className="mb-3 flex flex-wrap gap-2">
                    {item.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="border-cyan-400/30 bg-cyan-500/10 text-cyan-200">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-semibold text-slate-100">{item.product}</h3>
                      <p className="mt-1 text-sm text-slate-300">{item.company}</p>
                    </div>
                    <span className="text-sm font-medium text-violet-200">{item.reward} TVX</span>
                  </div>
                  <p className="mt-3 text-slate-300">{item.description}</p>
                  <div className="mt-5 flex justify-end">
                    <Button
                      size="sm"
                      onClick={() => handleStartFeedback(item)}
                      className="bg-gradient-to-r from-violet-500 to-purple-600 hover:brightness-110 text-white"
                    >
                      Resume
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Optional Trending Section */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-slate-100">Trending right now</h2>
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            {optionalTrending.map((item) => (
              <Card key={item.id} className="space-card border-slate-600/30">
                <CardContent className="flex items-center justify-between gap-4 p-5">
                  <div>
                    <p className="text-lg font-semibold text-slate-100">{item.product}</p>
                    <p className="mt-1 text-sm text-slate-300">{item.company}</p>
                    <div className="mt-2 flex gap-2">
                      {item.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="border-slate-500/50 bg-slate-700/40 text-slate-200">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStartFeedback(item)}
                    className="border-slate-600 bg-slate-800/50 text-slate-100 hover:bg-slate-700/60"
                  >
                    Open
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center bg-slate-800/45 border-slate-600/30 backdrop-blur-sm rounded-xl p-10 shadow-2xl">
          <h2 className="text-4xl font-bold bg-gradient-to-r from-violet-300 to-fuchsia-400 bg-clip-text text-transparent mb-4">
            Earn more tokens today
          </h2>
          <p className="text-lg text-slate-300 max-w-3xl mx-auto mb-8">
            Complete 2 feedbacks from your recommended list and unlock your next reward boost.
          </p>
          <Button
            onClick={() => handleStartFeedbackFromSuggested(null)}
            className="bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white font-bold py-3 px-8 rounded-full shadow-lg transform transition-transform hover:scale-105"
            size="lg"
          >
            Start earning now
          </Button>
        </div>
      </div>

      <style jsx>{`
        .orb-layer {
          will-change: transform;
          transform: translate3d(0, 0, 0);
        }

        .orb-animate-1,
        .orb-animate-2,
        .orb-animate-3 {
          will-change: transform, opacity;
        }

        .orb-animate-1 {
          animation: orb-float-1 9s ease-in-out infinite, pulse-glow 4.6s ease-in-out infinite;
        }

        .orb-animate-2 {
          animation: orb-float-2 12s ease-in-out infinite, pulse-glow 5.4s ease-in-out infinite;
          animation-delay: 0.7s, 1.4s;
        }

        .orb-animate-3 {
          animation: orb-float-3 10.5s ease-in-out infinite, pulse-glow 4.9s ease-in-out infinite;
          animation-delay: 0.3s, 1s;
        }

        @keyframes orb-float-1 {
          0%,
          100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }

        @keyframes orb-float-2 {
          0%,
          100% { transform: translateY(0px); }
          50% { transform: translateY(-16px); }
        }

        @keyframes orb-float-3 {
          0%,
          100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }

        @keyframes pulse-glow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }

        @media (prefers-reduced-motion: reduce) {
          .orb-layer,
          .orb-animate-1,
          .orb-animate-2,
          .orb-animate-3 {
            animation: none !important;
            transform: none !important;
          }
        }
      `}</style>
    </div>
  )
}
