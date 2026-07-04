-- TrustVox — Phase 8.1 · Migration 0002: helper functions, auth trigger, RLS policies
-- Design source of truth: docs/backend/ARCHITECTURE.md §5 (auth), §6 (RLS matrix), §7 (security).
-- Run AFTER 0001. Every table is default-deny; policies grant the minimum.

-- ─── Role/status helpers ────────────────────────────────────────────────────
-- SECURITY DEFINER so they read public.profiles WITHOUT re-triggering RLS —
-- this is what prevents infinite recursion in the profiles policies.
-- Locked search_path (''), STABLE, and executable only by app roles.
create or replace function public.current_app_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = (select auth.uid());
$$;

create or replace function public.current_app_status()
returns public.account_status
language sql
stable
security definer
set search_path = ''
as $$
  select status from public.profiles where id = (select auth.uid());
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select role from public.profiles where id = (select auth.uid())) = 'admin',
    false
  );
$$;

create or replace function public.is_client()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select role from public.profiles where id = (select auth.uid())) = 'client',
    false
  );
$$;

revoke all on function public.current_app_role()   from public, anon;
revoke all on function public.current_app_status() from public, anon;
revoke all on function public.is_admin()           from public, anon;
revoke all on function public.is_client()          from public, anon;
grant execute on function public.current_app_role()   to authenticated;
grant execute on function public.current_app_status() to authenticated;
grant execute on function public.is_admin()           to authenticated;
grant execute on function public.is_client()          to authenticated;

-- ─── Auth trigger: create the profiles row on signup ────────────────────────
-- Reads role from signup user_metadata (defaults to 'user'); client-profile
-- fields are populated by the signup route in 8.2. Runs as definer to insert
-- into public.profiles from the auth schema.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', new.email),
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'user')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── Enable RLS (default-deny) on every table ───────────────────────────────
alter table public.profiles            enable row level security;
alter table public.companies           enable row level security;
alter table public.forms               enable row level security;
alter table public.responses           enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.notifications       enable row level security;
alter table public.campaigns           enable row level security;

-- ─── profiles ───────────────────────────────────────────────────────────────
-- read own OR admin reads all.
create policy profiles_select_own_or_admin on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or public.is_admin());

-- update own — but a user CANNOT change their own role or status (no self-
-- escalation to admin, no self-unblock). WITH CHECK pins both to current values.
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (
    id = (select auth.uid())
    and role = public.current_app_role()
    and status = public.current_app_status()
  );

-- admin can update any profile, including role/status (block/unblock in 8.5).
create policy profiles_update_admin on public.profiles
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ─── companies ──────────────────────────────────────────────────────────────
-- everyone authenticated reads active companies; admin reads all + full write.
create policy companies_select_active_or_admin on public.companies
  for select to authenticated
  using (status = 'active' or public.is_admin());

create policy companies_insert_admin on public.companies
  for insert to authenticated
  with check (public.is_admin() and public.current_app_status() = 'active');

create policy companies_update_admin on public.companies
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin() and public.current_app_status() = 'active');

create policy companies_delete_admin on public.companies
  for delete to authenticated
  using (public.is_admin());

-- ─── forms ──────────────────────────────────────────────────────────────────
-- read: approved (visible to all) OR own (client) OR admin (all).
create policy forms_select_approved_own_admin on public.forms
  for select to authenticated
  using (
    status = 'approved'
    or client_id = (select auth.uid())
    or public.is_admin()
  );

-- clients create forms they own (status transitions validated server-side w/ zod).
create policy forms_insert_own_client on public.forms
  for insert to authenticated
  with check (
    client_id = (select auth.uid())
    and public.is_client()
    and public.current_app_status() = 'active'
  );

-- update: own client, or admin (admin drives approve/reject status changes).
create policy forms_update_own_or_admin on public.forms
  for update to authenticated
  using (client_id = (select auth.uid()) or public.is_admin())
  with check (
    (
      (client_id = (select auth.uid()) and public.current_app_status() = 'active')
      or public.is_admin()
    )
  );

create policy forms_delete_own_or_admin on public.forms
  for delete to authenticated
  using (client_id = (select auth.uid()) or public.is_admin());

-- ─── responses ──────────────────────────────────────────────────────────────
-- read: own (user) OR the client who owns the form OR admin. No update/delete
-- policy → responses are immutable once submitted (deny by default).
create policy responses_select_own_owner_admin on public.responses
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_admin()
    or exists (
      select 1 from public.forms f
      where f.id = form_id and f.client_id = (select auth.uid())
    )
  );

-- a user inserts their own response only (reward credit is a separate trusted
-- path added in 8.4 — the user does not write wallet rows here).
create policy responses_insert_own on public.responses
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.current_app_status() = 'active'
  );

-- ─── wallet_transactions ────────────────────────────────────────────────────
-- read own OR admin. NO insert/update/delete policy for authenticated: writes
-- happen only via the trusted server path (SECURITY DEFINER fn / service_role)
-- added in 8.4, so a user cannot mint their own TVX. Locked by default here.
create policy wallet_select_own_or_admin on public.wallet_transactions
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

-- ─── notifications ──────────────────────────────────────────────────────────
-- read/update/insert own (system-authored reward notifications move to the
-- trusted path in 8.4/8.6). Admin has no access per §6 matrix.
create policy notifications_select_own on public.notifications
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy notifications_insert_own on public.notifications
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy notifications_update_own on public.notifications
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ─── campaigns ──────────────────────────────────────────────────────────────
-- client full on own; admin read-only (§6 matrix).
create policy campaigns_select_own_or_admin on public.campaigns
  for select to authenticated
  using (client_id = (select auth.uid()) or public.is_admin());

create policy campaigns_insert_own_client on public.campaigns
  for insert to authenticated
  with check (
    client_id = (select auth.uid())
    and public.is_client()
    and public.current_app_status() = 'active'
  );

create policy campaigns_update_own_client on public.campaigns
  for update to authenticated
  using (client_id = (select auth.uid()))
  with check (client_id = (select auth.uid()) and public.current_app_status() = 'active');

create policy campaigns_delete_own_client on public.campaigns
  for delete to authenticated
  using (client_id = (select auth.uid()));
