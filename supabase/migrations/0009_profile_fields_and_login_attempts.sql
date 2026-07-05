-- TrustVox — Phase 9 · Session 1 · Migration 0009: profile DOB/gender + login lockout
-- Design source of truth: docs/backend/ARCHITECTURE.md §4; docs/frontend/PHASE-9-QA-REDESIGN.md Session 1.
-- Run AFTER 0008.
--
-- Two unrelated Session-1 needs, bundled into one migration:
--   1. profiles gains `dob` (date) + `gender` (text, constrained) — collected at
--      user registration. Written by the trusted /api/register-user route with the
--      secret key (the handle_new_user trigger only fills id/email/display_name/role).
--   2. a `login_attempts` table backing a simple brute-force lockout: 5 failed
--      sign-ins for an email within the window => that email is locked out for 5
--      minutes (student-project scope — fixed 5 min, no doubling backoff).
--
-- SECURITY: login_attempts is checked/written BEFORE a user is authenticated
-- (their credentials may be wrong), so there is no auth.uid() to gate it and it
-- CANNOT be an authenticated-only RLS path. It is therefore service-role-only:
-- RLS is enabled with NO policies (so anon/authenticated get zero access), and
-- only the /api/login-guard route (secret key, bypasses RLS) ever touches it.
-- No email enumeration risk — the route returns a generic locked/allowed signal,
-- never "this email exists".

-- ─── 1. profiles: dob + gender ──────────────────────────────────────────────
alter table public.profiles
  add column if not exists dob    date,
  add column if not exists gender text
    check (gender is null or gender in ('female', 'male', 'non_binary', 'prefer_not_to_say'));

-- ─── 2. login_attempts (brute-force lockout) ────────────────────────────────
-- One row per failed attempt. Email is lower-cased by the route before insert so
-- the count is case-insensitive. Successful logins clear the email's rows.
create table if not exists public.login_attempts (
  id         uuid primary key default gen_random_uuid(),
  email      text        not null,
  created_at timestamptz not null default now()
);

create index if not exists login_attempts_email_time_idx
  on public.login_attempts (email, created_at desc);

-- Lock the table down completely at the RLS layer. No policies => no access for
-- anon or authenticated. Only the service_role (login-guard route) can read/write.
alter table public.login_attempts enable row level security;

revoke all on public.login_attempts from anon, authenticated;
grant all on public.login_attempts to service_role;
