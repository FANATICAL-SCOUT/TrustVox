"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import UserNavbar from "@/components/user/user-navbar"
import LandingSection from "@/components/user/landing-section"
import SuggestedFeedback from "@/components/user/suggested-feedback"
import FeedbackHistory from "@/components/user/feedback-history"
import UserProfile from "@/components/user/user-profile"
import CompanyDetailsModal from "@/components/modals/company-details-modal"
import { getFeedbackQuota, subscribeToFeedbackQuotaUpdates } from "@/lib/feedback-quota"
import { refreshSystemNotifications, type UserNotification } from "@/lib/user-notifications"
import { hasUserSubmittedForm, type FeedbackHandoff } from "@/lib/feedback-store"
import { addBookmark } from "@/lib/bookmark-store"
import { createClient } from "@/lib/supabase/client"

async function resolveCurrentUserId(): Promise<string | null> {
  const supabase = createClient()
  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? null
}

export default function UserDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams()
  const [activeSection, setActiveSection] = useState("home");
  const [dailyFeedbackCount, setDailyFeedbackCount] = useState(3);
  const [dailyLimit, setDailyLimit] = useState(3);
  const [completedToday, setCompletedToday] = useState(0);
  const [canSubmitFeedback, setCanSubmitFeedback] = useState(true);
  const [quotaMessage, setQuotaMessage] = useState("");
  const [selectedCompanyForModal, setSelectedCompanyForModal] = useState<FeedbackHandoff | null>(null);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);

  useEffect(() => {
    const section = searchParams.get("section")
    if (section === "suggested" || section === "history" || section === "profile" || section === "home") {
      setActiveSection(section)
    }
  }, [searchParams])

  // Bookmark a form for later (real persistence — bookmarks table, Session 4).
  // Used by the landing/company-modal "Bookmark" buttons; Suggested toggles its
  // own via the store. Sends the user to History so they see the saved item.
  const handleBookmarkForm = async (feedback: FeedbackHandoff) => {
    const formId = feedback.formId || (typeof feedback.id === "string" ? feedback.id : undefined);
    if (!formId) return;
    try {
      await addBookmark(formId);
      setActiveSection("history");
    } catch {
      setQuotaMessage("Couldn't save that bookmark. Please try again.");
    }
  };

  const handleStartFeedbackFromSuggested = async (feedbackData?: FeedbackHandoff | null) => {
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
      const userId = await resolveCurrentUserId()
      if (userId && (await hasUserSubmittedForm(formId, userId))) {
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
      router.push(actionRoute || "/user/dashboard?section=suggested")
      return
    }

    if (notification.type === "streak_risk") {
      if (!canSubmitFeedback) {
        setQuotaMessage("Daily limit reached: free users can submit up to 3 feedbacks per day. Please come back tomorrow.")
        return
      }
      setQuotaMessage("")
      router.push(actionRoute || "/user/dashboard?section=suggested")
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
    const applyQuota = (quota: Awaited<ReturnType<typeof getFeedbackQuota>>) => {
      setDailyFeedbackCount(quota.remaining)
      setDailyLimit(quota.dailyLimit)
      setCompletedToday(quota.completedToday)
      setCanSubmitFeedback(quota.canSubmit)
      if (quota.canSubmit) {
        setQuotaMessage("")
      }
    }

    const loadQuota = () => void getFeedbackQuota().then(applyQuota)

    void refreshSystemNotifications()
    loadQuota()
    const unsubscribe = subscribeToFeedbackQuotaUpdates((quota) => {
      applyQuota(quota)
      void refreshSystemNotifications()
    })

    const handleFocus = () => {
      loadQuota()
      void refreshSystemNotifications()
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
            onSaveForLater={handleBookmarkForm}
            dailyFeedbackRemaining={dailyFeedbackCount}
            dailyFeedbackLimit={dailyLimit}
            completedToday={completedToday}
          />
        );
      case "suggested":
        return (
          <SuggestedFeedback
            handleStartFeedbackFromSuggested={handleStartFeedbackFromSuggested}
          />
        );
      case "history":
        return <FeedbackHistory />;
      case "profile":
        return <UserProfile router={router} />;
      default:
        return (
          <LandingSection
            handleStartFeedbackFromSuggested={handleStartFeedbackFromSuggested}
            setSelectedCompanyForModal={setSelectedCompanyForModal}
            setIsCompanyModalOpen={setIsCompanyModalOpen}
            onSaveForLater={handleBookmarkForm}
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
      <main className="pt-16">
        {quotaMessage ? (
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-20">
            <div className="rounded-lg border border-gold/30 bg-gold/10 px-4 py-3 text-sm text-gold">
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
          onSaveForLater={handleBookmarkForm}
        />
      )}
    </div>
  );
}
