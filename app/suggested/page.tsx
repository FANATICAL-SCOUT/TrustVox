import { redirect } from "next/navigation"

export default function SuggestedPage() {
  redirect("/user/dashboard?section=suggested")
}
