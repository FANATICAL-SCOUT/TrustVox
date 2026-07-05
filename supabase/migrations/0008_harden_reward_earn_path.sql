-- TrustVox — Phase 8.8 · Migration 0008: harden the wallet EARN path (security fix)
-- Design source of truth: docs/backend/ARCHITECTURE.md §4 (wallet), §6 (RLS), §7.
-- Run AFTER 0007.
--
-- SECURITY — closes a self-minting path found in the 8.8 full-surface review.
-- The earn amount in credit_feedback_reward (0005/0006) comes from
-- forms.reward_tokens. That value is set by the form's OWNING CLIENT, had no
-- upper bound (0001 only enforced `>= 1`), and responses_insert_own (0002) let
-- a user insert a response to ANY form they can read — including an unapproved
-- form they own. Combined (an account is both a self-service client AND able to
-- respond to its own draft form), a single authenticated account could:
--   1. create a form with reward_tokens = 2_000_000_000,
--   2. insert a response to that (still-unapproved, self-owned) form,
--   3. call credit_feedback_reward -> mint ~2B spendable TVX,
--   4. redeem it for real store items.
-- None of 0005's structural guards (insert-lock, idempotency, advisory lock)
-- constrain HOW MUCH a self-owned form may be worth, so this bypassed the
-- "no self-minting / server-authoritative reward" guarantee entirely.
--
-- Three independent, defence-in-depth fixes (any one closes the path; all three
-- are applied so the earn path is safe even if one is later relaxed):
--   A. credit_feedback_reward only credits for an APPROVED form the caller does
--      NOT own  -> you cannot earn from your own form or an unapproved form.
--   B. reward_tokens is bounded 1..1000 at the schema  -> even an approved,
--      third-party form cannot be worth an absurd amount.
--   C. responses_insert_own additionally requires the target form to be approved
--      -> responses to non-approved forms are rejected outright, independent of
--      the wallet path.

-- ─── A. Gate the earn on approval + non-ownership ───────────────────────────
-- Only the ON CONFLICT predicate (0006) and the form lookup change; all other
-- security properties of 0005 are preserved (SECURITY DEFINER, search_path='',
-- amount from forms.reward_tokens, ownership of the response, authenticated-only
-- grant, idempotency).
create or replace function public.credit_feedback_reward(p_response_id uuid)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid     uuid := (select auth.uid());
  v_reward  integer;
  v_title   text;
  v_ref     text := 'feedback-reward:' || p_response_id::text;
  v_balance integer;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  -- The caller must own the response AND the form must be approved AND owned by
  -- someone else. The amount comes from the form, never from client input, so a
  -- user can neither self-mint (own form) nor earn from an unapproved form.
  select f.reward_tokens, f.title
    into v_reward, v_title
  from public.responses r
  join public.forms f on f.id = r.form_id
  where r.id = p_response_id
    and r.user_id = v_uid
    and f.status = 'approved'
    and f.client_id <> v_uid;

  if not found then
    raise exception 'No creditable feedback response found for this account'
      using errcode = 'P0002';
  end if;

  -- Defensive clamp to the same schema bound (B); the CHECK below is the real
  -- guarantee, this just avoids surprising values if that bound ever changes.
  v_reward := greatest(1, least(1000, coalesce(v_reward, 0)));

  insert into public.wallet_transactions (user_id, amount, reason, reference_id)
  values (v_uid, v_reward, 'Feedback submitted for "' || coalesce(v_title, '') || '"', v_ref)
  on conflict (user_id, reference_id) where reference_id is not null do nothing;

  select coalesce(sum(amount), 0) into v_balance
  from public.wallet_transactions where user_id = v_uid;

  return v_balance;
end;
$$;

-- ─── B. Bound reward_tokens at the schema ───────────────────────────────────
-- Replace the `>= 1`-only check from 0001 with a bounded range. 1000 is ~25x the
-- highest real value used anywhere (seed forms top out at 40), so it's generous
-- headroom for legitimate forms while making an inflated self-reward worthless.
-- Existing rows are all well within range (verified: seed max = 40), so this
-- validates without touching data.
alter table public.forms
  drop constraint if exists forms_reward_tokens_check;
alter table public.forms
  add constraint forms_reward_tokens_range
  check (reward_tokens between 1 and 1000);

-- ─── C. Tighten responses_insert_own to approved forms only ─────────────────
-- A user may only submit a response to an APPROVED form. This closes the earn
-- path independently of the wallet function and also stops responses from being
-- attached to draft/pending/rejected forms in general.
drop policy if exists responses_insert_own on public.responses;
create policy responses_insert_own on public.responses
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.current_app_status() = 'active'
    and exists (
      select 1 from public.forms f
      where f.id = form_id and f.status = 'approved'
    )
  );
