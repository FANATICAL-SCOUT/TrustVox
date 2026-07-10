-- TrustVox — Phase 9 · Session 4 · Migration 0011: bookmarks
-- Design source of truth: docs/frontend/PHASE-9-QA-REDESIGN.md Session 4 (item 4/6);
-- docs/backend/ARCHITECTURE.md §4/§6. Run AFTER 0010.
--
-- A `bookmarks` row is a user saving an approved feedback form "for later" — a
-- same-day to-do entry that shows up in History's Bookmarked section (Session 4).
-- Unlike wallet_transactions/redemptions (written only by trusted functions),
-- a bookmark is plain user-owned data the user directly creates and deletes, so
-- it gets real per-user INSERT/DELETE/SELECT policies scoped to auth.uid() —
-- same pattern as `notifications`. There is no economic value here (bookmarking
-- mints nothing), so no SECURITY DEFINER path is needed.
--
-- The UNIQUE (user_id, form_id) makes a form un-double-bookmarkable per account;
-- ON DELETE CASCADE on both FKs means deleting a form or a profile cleans up its
-- bookmarks automatically (no dangling rows the History query would have to skip).

create table if not exists public.bookmarks (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references public.profiles (id) on delete cascade,
  form_id    uuid        not null references public.forms (id)    on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, form_id)
);

-- History reads a user's bookmarks newest-first; the composite index covers it.
create index if not exists bookmarks_user_time_idx
  on public.bookmarks (user_id, created_at desc);

-- ─── bookmarks RLS ──────────────────────────────────────────────────────────
-- A user sees, creates, and removes only their own bookmarks. Admin can read all
-- (parity with the other user-owned tables' select policies) but never writes
-- someone else's. No anon access.
alter table public.bookmarks enable row level security;

create policy bookmarks_select_own_or_admin on public.bookmarks
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

create policy bookmarks_insert_own on public.bookmarks
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy bookmarks_delete_own on public.bookmarks
  for delete to authenticated
  using (user_id = (select auth.uid()));

revoke all    on public.bookmarks from anon;
grant select, insert, delete on public.bookmarks to authenticated; -- own rows via RLS
grant all     on public.bookmarks to service_role;

-- ─── Realtime ───────────────────────────────────────────────────────────────
-- Add bookmarks to the publication so a bookmark toggle updates the History /
-- Suggested UI live (same transport-only grant as 0007 — RLS still gates which
-- rows a subscriber receives). Guarded so re-running this file is a no-op.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'bookmarks'
  ) then
    alter publication supabase_realtime add table public.bookmarks;
  end if;
end;
$$;
