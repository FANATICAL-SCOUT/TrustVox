"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Building2, BarChart3, Plus, Sparkles, Users, MessageSquare, TrendingUp } from "lucide-react"

export default function ClientCompanies() {
  const router = useRouter()

  // Mock data for registered companies
  const [companies] = useState([
    {
      id: 1,
      name: "TechCorp Solutions",
      industry: "Technology",
      activeCampaigns: 3,
      totalFeedbacks: 1240,
      avgRating: 4.6,
      status: "Active",
    },
    {
      id: 2,
      name: "FreshBite Foods",
      industry: "Food & Beverage",
      activeCampaigns: 2,
      totalFeedbacks: 890,
      avgRating: 4.3,
      status: "Active",
    },
    {
      id: 3,
      name: "StyleHub Fashion",
      industry: "Fashion & Retail",
      activeCampaigns: 1,
      totalFeedbacks: 567,
      avgRating: 4.8,
      status: "Paused",
    },
  ])

  const handleViewAnalysis = (companyId: number) => {
    router.push(`/client-dashboard?company=${companyId}`)
  }

  const handleCreateCampaign = (companyId: number) => {
    router.push(`/create-campaign?company=${companyId}`)
  }

  const handleRegisterCompany = () => {
    router.push("/client-onboarding")
  }

  return (
    <div className="min-h-screen bg-[#090b14] relative overflow-hidden">
      <div className="p-4">
        <Button variant="ghost" onClick={() => router.back()} className="flex items-center text-[rgba(241,245,249,0.75)] hover:text-[#a78bfa]">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back
        </Button>
      </div>
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pulse-glow"></div>
        <div
          className="absolute bottom-20 right-20 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl pulse-glow"
          style={{ animationDelay: "2s" }}
        ></div>
        <div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/5 rounded-full blur-2xl pulse-glow"
          style={{ animationDelay: "1s" }}
        ></div>
      </div>

      {/* Header */}
      <div className="relative z-10 pt-8 pb-12" data-reveal-block>
        <div className="text-center">
          <div className="inline-flex items-center justify-center mb-6">
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-br from-[#7c3aed] via-[#8b5cf6] to-[#4f46e5] rounded-2xl flex items-center justify-center shadow-2xl float-animation">
                <div className="w-16 h-16 bg-slate-900/80 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <span className="text-2xl font-bold neon-text">T</span>
                </div>
              </div>
              <div className="absolute -top-1 -right-1">
                <Sparkles className="w-6 h-6 text-yellow-400 animate-pulse" />
              </div>
            </div>
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-[#a78bfa] via-[#818cf8] to-[#c4b5fd] bg-clip-text text-transparent mb-3">
            Your Companies
          </h1>
          <p className="text-xl text-slate-300 mb-2">Manage your registered companies and campaigns</p>
          <p className="text-sm text-slate-400">Select a company to view analytics or create new campaigns</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {companies.length > 0 ? (
          <>
            {/* Companies Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {companies.map((company) => (
                <Card
                  key={company.id}
                  data-reveal-card
                  className="bg-slate-800/50 border-slate-600/30 backdrop-blur-sm shadow-2xl hover:shadow-purple-500/10 transition-all duration-300"
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-violet-500 rounded-lg flex items-center justify-center">
                          <Building2 className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-lg text-slate-100">{company.name}</CardTitle>
                          <CardDescription className="text-slate-400">{company.industry}</CardDescription>
                        </div>
                      </div>
                      <Badge
                        variant={company.status === "Active" ? "default" : "secondary"}
                        className={
                          company.status === "Active"
                            ? "bg-green-500/20 text-green-300 border-green-500/30"
                            : "bg-yellow-500/20 text-yellow-300 border-yellow-500/30"
                        }
                      >
                        {company.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-700/30 rounded-lg p-3 border border-slate-600/30">
                        <div className="flex items-center space-x-2">
                          <MessageSquare className="w-4 h-4 text-[#a78bfa]" />
                          <span className="text-xs text-slate-400">Campaigns</span>
                        </div>
                        <div className="text-xl font-bold text-slate-100 mt-1">{company.activeCampaigns}</div>
                      </div>
                      <div className="bg-slate-700/30 rounded-lg p-3 border border-slate-600/30">
                        <div className="flex items-center space-x-2">
                          <Users className="w-4 h-4 text-purple-400" />
                          <span className="text-xs text-slate-400">Feedbacks</span>
                        </div>
                        <div className="text-xl font-bold text-slate-100 mt-1">
                          {company.totalFeedbacks.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {/* Rating */}
                    <div className="bg-slate-700/30 rounded-lg p-3 border border-slate-600/30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <TrendingUp className="w-4 h-4 text-[#a78bfa]" />
                          <span className="text-sm text-slate-400">Average Rating</span>
                        </div>
                        <div className="text-lg font-bold text-[#a78bfa]">{company.avgRating}/5.0</div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-2 pt-2">
                      <Button
                        onClick={() => handleViewAnalysis(company.id)}
                        className="flex-1 bg-gradient-to-r from-[#7c3aed] to-[#4f46e5] hover:brightness-110 text-white font-medium"
                        size="sm"
                      >
                        <BarChart3 className="w-4 h-4 mr-2" />
                        View Analysis
                      </Button>
                      <Button
                        onClick={() => handleCreateCampaign(company.id)}
                        className="flex-1 bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 text-white font-medium"
                        size="sm"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        New Campaign
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Register New Company Button */}
            <div className="text-center">
              <Button
                onClick={handleRegisterCompany}
                className="bg-gradient-to-r from-[#7c3aed] to-[#4f46e5] hover:brightness-110 text-white font-medium px-8 py-3 border border-[rgba(139,92,246,0.35)]"
                size="lg"
              >
                <Plus className="w-5 h-5 mr-2" />
                Register New Company
              </Button>
            </div>
          </>
        ) : (
          /* No Companies State */
          <div className="text-center py-16">
            <Card className="backdrop-blur-sm shadow-2xl max-w-md mx-auto" data-reveal-card>
              <CardContent className="pt-8 pb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-violet-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Building2 className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-100 mb-4">No Companies Registered</h3>
                <p className="text-slate-400 mb-6">
                  Get started by registering your first company to create campaigns and collect feedback.
                </p>
                <Button
                  onClick={handleRegisterCompany}
                  className="bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 text-white font-medium px-8 py-3"
                  size="lg"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Register Company
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Platform Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto mt-16">
          <div className="text-center bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 p-6 rounded-lg">
            <div className="text-3xl font-bold bg-gradient-to-r from-[#a78bfa] to-[#818cf8] bg-clip-text text-transparent mb-2">
              1,340+
            </div>
            <div className="text-[#a78bfa] text-sm">Total Feedbacks</div>
          </div>
          <div className="text-center bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 p-6 rounded-lg">
            <div className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent mb-2">
              250+
            </div>
            <div className="text-purple-300 text-sm">Active Companies</div>
          </div>
          <div className="text-center bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 p-6 rounded-lg">
            <div className="text-3xl font-bold text-[#a78bfa] mb-2">50K+</div>
            <div className="text-[#c4b5fd] text-sm">Platform Users</div>
          </div>
          <div className="text-center bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 p-6 rounded-lg">
            <div className="text-3xl font-bold text-yellow-400 mb-2">2.5M</div>
            <div className="text-yellow-300 text-sm">Tokens Distributed</div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
        @keyframes float-animation {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .pulse-glow {
          animation: pulse-glow 4s ease-in-out infinite;
        }
        .float-animation {
          animation: float-animation 3s ease-in-out infinite;
        }
        .neon-text {
          text-shadow: 0 0 10px #8b5cf6, 0 0 20px #8b5cf6, 0 0 30px #8b5cf6;
        }
      `}</style>
    </div>
  )
}
