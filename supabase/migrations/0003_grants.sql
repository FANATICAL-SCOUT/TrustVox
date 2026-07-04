-- TrustVox — Phase 8.1 · Migration 0003: explicit role grants
-- The project has "auto-expose new tables" DISABLED, so migration-created tables
-- get NO automatic privileges for the PostgREST roles. We grant explicitly and
-- minimally (least privilege). RLS (0002) is still the real per-row gate; these
-- grants are the coarse table-level layer beneath it.
--
--   anon          → NOTHING (login wall: no anonymous access at all)
--   authenticated → union of what user/client/admin may do (all share this role;
--                   profiles.role + RLS differentiate them). Deliberately tight:
--                   e.g. only SELECT on wallet_transactions (no self-minting),
--                   only SELECT/INSERT on responses (immutable once submitted).
--   service_role  → full access (trusted server paths + the seed script).

grant usage on schema public to authenticated, service_role;

-- authenticated — per-table, matching the RLS surface exactly:
grant select, update                 on public.profiles            to authenticated; -- read/update own; no client-side insert (signup trigger) or delete
grant select, insert, update, delete on public.companies          to authenticated; -- admin full; others read-only via RLS
grant select, insert, update, delete on public.forms              to authenticated; -- client own + admin; others read approved via RLS
grant select, insert                 on public.responses          to authenticated; -- insert own; immutable (no update/delete)
grant select                         on public.wallet_transactions to authenticated; -- read own only; writes go through the trusted path
grant select, insert, update         on public.notifications      to authenticated; -- own read/insert/update; no delete
grant select, insert, update, delete on public.campaigns          to authenticated; -- client full on own

-- views (read-only aggregates)
grant select on public.wallet_balances      to authenticated;
grant select on public.form_response_counts to authenticated;

-- service_role — trusted backend + seed
grant all on all tables in schema public to service_role;
