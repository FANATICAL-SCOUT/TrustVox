-- TrustVox — Migration 0016: IP-scoped login lockout
-- Run AFTER 0015.
--
-- login_attempts previously locked purely on email: an attacker who knows a
-- victim's email could POST repeated failures for that email and lock the
-- real owner out, without ever attempting the real sign-in themselves. Adding
-- the request IP lets /api/login-guard require the failures to come from a
-- consistent source before it locks the account, closing that account-lockout
-- denial-of-service path while leaving the legitimate-user case (a real user
-- mistyping their own password) unaffected.

alter table public.login_attempts
  add column if not exists ip text not null default 'unknown';

create index if not exists login_attempts_email_ip_time_idx
  on public.login_attempts (email, ip, created_at desc);
