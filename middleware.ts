import { NextResponse, type NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"
import { ROLE_HOME, type AppRole } from "@/lib/auth/roles"

// Login wall + role routing (ARCHITECTURE §5.4).
//
// Public: `/`, `/contact`, the auth pages, static assets (see matcher below).
// Gated by role: the three role groups below (incl. their legacy redirect shims).

// Auth pages: reachable while logged out; a logged-in user is bounced to their home.
const AUTH_PAGES = new Set(["/signin", "/login", "/signup", "/client-login", "/client-signup", "/admin-login"])

// Legacy redirect shims still forward to the new role routes, so they're gated too.
const USER_EXACT = new Set(["/user", "/dashboard", "/wallet", "/store", "/suggested", "/history", "/profile"])
const CLIENT_EXACT = new Set(["/client-home", "/client-dashboard"])
const ADMIN_EXACT = new Set(["/admin", "/admin-dashboard"])

/** Which role a path belongs to, or null if it's public. */
function gateFor(path: string): AppRole | null {
  if (USER_EXACT.has(path) || path.startsWith("/user/")) return "user"
  if (CLIENT_EXACT.has(path) || path.startsWith("/client/")) return "client"
  if (ADMIN_EXACT.has(path) || path.startsWith("/admin/")) return "admin"
  return null
}

export async function middleware(request: NextRequest) {
  const { supabase, response, user } = await updateSession(request)
  const path = request.nextUrl.pathname
  const gate = gateFor(path)
  const isAuthPage = AUTH_PAGES.has(path)

  const redirectTo = (target: string) => {
    const res = NextResponse.redirect(new URL(target, request.url))
    // Carry over any refreshed/cleared auth cookies from updateSession.
    response.cookies.getAll().forEach((cookie) => res.cookies.set(cookie))
    return res
  }

  // Logged out: gated routes hit the login wall; public + auth pages pass through.
  if (!user) {
    if (gate) return redirectTo("/signin")
    return response
  }

  // Logged in: resolve the real role + status from the profiles row.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("id", user.id)
    .single()

  // Blocked or missing profile → sign out and send to the login wall.
  if (!profile || profile.status === "blocked") {
    await supabase.auth.signOut()
    return redirectTo("/signin")
  }

  const home = ROLE_HOME[profile.role]

  // Already authenticated → auth pages redirect to your own home.
  if (isAuthPage) return redirectTo(home)

  // Gated route for a different role → bounce to your own home.
  if (gate && gate !== profile.role) return redirectTo(home)

  return response
}

export const config = {
  // Run on everything except Next internals, the signup API routes, and static files.
  matcher: [
    "/((?!_next/static|_next/image|api|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)",
  ],
}
