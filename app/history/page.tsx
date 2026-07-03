import { redirect } from "next/navigation"

export default function HistoryPage() {
  redirect("/user/dashboard?section=history")
}
