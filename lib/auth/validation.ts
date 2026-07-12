// TrustVox — shared auth validation
//
// Single source of truth for the registration password policy, the password
// strength meter, and the 16+ age gate. Used by BOTH the client-side auth pages
// (live feedback while typing) AND the server-side register routes (zod refine),
// so the browser and the trusted server path can never disagree on the rules.

/** Registration password policy: ≥8 chars, ≥1 uppercase, ≥1 special char. */
export const PASSWORD_MIN_LENGTH = 8

export interface PasswordChecks {
  length: boolean
  uppercase: boolean
  special: boolean
}

const SPECIAL_CHAR = /[^A-Za-z0-9]/

/** Which individual rules a password currently satisfies (for the live meter). */
export function checkPassword(password: string): PasswordChecks {
  return {
    length: password.length >= PASSWORD_MIN_LENGTH,
    uppercase: /[A-Z]/.test(password),
    special: SPECIAL_CHAR.test(password),
  }
}

/** True only when every policy rule passes. */
export function isPasswordValid(password: string): boolean {
  const c = checkPassword(password)
  return c.length && c.uppercase && c.special
}

/** Human-readable list of the policy rules, in display order. */
export const PASSWORD_RULES: { key: keyof PasswordChecks; label: string }[] = [
  { key: "length", label: "At least 8 characters" },
  { key: "uppercase", label: "One uppercase letter" },
  { key: "special", label: "One special character" },
]

/** The single message shown when a password fails the policy (server + client). */
export const PASSWORD_POLICY_MESSAGE =
  "Password must be at least 8 characters and include one uppercase letter and one special character."

// ─── Strength meter (red → green) ────────────────────────────────────────────
// A 0–4 score: the 3 policy rules plus a bonus for a longer password, mapped to
// a label + colour so the meter fills and shifts hue as the password improves.

export type PasswordStrength = {
  score: 0 | 1 | 2 | 3 | 4
  label: string
  /** Tailwind bg-* token for the filled portion of the meter. */
  barClass: string
  /** Tailwind text-* token for the label. */
  textClass: string
}

export function getPasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return { score: 0, label: "", barClass: "bg-white/10", textClass: "text-ink-muted" }
  }

  const c = checkPassword(password)
  let score = 0
  if (c.length) score++
  if (c.uppercase) score++
  if (c.special) score++
  if (password.length >= 12) score++ // length bonus once all rules can be met

  // Clamp to 4.
  const clamped = Math.min(score, 4) as 0 | 1 | 2 | 3 | 4

  switch (clamped) {
    case 0:
    case 1:
      return { score: clamped, label: "Weak", barClass: "bg-rose", textClass: "text-rose" }
    case 2:
      return { score: clamped, label: "Fair", barClass: "bg-gold-deep", textClass: "text-gold-deep" }
    case 3:
      return { score: clamped, label: "Good", barClass: "bg-gold", textClass: "text-gold" }
    case 4:
      return { score: clamped, label: "Strong", barClass: "bg-mint", textClass: "text-mint" }
  }
}

// ─── Age gate (16+) ──────────────────────────────────────────────────────────

export const MIN_AGE_YEARS = 16

export const UNDERAGE_MESSAGE = `You must be at least ${MIN_AGE_YEARS} years old to register.`
export const INVALID_DOB_MESSAGE = "Please enter a valid date of birth."

/** Exact age in whole years for a `YYYY-MM-DD` string, or null if unparseable / future. */
export function ageFromDob(dob: string): number | null {
  if (!dob) return null
  // Expect an ISO calendar date (what <input type="date"> emits).
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob.trim())
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])

  const birth = new Date(year, month - 1, day)
  // Reject impossible dates (e.g. 2023-02-30 rolls over) and future dates.
  if (
    birth.getFullYear() !== year ||
    birth.getMonth() !== month - 1 ||
    birth.getDate() !== day
  ) {
    return null
  }

  const now = new Date()
  if (birth > now) return null

  let age = now.getFullYear() - birth.getFullYear()
  const monthDiff = now.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    age--
  }
  return age
}

/** True when the DOB is a valid date and the person is at least 16. */
export function isOldEnough(dob: string): boolean {
  const age = ageFromDob(dob)
  return age !== null && age >= MIN_AGE_YEARS
}

// ─── Login lockout ───────────────────────────────────────────────────────────
// Student-project scope: after MAX_LOGIN_ATTEMPTS failed sign-ins for an email
// within the window, that email is locked out for LOCKOUT_MINUTES. Fixed 5 min,
// no doubling backoff (user decision, 2026-07-05).

export const MAX_LOGIN_ATTEMPTS = 5
export const LOCKOUT_MINUTES = 5

/** Message shown while an email is in lockout. */
export function lockoutMessage(minutesLeft: number): string {
  const m = Math.max(1, minutesLeft)
  return `Too many failed attempts. Please try again in ${m} minute${m === 1 ? "" : "s"}.`
}

// ─── Gender ──────────────────────────────────────────────────────────────────

export const GENDER_OPTIONS = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "non_binary", label: "Non-binary" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
] as const

export type Gender = (typeof GENDER_OPTIONS)[number]["value"]

export const GENDER_VALUES = GENDER_OPTIONS.map((o) => o.value) as [Gender, ...Gender[]]
