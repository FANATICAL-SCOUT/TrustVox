"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import UserNavbar from "@/components/user-navbar"
import LandingSection from "@/components/landing-section"
import SuggestedFeedback from "@/components/suggested-feedback"
import FeedbackHistory from "@/components/feedback-history"
import UserProfile from "@/components/user-profile"
import CompanyDetailsModal from "@/components/modals/company-details-modal"
import { getFeedbackQuota, subscribeToFeedbackQuotaUpdates } from "@/lib/feedback-quota"
import { refreshSystemNotifications, type UserNotification } from "@/lib/user-notifications"
import { hasUserSubmittedForm } from "@/lib/feedback-store"

function resolveCurrentUserId() {
  if (typeof window === "undefined") return "anonymous"

  try {
    const currentUserRaw = localStorage.getItem("currentUser")
    if (currentUserRaw) {
      const parsed = JSON.parse(currentUserRaw) as { email?: string; name?: string }
      const fromCurrentUser = String(parsed.email || parsed.name || "").trim().toLowerCase()
      if (fromCurrentUser) return fromCurrentUser
    }

    const userEmail = String(localStorage.getItem("userEmail") || "").trim().toLowerCase()
    if (userEmail) return userEmail
  } catch {
    // Fall through to anonymous identifier.
  }

  return "anonymous"
}

export default function UserDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams()
  const [activeSection, setActiveSection] = useState("home");
  const [dailyFeedbackCount, setDailyFeedbackCount] = useState(getFeedbackQuota().remaining);
  const [dailyLimit, setDailyLimit] = useState(getFeedbackQuota().dailyLimit);
  const [completedToday, setCompletedToday] = useState(getFeedbackQuota().completedToday);
  const [canSubmitFeedback, setCanSubmitFeedback] = useState(getFeedbackQuota().canSubmit);
  const [quotaMessage, setQuotaMessage] = useState("");
  const [savedFeedbacks, setSavedFeedbacks] = useState<any[]>([]); // State for saved feedbacks (drafts)
  const [selectedCompanyForModal, setSelectedCompanyForModal] = useState<any>(null);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);

  useEffect(() => {
    const section = searchParams.get("section")
    if (section === "suggested" || section === "history" || section === "profile" || section === "home") {
      setActiveSection(section)
    }
  }, [searchParams])

  const addOrUpdateSavedFeedback = (feedback: any) => {
    setSavedFeedbacks((prev) => {
      if (feedback.id && prev.some((f) => f.id === feedback.id)) {
        // Update existing draft
        return prev.map((f) => (f.id === feedback.id ? { ...feedback, status: "draft" } : f));
      } else {
        // Add new draft
        return [{ ...feedback, id: Date.now(), status: "draft" }, ...prev];
      }
    });
    setActiveSection("history"); // Route to history page after saving draft
  };

  const removeSavedFeedback = (id: number) => {
    setSavedFeedbacks((prev) => prev.filter((f) => f.id !== id));
  };

  const handleStartFeedbackFromSuggested = (feedbackData: any) => {
    if (!canSubmitFeedback) {
      setQuotaMessage("Daily limit reached: free users can submit up to 3 feedbacks per day. Please come back tomorrow.")
      return
    }

    setQuotaMessage("")

    if (!feedbackData) {
      setActiveSection("suggested");
      return;
    }

    const formId = feedbackData.formId || feedbackData.id
    if (typeof formId === "string" && formId.length > 0) {
      const userId = resolveCurrentUserId()
      if (hasUserSubmittedForm(formId, userId)) {
        setQuotaMessage("Blocked: you can fill each feedback form only once per account.")
        return
      }
      router.push(`/user/feedback/${formId}`)
      return
    }

    setSelectedCompanyForModal(feedbackData)
    setIsCompanyModalOpen(true)
  };

  // Function to handle viewing notifications
  const handleViewNotification = (notification: UserNotification) => {
    const actionRoute = notification.action?.route

    if (notification.type === "new_opportunity") {
      if (!canSubmitFeedback) {
        setQuotaMessage("Daily limit reached: free users can submit up to 3 feedbacks per day. Please come back tomorrow.")
        return
      }
      setQuotaMessage("")
      router.push(actionRoute || "/user/feedbacks")
      return
    }

    if (notification.type === "streak_risk") {
      if (!canSubmitFeedback) {
        setQuotaMessage("Daily limit reached: free users can submit up to 3 feedbacks per day. Please come back tomorrow.")
        return
      }
      setQuotaMessage("")
      router.push(actionRoute || "/user/feedbacks")
      return
    }

    if (notification.type === "reward_pending" || notification.type === "reward_credited") {
      setActiveSection("history")
      return
    }

    if (actionRoute) {
      router.push(actionRoute)
    }
  };

  useEffect(() => {
    const applyQuota = () => {
      const quota = getFeedbackQuota()
      setDailyFeedbackCount(quota.remaining)
      setDailyLimit(quota.dailyLimit)
      setCompletedToday(quota.completedToday)
      setCanSubmitFeedback(quota.canSubmit)
      if (quota.canSubmit) {
        setQuotaMessage("")
      }
    }

    refreshSystemNotifications()
    applyQuota()
    const unsubscribe = subscribeToFeedbackQuotaUpdates(() => {
      applyQuota()
      refreshSystemNotifications()
    })

    const handleFocus = () => {
      applyQuota()
      refreshSystemNotifications()
    }

    window.addEventListener("focus", handleFocus)

    return () => {
      unsubscribe()
      window.removeEventListener("focus", handleFocus)
    }
  }, [])

  const renderActiveSection = () => {
    switch (activeSection) {
      case "home":
        return (
          <LandingSection
            handleStartFeedbackFromSuggested={handleStartFeedbackFromSuggested}
            setSelectedCompanyForModal={setSelectedCompanyForModal}
            setIsCompanyModalOpen={setIsCompanyModalOpen}
            onSaveForLater={addOrUpdateSavedFeedback}
            dailyFeedbackRemaining={dailyFeedbackCount}
            dailyFeedbackLimit={dailyLimit}
            completedToday={completedToday}
          />
        );
      case "suggested":
        return (
          <SuggestedFeedback
            handleStartFeedbackFromSuggested={handleStartFeedbackFromSuggested}
            onSaveForLater={addOrUpdateSavedFeedback}
          />
        );
      case "history":
        return (
          <FeedbackHistory
            newFeedbacks={[]}
            savedFeedbacks={savedFeedbacks}
            onContinueEditing={handleStartFeedbackFromSuggested}
            onStartFeedback={handleStartFeedbackFromSuggested}
            onSaveForLater={addOrUpdateSavedFeedback}
          />
        );
      case "profile":
        return (
          <UserProfile
            router={router}
            savedFeedbacks={savedFeedbacks}
            onContinueEditing={handleStartFeedbackFromSuggested}
          />
        );
      default:
        return (
          <LandingSection
            handleStartFeedbackFromSuggested={handleStartFeedbackFromSuggested}
            setSelectedCompanyForModal={setSelectedCompanyForModal}
            setIsCompanyModalOpen={setIsCompanyModalOpen}
            onSaveForLater={addOrUpdateSavedFeedback}
            dailyFeedbackRemaining={dailyFeedbackCount}
            dailyFeedbackLimit={dailyLimit}
            completedToday={completedToday}
          />
        );
    }
  };

  return (
    <div className="min-h-screen">
      <UserNavbar
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        dailyFeedbackCount={dailyFeedbackCount}
        onViewNotification={handleViewNotification}
      />
      <main className={activeSection === "home" ? "pt-0" : "pt-16"}>
        {quotaMessage ? (
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-20">
            <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              {quotaMessage}
            </div>
          </div>
        ) : null}
        <div className="min-h-[calc(100vh-4rem)]">{renderActiveSection()}</div>
      </main>

      {/* Company Details Modal (centralized) */}
      {selectedCompanyForModal && (
        <CompanyDetailsModal
          isOpen={isCompanyModalOpen}
          onClose={() => setIsCompanyModalOpen(false)}
          company={selectedCompanyForModal}
          onStartFeedback={handleStartFeedbackFromSuggested}
          onSaveForLater={addOrUpdateSavedFeedback}
        />
      )}
    </div>
  );
}
