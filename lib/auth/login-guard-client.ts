// TrustVox — client helper for the login lockout guard.
// Thin wrappers around POST /api/login-guard used by both login pages so the
// lockout call sites stay identical. All the real logic + the secret key live
// server-side in the route; this just relays the result.

import { lockoutMessage } from "@/lib/auth/validation"

export type GuardResult = { locked: boolean; minutesLeft: number }

async function callGuard(email: string, action: "check" | "fail" | "success"): Promise<GuardResult> {
  try {
    const res = await fetch("/api/login-guard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, action }),
    })
    if (!res.ok) return { locked: false, minutesLeft: 0 }
    return (await res.json()) as GuardResult
  } catch {
    // If the guard is unreachable, fail open — never lock a user out because of
    // a network blip. The real credential check still runs regardless.
    return { locked: false, minutesLeft: 0 }
  }
}

export const checkLockout = (email: string) => callGuard(email, "check")
export const recordFailedLogin = (email: string) => callGuard(email, "fail")
export const clearLoginAttempts = (email: string) => callGuard(email, "success")

export { lockoutMessage }
