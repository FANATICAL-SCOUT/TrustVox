-- TrustVox — Phase 8.4 · Migration 0005: wallet trusted-path (earn + redeem)
-- Design source of truth: docs/backend/ARCHITECTURE.md §4 (wallet), §6 (RLS),
-- §7 (security). Run AFTER 0004.
--
-- wallet_transactions has NO authenticated INSERT policy (0002/0003) — a user
-- cannot write wallet rows directly. Both money-moving operations run here as
-- SECURITY DEFINER functions so the ONLY way to move TVX is a trusted path that:
--   • credit: derives the amount from forms.reward_tokens, never client input
--     (no self-minting), and is idempotent per (user_id, reference_id);
--   • redeem: derives the cost from the store_items catalog, never client input
--     (no self-discounting), and checks balance atomically (no overspend).

-- ─── store_items (reward catalog) ───────────────────────────────────────────
-- Small static product catalog. Costs live in the DB so the SERVER owns the
-- price — the browser only displays it. Ported from the old hardcoded
-- STORE_ITEMS list in components/user/store-section.tsx.
create type public.store_category as enum ('vouchers', 'subscriptions', 'merch');

create table public.store_items (
  id          text primary key,                       -- stable slug (e.g. 'amazon-gift-card')
  title       text                  not null,
  description text                  not null default '',
  cost        integer               not null check (cost >= 1),
  badge       text                  not null default '',
  category    public.store_category not null,
  is_active   boolean               not null default true,
  sort_order  integer               not null default 0,
  created_at  timestamptz           not null default now()
);

create index store_items_active_idx on public.store_items (is_active, sort_order);

insert into public.store_items (id, title, description, cost, badge, category, sort_order) values
  ('amazon-gift-card',    'Amazon Gift Card',    'Redeem your TVX for a digital voucher and shop what you love.',            200, 'Popular', 'vouchers',      1),
  ('netflix-subscription','Netflix Subscription','Unlock one month of entertainment powered by your TrustVox activity.',    150, 'Limited', 'subscriptions', 2),
  ('trustvox-tshirt',     'TrustVox T-Shirt',    'Premium community merch for your most consistent feedback streaks.',      300, 'Premium', 'merch',         3)
on conflict (id) do nothing;

-- ─── store_items RLS ─────────────────────────────────────────────────────────
-- everyone authenticated reads active items; admin reads all + full write.
alter table public.store_items enable row level security;

create policy store_items_select_active_or_admin on public.store_items
  for select to authenticated
  using (is_active or public.is_admin());

create policy store_items_insert_admin on public.store_items
  for insert to authenticated
  with check (public.is_admin() and public.current_app_status() = 'active');

create policy store_items_update_admin on public.store_items
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin() and public.current_app_status() = 'active');

create policy store_items_delete_admin on public.store_items
  for delete to authenticated
  using (public.is_admin());

grant select                         on public.store_items to authenticated; -- read active via RLS
grant insert, update, delete         on public.store_items to authenticated; -- admin-only via RLS
grant all                            on public.store_items to service_role;

-- ─── credit_feedback_reward: the earn trusted path ──────────────────────────
-- Credits the reward for a feedback response the CALLER owns. The amount is read
-- from forms.reward_tokens (authoritative), never from client input, so a user
-- cannot mint arbitrary TVX. Idempotent via the (user_id, reference_id) unique
-- index — a retry or double-submit credits at most once. Returns the new balance.
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
  on conflict (user_id, reference_id) do nothing;

  select coalesce(sum(amount), 0) into v_balance
  from public.wallet_transactions where user_id = v_uid;

  return v_balance;
end;
$$;

-- ─── redeem_reward: the spend trusted path ──────────────────────────────────
-- Redeems a store item for the caller. Cost + title are read from store_items
-- (server-authoritative), never from client input, so a user cannot pick their
-- own price. A per-user advisory lock serialises concurrent redemptions and the
-- balance is checked inside the same transaction, so the balance can never go
-- negative even under a double-click / race. Returns the new balance.
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

  return v_balance - v_cost;
end;
$$;

-- Least privilege: only signed-in users may call; anon/public cannot.
revoke all on function public.credit_feedback_reward(uuid) from public, anon;
revoke all on function public.redeem_reward(text)          from public, anon;
grant execute on function public.credit_feedback_reward(uuid) to authenticated;
grant execute on function public.redeem_reward(text)          to authenticated;
