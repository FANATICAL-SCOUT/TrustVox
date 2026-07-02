"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Star, Send, Save, XCircle, CheckCircle2, MessageSquare } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface SubmitFeedbackProps {
  dailyCount: number
  setDailyCount: (count: number) => void
  onSubmitSuccess: (feedbackData: any) => void
  initialFeedbackData?: any | null
  onFormReset: () => void
  onSaveAsDraft: (feedbackData: any) => void
}

export default function SubmitFeedback({
  dailyCount,
  setDailyCount,
  onSubmitSuccess,
  initialFeedbackData,
  onFormReset,
  onSaveAsDraft,
}: SubmitFeedbackProps) {
  const MAX_DAILY_FEEDBACKS = 3
  const [company, setCompany] = useState("")
  const [product, setProduct] = useState("")
  const [category, setCategory] = useState("")
  const [rating, setRating] = useState(0)
  const [feedbackText, setFeedbackText] = useState("")
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState("")

  useEffect(() => {
    if (initialFeedbackData) {
      setCompany(initialFeedbackData.company || "")
      setProduct(initialFeedbackData.product || "")
      setCategory(initialFeedbackData.category || "")
      setRating(initialFeedbackData.rating || 0)
      setFeedbackText(initialFeedbackData.feedback || "")
    }
  }, [initialFeedbackData])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError("")

    if (dailyCount >= MAX_DAILY_FEEDBACKS) {
      setSubmitError("You have reached your daily feedback limit. Please try again tomorrow!")
      return
    }

    if (!company || !product || !category || rating === 0 || !feedbackText) {
      setSubmitError("Please fill in all required fields and provide a rating.")
      return
    }

    // Simulate API call
    setTimeout(() => {
      const feedbackData = {
        id: initialFeedbackData?.id || Date.now(),
        company,
        product,
        category,
        rating,
        feedback: feedbackText,
        date: new Date().toISOString().split("T")[0],
        status: "approved",
      }
      setIsSubmitted(true)
      setDailyCount(dailyCount + 1)
      onSubmitSuccess(feedbackData)
      // Reset form after the success banner has been visible for 2.5s
      setTimeout(() => {
        resetForm()
      }, 2500)
    }, 800)
  }

  const handleSaveDraft = () => {
    const draftData = {
      id: initialFeedbackData?.id || Date.now(), // Keep ID if it was an existing draft
      company,
      product,
      category,
      rating,
      feedback: feedbackText,
      date: new Date().toISOString().split("T")[0],
      status: "draft",
    }
    onSaveAsDraft(draftData)
    resetForm()
    alert("Feedback saved as draft!")
  }

  const resetForm = () => {
    setCompany("")
    setProduct("")
    setCategory("")
    setRating(0)
    setFeedbackText("")
    setIsSubmitted(false)
    setSubmitError("")
    onFormReset() // Notify parent to reset initialFeedbackData
  }

  const progress = (dailyCount / MAX_DAILY_FEEDBACKS) * 100

  // Full-screen success panel shown after successful submission
  if (isSubmitted) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 animate-fade-up flex flex-col items-center justify-center min-h-[60vh]">
        <div className="app-card w-full max-w-lg text-center p-10">
          <div className="w-20 h-20 rounded-full bg-green-500/10 border-2 border-green-500/40 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-[var(--app-text-head)] mb-3">Feedback Submitted!</h2>
          <p className="text-[var(--app-text-body)] mb-2">
            Thank you for your valuable feedback on{" "}
            <span className="text-[var(--app-primary)] font-semibold">{company}</span>.
          </p>
          <p className="text-[var(--app-text-muted)] text-sm">Your TVX tokens will be credited shortly. Redirecting you back…</p>
          <div className="mt-6">
            <Progress value={100} className="h-1.5 bg-[var(--app-border)]" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-up">
      <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4">
        <div className="flex items-center text-center sm:text-left">
          <MessageSquare className="w-8 h-8 text-[var(--app-primary)] mr-4 flex-shrink-0" />
          <div>
            <h1 className="text-3xl font-bold text-[var(--app-text-head)]">Submit Feedback</h1>
            <p className="text-[var(--app-text-body)] mt-2">Share your experience and earn rewards</p>
          </div>
        </div>
        <div className="w-full sm:w-auto text-center sm:text-right">
          <p className="text-[var(--app-text-head)] font-medium mb-2">
            Feedbacks Today: {dailyCount} / {MAX_DAILY_FEEDBACKS}
          </p>
          <Progress value={progress} className="w-full h-2 bg-[var(--app-border)]" />
        </div>
      </div>

      {submitError && (
        <Alert variant="destructive" className="mb-6 bg-red-500/10 border-red-500/20">
          <XCircle className="h-4 w-4 text-red-400" />
          <AlertTitle className="text-red-300">Submission Error</AlertTitle>
          <AlertDescription className="text-red-300">{submitError}</AlertDescription>
        </Alert>
      )}

      {isSubmitted && (
        <Alert className="mb-6 bg-green-500/10 border-green-500/20">
          <CheckCircle2 className="h-4 w-4 text-green-400" />
          <AlertTitle className="text-green-300">Feedback Submitted!</AlertTitle>
          <AlertDescription className="text-green-300">
            Thank you for your valuable feedback. Your tokens will be credited shortly.
          </AlertDescription>
        </Alert>
      )}

      <Card className="app-card">
        <CardHeader>
          <CardTitle className="text-[var(--app-text-head)]">Feedback Details</CardTitle>
          <CardDescription className="text-[var(--app-text-body)]">
            Provide detailed information about your experience.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="company" className="text-[var(--app-text-head)] font-medium">
                Company Name *
              </Label>
              <Input
                id="company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g., Tech Innovations Inc."
                className="mt-1 app-input"
              />
            </div>
            <div>
              <Label htmlFor="product" className="text-[var(--app-text-head)] font-medium">
                Product/Service Name *
              </Label>
              <Input
                id="product"
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                placeholder="e.g., Quantum Leap Software"
                className="mt-1 app-input"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="category" className="text-[var(--app-text-head)] font-medium">
              Category *
            </Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full mt-1 app-input">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent className="bg-[var(--app-surface)] border-[var(--app-border)] text-[var(--app-text-head)]">
                <SelectItem value="Technology">Technology</SelectItem>
                <SelectItem value="Food & Beverage">Food & Beverage</SelectItem>
                <SelectItem value="Fashion">Fashion</SelectItem>
                <SelectItem value="Travel">Travel</SelectItem>
                <SelectItem value="Health & Fitness">Health & Fitness</SelectItem>
                <SelectItem value="Entertainment">Entertainment</SelectItem>
                <SelectItem value="Education">Education</SelectItem>
                <SelectItem value="Finance">Finance</SelectItem>
                <SelectItem value="Automotive">Automotive</SelectItem>
                <SelectItem value="Home Goods">Home Goods</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="rating" className="text-[var(--app-text-head)] font-medium">
              Your Rating * ({rating} Stars)
            </Label>
            <Slider
              id="rating"
              min={0}
              max={5}
              step={0.5}
              value={[rating]}
              onValueChange={(val) => setRating(val[0])}
              className="mt-4"
            />
            <div className="flex justify-between text-[var(--app-text-muted)] text-sm mt-2">
              <span>
                0 <Star className="inline-block w-3 h-3 mb-1" />
              </span>
              <span>
                1 <Star className="inline-block w-3 h-3 mb-1" />
              </span>
              <span>
                2 <Star className="inline-block w-3 h-3 mb-1" />
              </span>
              <span>
                3 <Star className="inline-block w-3 h-3 mb-1" />
              </span>
              <span>
                4 <Star className="inline-block w-3 h-3 mb-1" />
              </span>
              <span>
                5 <Star className="inline-block w-3 h-3 mb-1" />
              </span>
            </div>
          </div>

          <div>
            <Label htmlFor="feedbackText" className="text-[var(--app-text-head)] font-medium">
              Your Feedback *
            </Label>
            <Textarea
              id="feedbackText"
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Share your detailed experience, what you liked, disliked, and suggestions for improvement..."
              rows={6}
              className="mt-1 app-input"
            />
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              onClick={handleSaveDraft}
              variant="outline"
              className="app-btn-ghost font-medium"
            >
              <Save className="w-4 h-4 mr-2" />
              Save as Draft
            </Button>
            <Button
              type="submit"
              onClick={handleSubmit}
              className="app-btn-primary font-medium"
              disabled={dailyCount >= MAX_DAILY_FEEDBACKS}
            >
              <Send className="w-4 h-4 mr-2" />
              Submit Feedback
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
