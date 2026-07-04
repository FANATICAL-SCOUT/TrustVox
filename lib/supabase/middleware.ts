import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import type { Database } from "@/lib/supabase/types"

/**
 * Refreshes the Supabase auth cookie on every request and hands back the
 * response (with any refreshed cookies), a request-bound Supabase client, and
 * the current user. The root middleware.ts uses these to enforce the login
 * wall + role routing (ARCHITECTURE §5.4).
 *
 * Follows the @supabase/ssr Next.js pattern: nothing runs between creating the
 * client and calling getUser(), and cookie writes are mirrored onto the
 * response so the browser stays in sync.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  return { supabase, response, user }
}
