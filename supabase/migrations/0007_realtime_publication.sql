-- TrustVox — Phase 8.7 · Migration 0007: enable Realtime on the six tables
-- the client subscribes to (postgres_changes), replacing the old same-tab
-- CustomEvent/storage-event buses (lib/feedback-store.ts, tvx-wallet.ts,
-- user-notifications.ts, feedback-quota.ts, approved-company-store.ts).
--
-- Adding a table to the `supabase_realtime` publication does NOT bypass RLS —
-- Realtime still evaluates the table's SELECT policies per subscriber, so a
-- client only ever receives postgres_changes events for rows it could already
-- read (see docs/backend/ARCHITECTURE.md §6). This migration only grants the
-- *transport*; the access control is unchanged.
--
-- `add table` is not idempotent under `if not exists` in older Postgres/
-- Supabase releases, so guard each addition individually against re-running
-- this file (e.g. on a fresh project where 0001-0007 all run in order and a
-- table might already be present in the publication for some other reason).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'forms'
  ) then
    alter publication supabase_realtime add table public.forms;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'responses'
  ) then
    alter publication supabase_realtime add table public.responses;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'wallet_transactions'
  ) then
    alter publication supabase_realtime add table public.wallet_transactions;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'companies'
  ) then
    alter publication supabase_realtime add table public.companies;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'profiles'
  ) then
    alter publication supabase_realtime add table public.profiles;
  end if;
end;
$$;
