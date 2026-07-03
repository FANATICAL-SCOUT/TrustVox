import { redirect } from "next/navigation"

export default function ProfilePage() {
  redirect("/user/dashboard?section=profile")
}
