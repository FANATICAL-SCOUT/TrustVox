import { NextResponse, type NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"
import { ROLE_HOME, type AppRole } from "@/lib/auth/roles"

// Login wall + role routing.
//
// Public: `/`, `/contact`, the auth pages, static assets (see matcher below).
// Gated by role: the three role groups below.

// Auth pages: reachable while logged out; a logged-in user is bounced to their home.
// `/signin` is the exception — it's the role-choice screen, so a logged-in user is
// allowed through to it (it offers a one-click "continue as X" for their live
// session AND a door to the other role). It's excluded from AUTH_PAGES for that reason.
const AUTH_PAGES = new Set(["/login", "/signup", "/client-login", "/client-signup", "/admin-login"])

/** Which role a path belongs to, or null if it's public. */
function gateFor(path: string): AppRole | null {
  if (path === "/user" || path.startsWith("/user/")) return "user"
  if (path.startsWith("/client/")) return "client"
  if (path === "/admin" || path.startsWith("/admin/")) return "admin"
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

  // The role/status lookup only affects the outcome on an auth page (redirect
  // home) or a gated route (enforce role + blocked-status). On a public,
  // non-auth path the result is unused, so skip that round-trip entirely —
  // every gated route and auth page still does the full check, so the
  // blocked-status security control is unchanged.
  if (!gate && !isAuthPage) return response

  // Logged in + a path where role/status matters: resolve them from profiles.
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

  // Landing on an explicit login/signup door while a session is still live means
  // the visitor deliberately wants to sign in — commonly as a *different* role
  // (e.g. a User who now wants the Client door). Don't silently bounce them into
  // the stale session's home; drop that session so the fresh login form loads.
  // `/signin` (the role picker) is not in AUTH_PAGES precisely so it keeps the
  // live session and can still offer "continue as X".
  if (isAuthPage) {
    await supabase.auth.signOut()
    return redirectTo(path)
  }

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
