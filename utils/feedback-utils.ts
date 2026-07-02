// utils/feedback-utils.ts

// This function could be used to start feedback from a suggested item.
// For now, it just logs the feedback to the console.
export function handleStartFeedbackFromSuggested(feedback: any) {
  // Example: log or store feedback, or trigger navigation
  console.log("Starting feedback for:", feedback);
  // You could add logic to navigate or update state here
}

// This function could be used to set the active section in your UI.
// For now, it just logs the section name.
export function setActiveSection(section: string) {
  // Set active section: store in localStorage for persistence
  if (typeof window !== "undefined") {
    localStorage.setItem("activeSection", section);
  }
  console.log("Active section set to:", section);
}

// This function could be used to save a feedback draft for later.
// For now, it just logs the feedback to the console.
export function onSaveForLater(feedback: any) {
  // Save feedback for later: store in localStorage (or replace with real logic)
  if (typeof window !== "undefined") {
    let drafts: any[] = [];
    try {
      const parsed = JSON.parse(localStorage.getItem("feedbackDrafts") || "[]");
      drafts = Array.isArray(parsed) ? parsed : [];
    } catch {
      drafts = [];
    }
    drafts.push(feedback);
    localStorage.setItem("feedbackDrafts", JSON.stringify(drafts));
  }
  console.log("Saved feedback for later:", feedback);
}