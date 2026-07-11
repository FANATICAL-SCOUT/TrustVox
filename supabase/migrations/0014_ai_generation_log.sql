-- TrustVox — Phase 11 · Session 11.5 · Migration 0014: AI generation rate-limit log
-- Design source of truth: docs/frontend/PHASE-11-CLIENT-REBUILD-AI.md §11.5.
-- Run AFTER 0013.
--
-- Backs a simple per-user daily rate limit on /api/generate-questions (real AI
-- calls cost quota, not money on the free Groq tier, but the cap still exists
-- and one account mashing the button shouldn't be able to exhaust it alone).
-- One row per successful generation call. The route counts rows in the last 24h
-- for auth.uid() and rejects once the cap is hit.
--
-- SECURITY: the caller is always authenticated by the time this table is
-- touched (the route auth-gates first), so this is a normal per-user RLS table,
-- not service-role-only like login_attempts (which runs pre-auth).

create table if not exists public.ai_generation_log (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid        not null references public.profiles(id) on delete cascade,
  feature    text        not null check (feature in ('generate_questions', 'summarize_responses')),
  created_at timestamptz not null default now()
);

create index if not exists ai_generation_log_user_time_idx
  on public.ai_generation_log (user_id, feature, created_at desc);

alter table public.ai_generation_log enable row level security;

-- Users can read their own log (so the UI can show "N left today" if ever wanted)
-- but cannot insert/update/delete directly — only the trusted server route
-- (using the session-scoped client, still subject to this policy) inserts via
-- a service-role-free path... except an authenticated INSERT is exactly what the
-- route needs, so allow authenticated users to insert ONLY their own row. This
-- mirrors wallet_transactions' shape: the route runs as the user, so user_id
-- must equal auth.uid() — no way to log a call under someone else's name.
create policy ai_generation_log_select_own
  on public.ai_generation_log for select
  to authenticated
  using (user_id = auth.uid());

create policy ai_generation_log_insert_own
  on public.ai_generation_log for insert
  to authenticated
  with check (user_id = auth.uid());

revoke all on public.ai_generation_log from anon;
grant select, insert on public.ai_generation_log to authenticated;
grant all on public.ai_generation_log to service_role;
