import type { Enums } from "@/lib/supabase/types"

/**
 * Role → landing route. The single source of truth for "where does each role
 * go after login" — used by the auth pages (client) and the middleware (server).
 */
export type AppRole = Enums<"user_role">

export const ROLE_HOME: Record<AppRole, string> = {
  user: "/user/dashboard",
  client: "/client/dashboard",
  admin: "/admin",
}

/** Generic, non-enumerating auth failure message. */
export const GENERIC_AUTH_ERROR = "Invalid credentials, or this account isn't authorized here."
