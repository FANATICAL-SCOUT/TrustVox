import { redirect } from "next/navigation"

export default function WalletLegacyRedirect() {
  redirect("/user/wallet")
}
