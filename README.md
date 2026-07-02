# TrustVox Platform v5

TrustVox is a Next.js-based feedback and campaign platform with separate admin and client experiences, campaign/form workflows, analytics reporting, and local persistence for fast iteration.

## Table Of Contents

- [Overview](#overview)
- [System Workflow](#system-workflow)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Routing Map](#routing-map)
- [Analytics Workflow](#analytics-workflow)
- [Getting Started](#getting-started)
- [Scripts](#scripts)

## Overview

TrustVox supports three primary activity areas:

- Public and authentication flows.
- Client campaign and feedback management.
- Admin approvals and oversight.

The app uses the Next.js App Router and stores most operational data in browser local storage via internal store modules.

## System Workflow

1. User signs in through client or admin authentication routes.
2. Client creates forms/campaigns and submits for approval.
3. Admin reviews, approves, rejects, or requests changes.
4. End-user responses are submitted and attached to forms.
5. Client dashboards and analytics consume forms plus responses to calculate KPIs and trends.
6. Reports can be generated and exported as PDF.

## Tech Stack

### Core Framework

- Next.js 15.2.4
- React 19
- TypeScript 5

### UI And Styling

- Tailwind CSS
- shadcn/ui
- Radix UI primitives
- lucide-react icons
- next-themes

### Forms, Validation, And Utilities

- react-hook-form
- @hookform/resolvers
- zod
- date-fns
- clsx
- class-variance-authority
- tailwind-merge

### Analytics And Reporting

- recharts for charting
- html2canvas for DOM capture
- jspdf for PDF export

### Notifications And UX

- sonner
- cmdk
- embla-carousel-react
- vaul

## Project Structure

```text
.
├─ app/                         # App Router pages, layouts, route-level UI
├─ components/                  # Reusable UI and feature components
│  ├─ ui/                       # shadcn-based primitives
│  ├─ client/                   # Client-specific components
│  └─ modals/                   # Modal components
├─ hooks/                       # Reusable custom hooks
├─ lib/                         # Data stores and domain modules
├─ utils/                       # Additional utility modules
├─ docs/                        # Internal project and day-end docs
├─ public/                      # Static assets
└─ reference-ui/                # Reference design assets
```

### Important Domain Modules

- `lib/feedback-store.ts`: forms, responses, and update subscriptions.
- `lib/approved-company-store.ts`: approved company data source.
- `lib/feedback-quota.ts`: quota constraints.
- `lib/tvx-wallet.ts`: wallet/accounting helpers.
- `lib/user-notifications.ts`: notification data helpers.
- `lib/client-campaigns.ts`: campaign-oriented client utilities.

## Routing Map

Below is the current route inventory from the App Router page files.

### Public And Auth

- `/`
- `/contact`
- `/login`
- `/signin`
- `/signup`
- `/client-login`
- `/client-signup`
- `/admin-login`
- `/admin-signup`

### Shared User Flows

- `/history`
- `/profile`
- `/wallet`
- `/payment`
- `/store`
- `/dashboard`
- `/create-campaign`
- `/previous-campaigns`
- `/suggested`
- `/client-home`
- `/client-dashboard`
- `/client-companies`

### Client Area

- `/client/home`
- `/client/dashboard`
- `/client/profile`
- `/client/campaigns`
- `/client/campaigns/[campaignId]`
- `/client/create`
- `/client/create-feedback`
- `/client/forms`
- `/client/forms/[id]/analytics`
- `/client/analytics`
- `/client/history`

### Admin Area

- `/admin`
- `/admin/dashboard`
- `/admin/users`
- `/admin/companies`
- `/admin/approved-companies`
- `/admin/approvals`
- `/admin/user-management`
- `/admin-dashboard`

### User Feedback Area

- `/user/feedbacks`
- `/user/feedback/[id]`

## Analytics Workflow

The analytics layer is computed client-side using internal logic and chart libraries.

1. Load campaigns from the feedback store.
2. Build campaign response timelines from response data.
3. Compute KPIs such as engagement, sentiment, trend direction, consistency, peak contribution, and drop-off.
4. Generate comparative summaries and ranking in compare mode.
5. Render trend and sentiment charts with Recharts.
6. Generate export-ready report views.
7. Convert report views to PDF with html2canvas and jsPDF.

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+

### Install

```powershell
pnpm install
```

### Run Locally

```powershell
pnpm dev
```

Open `http://localhost:3000`.

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Start development server |
| `pnpm build` | Build production bundle |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |

## Notes

- Some feature behavior is local-storage driven for rapid development.
- Route aliases such as top-level client pages and nested client pages both exist in this codebase.
- Keep this README updated when adding or removing App Router `page.tsx` entries.