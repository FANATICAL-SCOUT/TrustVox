"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Search, Filter, Calendar, BarChart3, Eye, Download, History, Star } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import DetailedReportModal from "@/components/modals/detailed-report-modal"

export default function PreviousCampaignsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [isDetailedReportModalOpen, setIsDetailedReportModalOpen] = useState(false)
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null)

  const campaigns = [
    {
      id: 1,
      title: "Product Launch Feedback - Q1 2024",
      product: "Trustvox Analytics Dashboard v1.0",
      date: "2024-03-15",
      status: "completed",
      feedbacks: 1200,
      averageRating: 4.7,
      positiveComments: [
        "The new dashboard is incredibly intuitive and easy to navigate.",
        "Love the real-time data visualization, it's a game-changer!",
        "Performance is excellent, very smooth experience.",
        "The dark mode option is a fantastic addition, easy on the eyes.",
        "Great job on the new features, especially the custom reports.",
        "User interface is clean and modern, a significant improvement.",
        "The integration with existing tools was seamless.",
        "Highly recommend this product for data analysis.",
        "Customer support has been very responsive and helpful.",
        "Excited to see future updates, keep up the great work!",
      ],
    },
    {
      id: 2,
      title: "Website Redesign Usability Test",
      product: "Trustvox Marketing Site",
      date: "2023-11-20",
      status: "completed",
      feedbacks: 850,
      averageRating: 4.2,
      positiveComments: [
        "The new design is much more visually appealing and professional.",
        "Navigation is clearer, finding information is easier now.",
        "The mobile responsiveness is excellent, works great on my phone.",
        "Improved loading times, very snappy.",
        "Content is well-organized and easy to read.",
        "The new contact form is very user-friendly.",
        "Overall a positive change, makes the brand look more modern.",
        "Found the case studies section particularly insightful.",
        "The blog section has great content.",
        "A very smooth and enjoyable browsing experience.",
      ],
    },
    {
      id: 3,
      title: "New Feature Pilot Program - AI Assistant",
      product: "Trustvox AI Feedback Assistant",
      date: "2024-05-01",
      status: "active",
      feedbacks: 300,
      averageRating: 4.9,
      positiveComments: [
        "The AI assistant is incredibly helpful for summarizing feedback.",
        "It saves so much time in identifying key themes.",
        "The sentiment analysis is surprisingly accurate.",
        "A powerful tool that enhances our feedback processing.",
        "Very impressed with its ability to understand complex comments.",
        "It's like having an extra team member for analysis.",
        "The suggestions for follow-up questions are brilliant.",
        "This feature alone justifies the platform's value.",
        "Seamless integration into the existing workflow.",
        "Looking forward to more AI-powered features!",
      ],
    },
    {
      id: 4,
      title: "Customer Support Experience Survey",
      product: "Trustvox Support Services",
      date: "2024-01-10",
      status: "completed",
      feedbacks: 1500,
      averageRating: 4.5,
      positiveComments: [
        "Support team was very knowledgeable and resolved my issue quickly.",
        "The response time was excellent, much faster than expected.",
        "Friendly and professional agents, a pleasure to interact with.",
        "Provided clear and concise solutions.",
        "Follow-up was thorough, ensuring everything was working.",
        "Highly satisfied with the level of service.",
        "They went above and beyond to help me.",
        "The online chat support is very efficient.",
        "Resolved my complex query with ease.",
        "A truly outstanding customer service experience.",
      ],
    },
    {
      id: 5,
      title: "Mobile App Beta Testing - iOS",
      product: "Trustvox Mobile App",
      date: "2024-06-20",
      status: "pending",
      feedbacks: 50,
      averageRating: 0, // No rating yet for pending
      positiveComments: [
        "The app interface is clean and modern.",
        "Smooth performance on my iPhone.",
        "Easy to navigate through different sections.",
        "Notifications are well-timed and useful.",
        "The overall user experience is very positive.",
        "Looking forward to the full release!",
        "Great potential for this app.",
        "Intuitive gestures and controls.",
        "The design is very appealing.",
        "A solid start for a mobile application.",
      ],
    },
  ]

  const filteredCampaigns = campaigns.filter((campaign) => {
    const matchesSearch =
      campaign.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      campaign.product.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === "all" || campaign.status === filterStatus
    return matchesSearch && matchesStatus
  })

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

  const handleViewDetailedReport = (campaign: any) => {
    setSelectedCampaign(campaign)
    setIsDetailedReportModalOpen(true)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden py-12">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pulse-glow"></div>
        <div
          className="absolute bottom-20 right-20 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pulse-glow"
          style={{ animationDelay: "2s" }}
        ></div>
        <div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-cyan-500/5 rounded-full blur-2xl pulse-glow"
          style={{ animationDelay: "1s" }}
        ></div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4">
          <div className="flex items-center text-center sm:text-left">
            <History className="w-8 h-8 text-purple-400 mr-4 flex-shrink-0" />
            <div>
              <h1 className="text-3xl font-bold text-slate-100">Previous Campaigns</h1>
              <p className="text-slate-300 mt-2">Review past feedback campaigns and their performance</p>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <Card className="bg-slate-800/50 border-slate-600/30 backdrop-blur-sm shadow-lg mb-8">
          <CardContent className="pt-6 flex flex-col md:flex-row items-center gap-4">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search campaigns by title or product..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 bg-slate-700/50 border-slate-600 text-slate-100 placeholder:text-slate-400 focus:border-purple-500 focus:ring-purple-500/20"
              />
            </div>
            <div className="w-full md:w-auto">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full md:w-[180px] bg-slate-700/50 border-slate-600 text-slate-100 focus:ring-purple-500/20">
                  <Filter className="w-4 h-4 mr-2 text-slate-400" />
                  <SelectValue placeholder="Filter by Status" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600 text-slate-100">
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Campaigns List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCampaigns.length > 0 ? (
            filteredCampaigns.map((campaign) => (
              <Card
                key={campaign.id}
                className="bg-slate-800/50 border-slate-600/30 backdrop-blur-sm shadow-lg hover:shadow-purple-500/10 transition-all duration-300"
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg text-slate-100">{campaign.title}</CardTitle>
                      <CardDescription className="text-slate-300">{campaign.product}</CardDescription>
                    </div>
                    <Badge className={`${getStatusColor(campaign.status)} font-medium`}>{campaign.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center text-sm text-slate-400">
                    <Calendar className="w-4 h-4 mr-2 text-purple-400" />
                    <span>Campaign Date: {campaign.date}</span>
                  </div>
                  <div className="flex items-center text-sm text-slate-400">
                    <BarChart3 className="w-4 h-4 mr-2 text-purple-400" />
                    <span>Feedbacks Collected: {campaign.feedbacks}</span>
                  </div>
                  {campaign.status === "completed" && (
                    <div className="flex items-center text-sm text-slate-400">
                      <Star className="w-4 h-4 mr-2 text-yellow-400" />
                      <span>Average Rating: {campaign.averageRating.toFixed(1)} / 5.0</span>
                    </div>
                  )}
                  <Separator className="bg-slate-700" />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDetailedReport(campaign)}
                      className="bg-slate-700/50 border-slate-600 text-slate-200 hover:bg-slate-600/50 font-medium"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Detailed Report
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-slate-700/50 border-slate-600 text-slate-200 hover:bg-slate-600/50 font-medium"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Export Data
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full text-center text-slate-400 py-8">
              No campaigns found matching your criteria.
            </div>
          )}
        </div>
      </div>

      {selectedCampaign && (
        <DetailedReportModal
          isOpen={isDetailedReportModalOpen}
          onClose={() => setIsDetailedReportModalOpen(false)}
          campaign={selectedCampaign}
        />
      )}

      <style jsx>{`
      @keyframes pulse-glow {
        0%, 100% { opacity: 0.3; }
        50% { opacity: 0.6; }
      }
      .pulse-glow {
        animation: pulse-glow 4s ease-in-out infinite;
      }
    `}</style>
    </div>
  )
}
