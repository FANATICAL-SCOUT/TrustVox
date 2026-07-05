-- TrustVox — Phase 8.6 · Migration 0006: fix credit_feedback_reward ON CONFLICT
-- Bug found live during Phase 8.6 verification (not introduced by 8.6): the
-- function's `on conflict (user_id, reference_id) do nothing` never matched
-- `wallet_transactions_reference_uidx` (0001), which is a PARTIAL unique index
-- (`where reference_id is not null`). Postgres only infers a conflict target
-- from a partial index when the ON CONFLICT clause repeats the same WHERE
-- predicate — without it, every real call failed with 42P10 ("no unique or
-- exclusion constraint matching the ON CONFLICT specification"). This means
-- the Phase 8.4 earn path has never actually succeeded in a real browser run.
-- Only the ON CONFLICT line changes; redeem_reward is untouched (no ON CONFLICT).
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

  -- caller must own the response; the amount comes from the form, not the client.
  select f.reward_tokens, f.title
    into v_reward, v_title
  from public.responses r
  join public.forms f on f.id = r.form_id
  where r.id = p_response_id and r.user_id = v_uid;

  if not found then
    raise exception 'Response not found for this account' using errcode = 'P0002';
  end if;

  v_reward := greatest(1, coalesce(v_reward, 0));

  insert into public.wallet_transactions (user_id, amount, reason, reference_id)
  values (v_uid, v_reward, 'Feedback submitted for "' || coalesce(v_title, '') || '"', v_ref)
  on conflict (user_id, reference_id) where reference_id is not null do nothing;

  select coalesce(sum(amount), 0) into v_balance
  from public.wallet_transactions where user_id = v_uid;

  return v_balance;
end;
$$;
