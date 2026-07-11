-- TrustVox — Phase 9 · Migration 0012: fix the Security Definer advisor on
-- form_response_counts (security hygiene).
-- Design source of truth: docs/backend/ARCHITECTURE.md §6 (RLS), §7 (posture).
-- Run AFTER 0011.
--
-- BACKGROUND — the Supabase database advisor flags public.form_response_counts
-- as CRITICAL "Security Definer View". Pre-PG15 views (like the one created in
-- 0001) run with the VIEW OWNER's rights, which bypasses the querying user's RLS.
-- For this view that was DELIBERATE (0001 comment): the public "participants"
-- number must count ALL responses to a form, not just the ones the caller can
-- see under responses_select_own_owner_admin (0002) — otherwise every user would
-- see only their own response and the count would read 1 for almost everyone.
--
-- The view only ever exposes a count(*) aggregate — never row data, identities,
-- or answer content — so the practical leak is nil. But a lingering CRITICAL
-- advisor flag is not acceptable for a security-first build, and "suppress the
-- warning by switching the view to security_invoker" would silently break the
-- count (see above). So we apply the SANCTIONED pattern instead:
--
--   • Put the run-as-owner step in a dedicated SECURITY DEFINER FUNCTION whose
--     ONLY job is to return the true count for one form. It is search_path-locked
--     and returns just an integer, so it cannot be repurposed to read row data.
--   • Redefine the VIEW itself as security_invoker (RLS-respecting) that simply
--     calls that function per form. The advisor sees an invoker view and clears;
--     the count stays accurate because the function still sees every row.
--
-- Net: advisor goes green AND the participant count is unchanged. The view keeps
-- the exact same shape — columns (form_id, response_count) — so its only consumer
-- (lib/feedback-store.ts fetchResponseCounts) is untouched.

-- ─── 1. Owner-rights counting function (the intentional, narrow escalation) ───
-- SECURITY DEFINER so count(*) sees all responses regardless of the caller's RLS.
-- search_path = '' + fully-qualified names prevent search-path hijacking. STABLE
-- (no writes) and returns a bare integer — no way to exfiltrate row data through
-- it. Executable by authenticated users only.
create or replace function public.form_response_count(p_form_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
  from public.responses
  where form_id = p_form_id;
$$;

revoke all on function public.form_response_count(uuid) from public;
grant execute on function public.form_response_count(uuid) to authenticated;

-- ─── 2. Redefine the view as security_invoker over forms ────────────────────
-- Driven off public.forms (one row per form) rather than grouping responses, so
-- the row visible to the caller is governed by the FORMS RLS policy (public/own/
-- owned/admin) while the COUNT itself comes from the definer function above. Same
-- output columns as 0001 (form_id, response_count), so downstream code is stable.
drop view if exists public.form_response_counts;
create view public.form_response_counts
  with (security_invoker = on) as
  select
    f.id                                as form_id,
    public.form_response_count(f.id)    as response_count
  from public.forms f;

grant select on public.form_response_counts to authenticated;
