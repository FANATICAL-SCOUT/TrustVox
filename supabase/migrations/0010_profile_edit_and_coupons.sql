-- TrustVox — Phase 9 · Session 3 · Migration 0010: profile editing + coupon lifecycle
-- Design source of truth: docs/backend/ARCHITECTURE.md §4; docs/frontend/PHASE-9-QA-REDESIGN.md Session 3.
-- Run AFTER 0009.
--
-- Three Session-3 needs, bundled:
--   1. profiles gains `bio`, `interests` (text[]), and `last_name_change_at` —
--      the editable-profile fields. A BEFORE UPDATE trigger enforces the
--      "display_name may change at most once per 90 days" rule IN THE DATABASE,
--      so the cooldown holds no matter which path writes the row (the trusted
--      /api/update-profile route OR a direct RLS-gated client update). Email is
--      never editable (no policy/route ever writes profiles.email post-signup).
--   2. a `redemptions` table — one row per store redemption, holding the coupon
--      code + a 30-day expiry. This is the single source of truth for a user's
--      coupon history (profile "Redeemed rewards" section, Session 3 items 5–6).
--   3. redeem_reward now writes that redemption row atomically with the wallet
--      debit (same transaction, same advisory lock), so a debit can never exist
--      without its coupon and vice-versa.

-- ─── 1. profiles: bio + interests + name-change cooldown ────────────────────
alter table public.profiles
  add column if not exists bio                 text,
  add column if not exists interests           text[] not null default '{}',
  add column if not exists last_name_change_at timestamptz;

-- Bound the free-text/array fields at the schema so a tampered client (bypassing
-- the zod route) still can't store oversized junk. 150 words ≈ generous 1200-char
-- ceiling; interests capped at 6 tags (Session 3 item 3).
alter table public.profiles
  drop constraint if exists profiles_bio_len;
alter table public.profiles
  add constraint profiles_bio_len
  check (bio is null or char_length(bio) <= 1200);

alter table public.profiles
  drop constraint if exists profiles_interests_len;
alter table public.profiles
  add constraint profiles_interests_len
  check (array_length(interests, 1) is null or array_length(interests, 1) <= 6);

-- Name-change cooldown as a DATABASE guarantee (not just a route check). On any
-- update that actually changes display_name, require 90 days since the last
-- change and stamp last_name_change_at = now(). Admin edits (is_admin) are exempt
-- so support can always fix a name. SECURITY DEFINER + locked search_path so the
-- function's own reads aren't affected by the caller's settings.
create or replace function public.enforce_name_change_cooldown()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Only act when the visible name actually changes.
  if new.display_name is distinct from old.display_name then
    -- Admins bypass the cooldown (block/unblock + support corrections).
    if public.is_admin() then
      new.last_name_change_at := now();
      return new;
    end if;

    if old.last_name_change_at is not null
       and old.last_name_change_at > now() - interval '90 days' then
      raise exception 'Name can only be changed once every 90 days'
        using errcode = 'P0001';
    end if;

    new.last_name_change_at := now();
  else
    -- Never let a client hand-set the cooldown stamp by including it in an update
    -- that doesn't change the name.
    new.last_name_change_at := old.last_name_change_at;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_name_change_cooldown on public.profiles;
create trigger trg_enforce_name_change_cooldown
  before update on public.profiles
  for each row
  execute function public.enforce_name_change_cooldown();

-- ─── 2. redemptions (coupon lifecycle) ──────────────────────────────────────
-- One row per successful store redemption. coupon_code is generated server-side
-- (in redeem_reward), expires_at is redeemed_at + 30 days. store_item_id is a
-- plain text snapshot of the catalog slug (NOT an FK) so a coupon's history
-- survives a catalog item being deleted/renamed later. item_title/cost are
-- snapshots for the same reason — the profile shows what was redeemed even if the
-- catalog changes.
create table if not exists public.redemptions (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references public.profiles (id) on delete cascade,
  store_item_id text        not null,
  item_title    text        not null,
  cost          integer     not null check (cost >= 1),
  coupon_code   text        not null unique,
  redeemed_at   timestamptz not null default now(),
  expires_at    timestamptz not null
);

create index if not exists redemptions_user_time_idx
  on public.redemptions (user_id, redeemed_at desc);

-- ─── redemptions RLS ────────────────────────────────────────────────────────
-- A user reads only their own coupons; admin reads all. NOBODY gets a direct
-- INSERT/UPDATE/DELETE policy — rows are written solely by the trusted
-- redeem_reward SECURITY DEFINER function (same pattern as wallet_transactions).
alter table public.redemptions enable row level security;

create policy redemptions_select_own_or_admin on public.redemptions
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

revoke all      on public.redemptions from anon;
grant select    on public.redemptions to authenticated; -- read own via RLS
grant all       on public.redemptions to service_role;

-- ─── 3. redeem_reward: write the wallet debit AND the coupon atomically ─────
-- Extends the 0005 function (all its security properties preserved: cost/title
-- from store_items only, per-user advisory lock, atomic balance check). Now it
-- ALSO inserts a redemptions row with a unique coupon code + 30-day expiry, in
-- the same transaction under the same lock, so the debit and the coupon are
-- always created together. Returns the new balance (unchanged signature/return).
create or replace function public.redeem_reward(p_item_id text)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid     uuid := (select auth.uid());
  v_cost    integer;
  v_title   text;
  v_balance integer;
  v_code    text;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  select cost, title into v_cost, v_title
  from public.store_items
  where id = p_item_id and is_active;

  if not found then
    raise exception 'Store item not available' using errcode = 'P0002';
  end if;

  -- serialise this user's wallet writes so the balance check + debit is atomic.
  perform pg_advisory_xact_lock(hashtext('wallet:' || v_uid::text));

  select coalesce(sum(amount), 0) into v_balance
  from public.wallet_transactions where user_id = v_uid;

  if v_balance < v_cost then
    raise exception 'Insufficient TVX balance' using errcode = 'P0001';
  end if;

  insert into public.wallet_transactions (user_id, amount, reason)
  values (v_uid, -v_cost, 'Redeemed ' || v_title);

  -- Generate a readable coupon code from a fresh UUID. Uses only core functions
  -- (gen_random_uuid is built-in — no pgcrypto, which matters because this
  -- function runs with search_path='' and pgcrypto lives in the extensions
  -- schema on Supabase). Shape TVX-XXXXXXXX-XXXX; the UNIQUE constraint is the
  -- real collision guard, this is just human-friendly. 12 hex chars of a v4 UUID
  -- make a same-call collision astronomically unlikely.
  v_code := 'TVX-'
    || upper(substring(replace((pg_catalog.gen_random_uuid())::text, '-', '') from 1 for 8)) || '-'
    || upper(substring(replace((pg_catalog.gen_random_uuid())::text, '-', '') from 1 for 4));

  insert into public.redemptions
    (user_id, store_item_id, item_title, cost, coupon_code, expires_at)
  values
    (v_uid, p_item_id, v_title, v_cost, v_code, now() + interval '30 days');

  return v_balance - v_cost;
end;
$$;

-- redeem_reward's grants are unchanged from 0005 (authenticated execute only),
-- but re-assert least privilege in case this migration is ever run standalone.
revoke all      on function public.redeem_reward(text) from public, anon;
grant execute   on function public.redeem_reward(text) to authenticated;
