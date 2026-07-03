import { redirect } from "next/navigation"

export default function StoreLegacyRedirect() {
  redirect("/user/store")
}
