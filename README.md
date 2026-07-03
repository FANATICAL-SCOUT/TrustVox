# TrustVox

TrustVox is a feedback platform where **users earn TVX tokens for accepted feedback and redeem them for coupons**. Three roles: user, client (company), admin. It's a portfolio / showcase rebuild — currently frontend-only, running on browser `localStorage` for persistence (no real backend or auth yet).

> **TVX is in-app reward points, not crypto/web3.** The "wallet" is a localStorage points ledger (`lib/tvx-wallet.ts`) — no blockchain, no keys, no addresses.

Live design system: **"Ledger"** — dark, quiet-fintech, one gold accent, mint for positive states only, no gimmicks.

## Source of truth

This README gives a snapshot for getting the project running. For anything about current status, in-progress work, or design decisions, **the `docs/` folder is authoritative** — start with [`docs/TRACKER.md`](docs/TRACKER.md):

| File | What it's for |
| --- | --- |
| [`docs/TRACKER.md`](docs/TRACKER.md) | Live status dashboard: phase %, current focus, design system, run/screenshot steps. |
| [`docs/TODO.md`](docs/TODO.md) | Phase-by-phase task checklist. |
| [`docs/LOG.md`](docs/LOG.md) | Dated, append-only changelog with the *why* behind each change. |
| [`docs/CONSOLIDATION-MAP.md`](docs/CONSOLIDATION-MAP.md) | Keep/merge/delete decisions for routes and components. |

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
`/signin` (role picker) · `/login` · `/signup` · `/client-login` · `/client-signup` · `/admin-login` · `/admin-signup`

### User
`/user/dashboard` · `/user/wallet` · `/user/store` · `/user/feedbacks` · `/user/feedback/[id]`
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

- No real backend/auth yet — most pages fall back to an "anonymous" user with seeded demo state. A light backend (leaning Supabase) is planned post-frontend.
- TypeScript and ESLint run in strict mode with zero tolerance for new errors (`next.config.mjs` has both checks enabled, not suppressed).
- Keep `docs/LOG.md` / `docs/TODO.md` / `docs/TRACKER.md` / `docs/CONSOLIDATION-MAP.md` in sync with any route, component, or feature change — see [`docs/README.md`](docs/README.md) for the maintenance contract.
