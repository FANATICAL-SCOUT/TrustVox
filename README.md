# TrustVox

TrustVox is a feedback platform where **users earn TVX tokens for accepted feedback and redeem them for coupons**. Three roles: user, client (company), admin. It's a portfolio / showcase rebuild — currently frontend-only, running on browser `localStorage` for persistence (no real backend or auth yet).

> **TVX is in-app reward points, not crypto/web3.** The "wallet" is a localStorage points ledger (`lib/tvx-wallet.ts`) — no blockchain, no keys, no addresses.

Live design system: **"Ledger"** — dark, quiet-fintech, one gold accent, mint for positive states only, no gimmicks.

## Source of truth

This README gives a snapshot for getting the project running. For anything about current status, in-progress work, or design decisions, **the `docs/` folder is authoritative** — see [`docs/README.md`](docs/README.md) for the hub. It's split by workstream:

| Folder | What it covers | Start here |
| --- | --- | --- |
| [`docs/frontend/`](docs/frontend/) | The "Ledger" UI rebuild (Phases 1–7, ✅ done). | [`frontend/TRACKER.md`](docs/frontend/TRACKER.md) |
| [`docs/backend/`](docs/backend/) | The real DB + auth + security rebuild (Phase 8, Supabase). | [`backend/TRACKER.md`](docs/backend/TRACKER.md) + [`backend/ARCHITECTURE.md`](docs/backend/ARCHITECTURE.md) |

Each folder holds its own `TRACKER.md` (status + task checklist) and `LOG.md` (dated change history).

[`PROJECT_REBUILD_SPEC.md`](PROJECT_REBUILD_SPEC.md) is an **archived** pre-rebuild planning document — historical only, not maintained.

## Tech stack

- **Framework:** Next.js 15 (App Router) · React 19 · TypeScript (strict, 0 errors)
- **UI:** Tailwind CSS · shadcn/ui · Radix UI primitives · lucide-react icons
- **Forms/utilities:** react-hook-form · zod · date-fns
- **Analytics/reporting:** Recharts · html2canvas · jsPDF (PDF export)
- **Notifications:** sonner
- **Package manager:** pnpm

## Project structure

```text
.
├─ app/                   # Next.js App Router routes
│  ├─ user/               # User-portal routes (dashboard, wallet, store, feedback flow)
│  ├─ client/              # Client (company) portal routes
│  ├─ admin/               # Admin portal routes
│  └─ (auth pages)         # /login, /signup, /client-login, /admin-login, etc. (top-level by convention)
├─ components/
│  ├─ user/                # User-only components (navbar, dashboard sections, profile)
│  ├─ auth/                # Shared auth-page shell (used by all 6 login/signup pages)
│  ├─ modals/              # Cross-role modal components
│  ├─ ui/                  # shadcn primitives
│  ├─ client-navbar.tsx, admin-navbar.tsx  # Client/admin navbars (loose at root, same as user's used to be)
│  └─ brand-logo.tsx, theme-provider.tsx, global-scroll-effects.tsx  # Shared app-wide components
├─ lib/                   # Domain store modules (feedback, wallet, notifications, companies, campaigns)
├─ utils/                 # Small utility helpers
├─ docs/                  # Living project record — start here for status/context
└─ public/                # Static assets
```

### Key domain modules (`lib/`)

- `feedback-store.ts` — forms, responses, subscriptions
- `tvx-wallet.ts` — TVX balance/transaction ledger
- `feedback-quota.ts` — daily submission limits
- `user-notifications.ts` — notification feed
- `approved-company-store.ts` — approved company directory
- `client-campaigns.ts` — client-side campaign aggregation

## Routes

### Auth (shared shell across all 3 roles)
`/signin` (role picker — User + Client) · `/login` · `/signup` · `/client-login` · `/client-signup` · `/admin-login`
(Admin is sign-in only and unadvertised — no admin signup; admin accounts are provisioned by hand.)

### User
`/user/dashboard` (home · `?section=suggested` browse-all · `?section=history` · `?section=profile`) · `/user/wallet` · `/user/store` · `/user/feedback/[id]`
(`/dashboard`, `/wallet`, `/store`, `/suggested`, `/history`, `/profile` are legacy redirects to the routes above.)

### Client
`/client/dashboard` (canonical) · `/client/forms` · `/client/create-feedback` · `/client/campaigns` (+ `[campaignId]`) · `/client/analytics` · `/client/history` · `/client/profile`

### Admin
`/admin` (canonical) · `/admin/approvals` · `/admin/approved-companies` · `/admin/user-management`

### Public
`/` · `/contact`

## Getting started

```bash
pnpm install
pnpm dev       # http://localhost:3000
```

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Start development server |
| `pnpm build` | Build production bundle |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |

## Notes

- Backend rebuild (Phase 8) is underway on **Supabase** (Postgres + Auth + RLS). Until it lands, most pages still fall back to an "anonymous" user with seeded `localStorage` demo state. Design: [`docs/backend/ARCHITECTURE.md`](docs/backend/ARCHITECTURE.md).
- TypeScript and ESLint run in strict mode with zero tolerance for new errors (`next.config.mjs` has both checks enabled, not suppressed).
- Keep the docs in sync with any route, component, feature, table, or policy change — frontend changes update `docs/frontend/`, backend changes update `docs/backend/`. See [`docs/README.md`](docs/README.md) for the maintenance contract.
