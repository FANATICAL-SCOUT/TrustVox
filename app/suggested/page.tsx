import { redirect } from "next/navigation"

export default function SuggestedPage() {
  redirect("/dashboard?section=suggested")
}
