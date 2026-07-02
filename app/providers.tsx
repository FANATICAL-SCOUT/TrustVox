import { ReactNode } from "react"
import { ClientAuthProvider } from "./client-auth-provider"

export function Providers({ children }: { children: ReactNode }) {
  return <ClientAuthProvider>{children}</ClientAuthProvider>
}
