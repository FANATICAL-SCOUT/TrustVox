"use client";

import UserProfile from "@/components/user-profile";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  // TODO: Replace the following with actual values as appropriate for your app
  const router = useRouter(); // Use Next.js router
  const savedFeedbacks: unknown[] = []; // Replace with actual saved feedbacks array and type
  const onContinueEditing = () => {}; // Replace with actual handler function

  return (
    <UserProfile
      router={router}
      savedFeedbacks={savedFeedbacks}
      onContinueEditing={onContinueEditing}
    />
  );
}
