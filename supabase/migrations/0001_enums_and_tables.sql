-- TrustVox — Phase 8.1 · Migration 0001: enums, tables, constraints, indexes, views, triggers
-- Design source of truth: docs/backend/ARCHITECTURE.md §4. RLS lives in 0002.
-- Column names are snake_case (Postgres convention); the lib/ stores map them
-- back to the camelCase the UI expects. ids are UUIDs (gen_random_uuid()).

-- ─── Enums ──────────────────────────────────────────────────────────────────
create type public.user_role         as enum ('user', 'client', 'admin');
create type public.account_status    as enum ('active', 'blocked');
create type public.company_status    as enum ('active', 'inactive');
create type public.form_status       as enum ('draft', 'pending', 'approved', 'rejected');
create type public.form_visibility   as enum ('private', 'public', 'link');
create type public.notification_type as enum (
  'reward_pending', 'reward_credited', 'reward_redeemed', 'new_opportunity', 'streak_risk'
);
create type public.campaign_status   as enum ('active', 'draft', 'completed');

-- ─── Shared updated_at trigger ──────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ─── profiles ───────────────────────────────────────────────────────────────
-- One row per account, 1:1 with auth.users. Holds the role — backbone of RLS.
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  role          public.user_role      not null default 'user',
  display_name  text,
  email         text,
  status        public.account_status not null default 'active',
  -- client-profile fields (from ClientUser) — nullable, only set for clients
  company_name  text,
  industry      text,
  company_size  text,
  website       text,
  contact_name  text,
  position      text,
  description   text,
  address       text,
  city          text,
  country       text,
  phone         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ─── companies (← ApprovedCompany) ──────────────────────────────────────────
create table public.companies (
  id          uuid primary key default gen_random_uuid(),
  name        text                  not null,
  category    text                  not null,
  status      public.company_status not null default 'active',
  date_added  timestamptz           not null default now()
);

create index companies_status_idx on public.companies (status);

-- ─── forms (← FeedbackForm) ─────────────────────────────────────────────────
-- questions stored as JSONB (always read/written whole, never queried per-item).
-- response_count is NOT stored — derived via form_response_counts view.
create table public.forms (
  id                    uuid primary key default gen_random_uuid(),
  title                 text            not null default '',
  description           text            not null default '',
  product               text            not null default '',
  category              text            not null default '',
  category_details      text,
  company_id            uuid references public.companies (id) on delete set null,
  client_id             uuid            not null references public.profiles (id) on delete cascade,
  client_name           text            not null default '',
  status                public.form_status     not null default 'draft',
  visibility            public.form_visibility not null default 'private',
  response_limit        integer check (response_limit is null or response_limit > 0),
  allow_anonymous       boolean         not null default true,
  enable_ratings        boolean         not null default true,
  auto_close_date       timestamptz,
  questions             jsonb           not null default '[]'::jsonb,
  reward_tokens         integer         not null default 24 check (reward_tokens >= 1),
  rejection_reason      text,
  request_changes_note  text,
  created_at            timestamptz     not null default now(),
  submitted_at          timestamptz,
  approved_at           timestamptz,
  updated_at            timestamptz     not null default now()
);

create index forms_client_id_idx  on public.forms (client_id);
create index forms_company_id_idx on public.forms (company_id);
create index forms_status_idx     on public.forms (status);

create trigger forms_set_updated_at
  before update on public.forms
  for each row execute function public.set_updated_at();

-- ─── responses (← FormResponse) ─────────────────────────────────────────────
-- unique (form_id, user_id) enforces one-response-per-user-per-form in the DB.
create table public.responses (
  id            uuid primary key default gen_random_uuid(),
  form_id       uuid        not null references public.forms (id) on delete cascade,
  user_id       uuid        not null references public.profiles (id) on delete cascade,
  answers       jsonb       not null default '{}'::jsonb,
  reward_tokens integer,
  submitted_at  timestamptz not null default now(),
  unique (form_id, user_id)
);

create index responses_form_id_idx on public.responses (form_id);
create index responses_user_id_idx on public.responses (user_id);

-- ─── wallet_transactions (← TVXTransaction) ─────────────────────────────────
-- Balance is DERIVED (sum(amount)), never stored — see wallet_balances view.
-- Partial unique index on (user_id, reference_id) enforces reward idempotency.
create table public.wallet_transactions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid        not null references public.profiles (id) on delete cascade,
  amount        integer     not null,              -- signed: +earn / -spend
  reason        text        not null,
  reference_id  text,                              -- idempotency key
  created_at    timestamptz not null default now()
);

create index wallet_transactions_user_id_idx on public.wallet_transactions (user_id);
create unique index wallet_transactions_reference_uidx
  on public.wallet_transactions (user_id, reference_id)
  where reference_id is not null;

-- ─── notifications (← UserNotification) ─────────────────────────────────────
create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid        not null references public.profiles (id) on delete cascade,
  type        public.notification_type not null,
  title       text        not null,
  message     text        not null,
  is_read     boolean     not null default false,
  action      jsonb,                               -- { route?, formId? }
  created_at  timestamptz not null default now()
);

create index notifications_user_id_idx on public.notifications (user_id, created_at desc);

-- ─── campaigns (← ClientCampaign) ───────────────────────────────────────────
-- CampaignSummary aggregates (formsCount, totalResponses, averageRating) stay
-- derived, not stored.
create table public.campaigns (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid        not null references public.profiles (id) on delete cascade,
  name        text        not null,
  description text        not null default '',
  status      public.campaign_status not null default 'draft'
);

create index campaigns_client_id_idx on public.campaigns (client_id);

-- ─── Derived views (security_invoker: respect the caller's RLS) ─────────────
-- Balance / totals as SUMs so double-credits and drift are structurally impossible.
create view public.wallet_balances
  with (security_invoker = on) as
  select
    user_id,
    coalesce(sum(amount), 0)                                  as balance,
    coalesce(sum(amount) filter (where amount > 0), 0)        as total_earned,
    coalesce(-sum(amount) filter (where amount < 0), 0)       as total_spent
  from public.wallet_transactions
  group by user_id;

-- response_count per form, derived from responses. Runs as owner (NOT
-- security_invoker) so the count reflects ALL responses, not just the ones the
-- caller can see under RLS — the public "participants" number must be accurate.
-- The count is a non-sensitive aggregate; no row data is exposed through it.
create view public.form_response_counts as
  select form_id, count(*)::integer as response_count
  from public.responses
  group by form_id;

grant select on public.wallet_balances      to authenticated;
grant select on public.form_response_counts to authenticated;
