"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Sparkles,
  Target,
  MessageSquare,
  Settings,
  Plus,
  X,
  Star,
  ShoppingBag,
  Headphones,
  Megaphone,
  ArrowRight,
  Calendar,
  DollarSign,
} from "lucide-react"
import { createForm, type Question } from "@/lib/feedback-store"

export default function CreateCampaign() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("basic")

  const [campaignData, setCampaignData] = useState({
    title: "",
    description: "",
    category: "",
    targetAudience: "",
    budget: "",
    duration: "",
    questions: [],
    tags: [],
  })

  const [customQuestion, setCustomQuestion] = useState("")
  const [newTag, setNewTag] = useState("")

  const questionTemplates = [
    {
      id: "product-review",
      name: "Product Review",
      icon: ShoppingBag,
      color: "from-blue-500 to-cyan-500",
      questions: [
        "How would you rate the overall quality of this product?",
        "What did you like most about this product?",
        "What could be improved about this product?",
        "Would you recommend this product to others?",
        "How does this product compare to similar products you've used?",
      ],
    },
    {
      id: "service-experience",
      name: "Service Experience",
      icon: Headphones,
      color: "from-green-500 to-emerald-500",
      questions: [
        "How satisfied were you with our service?",
        "How would you rate the responsiveness of our team?",
        "What aspects of our service exceeded your expectations?",
        "What areas of our service need improvement?",
        "How likely are you to use our service again?",
      ],
    },
    {
      id: "brand-awareness",
      name: "Brand Awareness",
      icon: Megaphone,
      color: "from-purple-500 to-violet-500",
      questions: [
        "How did you first hear about our brand?",
        "What comes to mind when you think of our brand?",
        "How would you describe our brand to a friend?",
        "What makes our brand different from competitors?",
        "How likely are you to recommend our brand to others?",
      ],
    },
  ]

  const categories = [
    "Technology",
    "Food & Beverage",
    "Entertainment",
    "Travel & Tourism",
    "Fashion & Retail",
    "Health & Fitness",
    "Education",
    "Finance",
    "Other",
  ]

  const handleInputChange = (field, value) => {
    setCampaignData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleTemplateSelect = (template) => {
    setCampaignData((prev) => ({
      ...prev,
      questions: [...prev.questions, ...template.questions],
    }))
  }

  const addCustomQuestion = () => {
    if (customQuestion.trim()) {
      setCampaignData((prev) => ({
        ...prev,
        questions: [...prev.questions, customQuestion.trim()],
      }))
      setCustomQuestion("")
    }
  }

  const removeQuestion = (index) => {
    setCampaignData((prev) => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index),
    }))
  }

  const addTag = () => {
    if (newTag.trim() && !campaignData.tags.includes(newTag.trim())) {
      setCampaignData((prev) => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()],
      }))
      setNewTag("")
    }
  }

  const removeTag = (tagToRemove) => {
    setCampaignData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }))
  }

  const handleSubmit = () => {
    const storedClientRaw = typeof window !== "undefined" ? localStorage.getItem("currentClient") : null
    const storedClient = storedClientRaw ? JSON.parse(storedClientRaw) : null
    const companyName = storedClient?.companyName || "TrustVox Client"

    const normalizedQuestions: Question[] = campaignData.questions.map((question: string, index: number) => ({
      id: `q-${Date.now()}-${index + 1}`,
      type: "text-long",
      title: question,
      required: true,
      options: [],
    }))

    createForm({
      title: campaignData.title,
      description: campaignData.description,
      product: campaignData.title,
      category: campaignData.category,
      categoryDetails: campaignData.tags.join(", "),
      questions: normalizedQuestions,
      status: "draft",
      clientId: "client-1",
      clientName: companyName,
      responseCount: 0,
    })

    router.push("/client/analytics")
  }

  const isBasicValid = campaignData.title && campaignData.description && campaignData.category
  const isQuestionsValid = campaignData.questions.length > 0
  const isSettingsValid = campaignData.budget && campaignData.duration

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl pulse-glow"></div>
        <div
          className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pulse-glow"
          style={{ animationDelay: "2s" }}
        ></div>
        <div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-cyan-500/5 rounded-full blur-2xl pulse-glow"
          style={{ animationDelay: "1s" }}
        ></div>
      </div>

      {/* Header */}
      <div className="relative z-10 pt-8 pb-12">
        <div className="text-center">
          <div className="inline-flex items-center justify-center mb-6">
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-br from-teal-400 via-cyan-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl float-animation">
                <div className="w-16 h-16 bg-slate-900/80 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <span className="text-2xl font-bold neon-text">T</span>
                </div>
              </div>
              <div className="absolute -top-1 -right-1">
                <Sparkles className="w-6 h-6 text-yellow-400 animate-pulse" />
              </div>
            </div>
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-teal-400 via-cyan-300 to-purple-400 bg-clip-text text-transparent mb-3">
            Create Campaign
          </h1>
          <p className="text-xl text-slate-300 mb-2">Design your feedback collection campaign</p>
          <p className="text-sm text-slate-400">Gather valuable insights from your target audience</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="grid w-full grid-cols-3 bg-slate-800/50 border border-slate-600/30">
            <TabsTrigger
              value="basic"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white"
            >
              <Target className="w-4 h-4 mr-2" />
              Basic Info
            </TabsTrigger>
            <TabsTrigger
              value="questions"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-500 data-[state=active]:text-white"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Questions
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-500 data-[state=active]:text-white"
            >
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Basic Information Tab */}
          <TabsContent value="basic" className="space-y-6">
            <Card className="bg-slate-800/50 border-slate-600/30 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-slate-100 flex items-center">
                  <Target className="w-5 h-5 mr-2 text-teal-400" />
                  Campaign Details
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Define the basic information for your feedback campaign
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="title" className="text-slate-200 font-medium">
                    Campaign Title *
                  </Label>
                  <Input
                    id="title"
                    value={campaignData.title}
                    onChange={(e) => handleInputChange("title", e.target.value)}
                    placeholder="e.g., New Product Feedback Collection"
                    className="mt-1 bg-slate-800/50 border-slate-600 text-slate-100 placeholder:text-slate-400 focus:border-teal-500 focus:ring-teal-500/20"
                  />
                </div>

                <div>
                  <Label htmlFor="description" className="text-slate-200 font-medium">
                    Description *
                  </Label>
                  <Textarea
                    id="description"
                    value={campaignData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    placeholder="Describe what you want to learn from this campaign..."
                    rows={4}
                    className="mt-1 bg-slate-800/50 border-slate-600 text-slate-100 placeholder:text-slate-400 focus:border-teal-500 focus:ring-teal-500/20"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="category" className="text-slate-200 font-medium">
                      Category *
                    </Label>
                    <select
                      id="category"
                      value={campaignData.category}
                      onChange={(e) => handleInputChange("category", e.target.value)}
                      className="w-full mt-1 p-3 bg-slate-800/50 border border-slate-600 rounded-md text-slate-100 focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 focus:outline-none"
                    >
                      <option value="">Select category</option>
                      {categories.map((category) => (
                        <option key={category} value={category} className="bg-slate-800">
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="audience" className="text-slate-200 font-medium">
                      Target Audience
                    </Label>
                    <Input
                      id="audience"
                      value={campaignData.targetAudience}
                      onChange={(e) => handleInputChange("targetAudience", e.target.value)}
                      placeholder="e.g., Young professionals, Tech enthusiasts"
                      className="mt-1 bg-slate-800/50 border-slate-600 text-slate-100 placeholder:text-slate-400 focus:border-teal-500 focus:ring-teal-500/20"
                    />
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <Label className="text-slate-200 font-medium">Tags</Label>
                  <div className="mt-2 space-y-3">
                    <div className="flex space-x-2">
                      <Input
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        placeholder="Add a tag..."
                        className="flex-1 bg-slate-800/50 border-slate-600 text-slate-100 placeholder:text-slate-400 focus:border-teal-500 focus:ring-teal-500/20"
                        onKeyPress={(e) => e.key === "Enter" && addTag()}
                      />
                      <Button onClick={addTag} size="sm" className="bg-teal-500 hover:bg-teal-600 text-white">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    {campaignData.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {campaignData.tags.map((tag, index) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="bg-slate-700/50 text-slate-200 border-slate-600"
                          >
                            {tag}
                            <button onClick={() => removeTag(tag)} className="ml-2 text-slate-400 hover:text-slate-200">
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Questions Tab */}
          <TabsContent value="questions" className="space-y-6">
            {/* Question Templates */}
            <Card className="bg-slate-800/50 border-slate-600/30 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-slate-100 flex items-center">
                  <MessageSquare className="w-5 h-5 mr-2 text-purple-400" />
                  Question Templates
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Choose from pre-built question sets or create your own
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {questionTemplates.map((template) => (
                    <Card
                      key={template.id}
                      className="bg-slate-700/30 border-slate-600/30 hover:border-slate-500/50 transition-colors cursor-pointer"
                    >
                      <CardContent className="p-4">
                        <div className="text-center space-y-3">
                          <div
                            className={`w-12 h-12 bg-gradient-to-r ${template.color} rounded-lg flex items-center justify-center mx-auto`}
                          >
                            <template.icon className="w-6 h-6 text-white" />
                          </div>
                          <h3 className="font-medium text-slate-200">{template.name}</h3>
                          <p className="text-xs text-slate-400">{template.questions.length} questions</p>
                          <Button
                            onClick={() => handleTemplateSelect(template)}
                            size="sm"
                            className={`w-full bg-gradient-to-r ${template.color} hover:opacity-90 text-white`}
                          >
                            Add Template
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Custom Questions */}
            <Card className="bg-slate-800/50 border-slate-600/30 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-slate-100">Custom Questions</CardTitle>
                <CardDescription className="text-slate-400">Add your own specific questions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex space-x-2">
                  <Input
                    value={customQuestion}
                    onChange={(e) => setCustomQuestion(e.target.value)}
                    placeholder="Enter your custom question..."
                    className="flex-1 bg-slate-800/50 border-slate-600 text-slate-100 placeholder:text-slate-400 focus:border-purple-500 focus:ring-purple-500/20"
                    onKeyPress={(e) => e.key === "Enter" && addCustomQuestion()}
                  />
                  <Button onClick={addCustomQuestion} className="bg-purple-500 hover:bg-purple-600 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Add
                  </Button>
                </div>

                {/* Questions List */}
                {campaignData.questions.length > 0 && (
                  <div className="space-y-3">
                    <Separator className="bg-slate-600" />
                    <h4 className="font-medium text-slate-200">Campaign Questions ({campaignData.questions.length})</h4>
                    <div className="space-y-2">
                      {campaignData.questions.map((question, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg border border-slate-600/30"
                        >
                          <span className="text-slate-200 text-sm">{question}</span>
                          <Button
                            onClick={() => removeQuestion(index)}
                            size="sm"
                            variant="ghost"
                            className="text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card className="bg-slate-800/50 border-slate-600/30 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-slate-100 flex items-center">
                  <Settings className="w-5 h-5 mr-2 text-cyan-400" />
                  Campaign Settings
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Configure budget, duration, and other campaign parameters
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="budget" className="text-slate-200 font-medium flex items-center">
                      <DollarSign className="w-4 h-4 mr-1 text-green-400" />
                      Budget (USD) *
                    </Label>
                    <Input
                      id="budget"
                      type="number"
                      value={campaignData.budget}
                      onChange={(e) => handleInputChange("budget", e.target.value)}
                      placeholder="1000"
                      className="mt-1 bg-slate-800/50 border-slate-600 text-slate-100 placeholder:text-slate-400 focus:border-cyan-500 focus:ring-cyan-500/20"
                    />
                    <p className="text-xs text-slate-400 mt-1">Minimum budget: $100</p>
                  </div>
                  <div>
                    <Label htmlFor="duration" className="text-slate-200 font-medium flex items-center">
                      <Calendar className="w-4 h-4 mr-1 text-blue-400" />
                      Duration (Days) *
                    </Label>
                    <Input
                      id="duration"
                      type="number"
                      value={campaignData.duration}
                      onChange={(e) => handleInputChange("duration", e.target.value)}
                      placeholder="30"
                      className="mt-1 bg-slate-800/50 border-slate-600 text-slate-100 placeholder:text-slate-400 focus:border-cyan-500 focus:ring-cyan-500/20"
                    />
                    <p className="text-xs text-slate-400 mt-1">Recommended: 7-30 days</p>
                  </div>
                </div>

                {/* Campaign Summary */}
                <div className="bg-slate-700/30 rounded-lg p-6 border border-slate-600/30">
                  <h3 className="font-semibold text-slate-200 mb-4 flex items-center">
                    <Star className="w-4 h-4 mr-2 text-yellow-400" />
                    Campaign Summary
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-400">Title:</span>
                      <p className="text-slate-200 font-medium">{campaignData.title || "Not set"}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Category:</span>
                      <p className="text-slate-200 font-medium">{campaignData.category || "Not set"}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Questions:</span>
                      <p className="text-slate-200 font-medium">{campaignData.questions.length} questions</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Budget:</span>
                      <p className="text-slate-200 font-medium">${campaignData.budget || "0"}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Navigation */}
          <div className="flex justify-between items-center pt-6">
            <Button
              onClick={() => router.back()}
              variant="outline"
              className="bg-slate-700/50 border-slate-600 text-slate-200 hover:bg-slate-600/50"
            >
              Cancel
            </Button>

            <div className="flex space-x-3">
              {activeTab !== "settings" && (
                <Button
                  onClick={() => {
                    if (activeTab === "basic" && isBasicValid) setActiveTab("questions")
                    if (activeTab === "questions" && isQuestionsValid) setActiveTab("settings")
                  }}
                  disabled={
                    (activeTab === "basic" && !isBasicValid) || (activeTab === "questions" && !isQuestionsValid)
                  }
                  className="bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 text-white font-medium"
                >
                  Next Step
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}

              {activeTab === "settings" && (
                <Button
                  onClick={handleSubmit}
                  disabled={!isBasicValid || !isQuestionsValid || !isSettingsValid}
                  className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-medium"
                >
                  Request Campaign
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </Tabs>
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
          text-shadow: 0 0 10px #14b8a6, 0 0 20px #14b8a6, 0 0 30px #14b8a6;
        }
      `}</style>
    </div>
  )
}
