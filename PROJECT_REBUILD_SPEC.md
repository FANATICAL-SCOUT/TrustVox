> **Archived — historical planning document.** This was the original pre-rebuild specification, written before Phases 1–6 of the Ledger redesign. It's kept for historical reference only and is **not maintained** — several routes and files it describes (`package-lock.json`, `reference-ui/`, `hooks/`, `/payment`, `/create-campaign`, `/previous-campaigns`, `/client-companies`, and others) have since been removed or restructured. For current, accurate project status, always use [`docs/TRACKER.md`](docs/TRACKER.md) and the rest of the `docs/` folder — see [`README.md`](README.md) for the up-to-date overview.

# TrustVox Platform v5 - Full Reconstruction Specification

## 1. Product Overview and Purpose

TrustVox Platform v5 is a role-based feedback operations web application. It supports three actor types:

1. End users who submit structured feedback and track rewards/streaks/history.
2. Client companies who build feedback forms and campaigns, then submit them for moderation.
3. Admin operators who approve, reject, and govern both forms and company eligibility.

The current codebase is a production-grade frontend foundation with rich UX and detailed client-side workflow logic. Most persistence and identity behavior are local browser storage based and must be replaced with backend services for production deployment.

Primary product objective:

1. Collect high-quality structured feedback from users.
2. Route submissions through moderated publishing workflow.
3. Provide analytics and campaign control to clients.
4. Provide governance controls to admins.

## 2. Top-Level Structure

Root files:

1. .gitignore
2. components.json
3. next-env.d.ts
4. next.config.mjs
5. package.json
6. pnpm-lock.yaml
7. package-lock.json
8. postcss.config.mjs
9. README.md
10. tailwind.config.ts
11. tsconfig.json

Source directories:

1. app
2. components
3. hooks
4. lib
5. utils
6. public

## 3. App Router Route Inventory and Function

### 3.1 Core shell and runtime wrappers

1. app/layout.tsx: Root HTML layout, metadata, font, and global styling entry.
2. app/globals.css: Full global design system styling, animated backgrounds, utility classes.
3. app/page.tsx: Root redirect to login route.
4. app/not-found.tsx: Custom 404 page.
5. app/providers.tsx: provider composition wrapper.
6. app/client-auth-provider.tsx: lightweight client auth probe.

### 3.2 Authentication routes

1. app/login/page.tsx: Main combined authentication flow for user/client/admin with sign in and sign up modes.
2. app/signin/page.tsx: Placeholder sign-in route.
3. app/client-login/page.tsx: Placeholder client login route.
4. app/admin-login/page.tsx: Placeholder admin login route.
5. app/client-signup/page.tsx: Placeholder client signup route.
6. app/admin-signup/page.tsx: Placeholder admin signup route.

### 3.3 User-facing routes

1. app/dashboard/page.tsx: User workspace orchestrator and section switching host.
2. app/dashboard/loading.tsx: Dashboard loading UI.
3. app/submit/page.tsx: Direct submit page wrapper.
4. app/suggested/page.tsx: Direct suggested opportunities wrapper.
5. app/history/page.tsx: Feedback history wrapper.
6. app/profile/page.tsx: User profile wrapper.
7. app/user/feedbacks/page.tsx: Approved feedback opportunities listing and search.
8. app/user/feedback/[id]/page.tsx: Dynamic form execution and submission route.

### 3.4 Client-facing routes

1. app/client-home/page.tsx: Client home with campaign entry actions and profile summary.
2. app/client-dashboard/page.tsx: Client analytics dashboard.
3. app/client-companies/page.tsx: Company cards and company-level actions.
4. app/create-campaign/page.tsx: Campaign builder wizard.
5. app/previous-campaigns/page.tsx: Historical campaign/report listing.
6. app/client/home/page.tsx: alias route to client home.
7. app/client/analytics/page.tsx: alias route to client dashboard.
8. app/client/forms/page.tsx: Form lifecycle board for client-owned forms.
9. app/client/create-feedback/page.tsx: Advanced form builder and template workflow.
10. app/client/campaigns/page.tsx: alias route to forms board.
11. app/client/profile/page.tsx: Client profile editor and persistence.
12. app/client/settings/page.tsx: Client settings/preferences route.

### 3.5 Admin-facing routes

1. app/admin-dashboard/page.tsx: Admin command center with tabbed operations.
2. app/admin/approvals/page.tsx: Core moderation queue and status transitions.
3. app/admin/approved-companies/page.tsx: Approved-company governance.
4. app/admin/moderation/page.tsx: Moderation entry hub.
5. app/admin/reports/page.tsx: Reporting entry hub.
6. app/admin/user-management/page.tsx: User governance and block/unblock actions.
7. app/admin/users/page.tsx: alias route to user-management.

### 3.6 Misc pages

1. app/contact/page.tsx: Contact form and company info display.
2. app/payment/page.tsx: Pricing and payment portal UX.

## 4. Components Architecture

### 4.1 Role navigation and shell components

1. components/user-navbar.tsx
2. components/client-navbar.tsx
3. components/admin-navbar.tsx
4. components/top-navbar.tsx
5. components/collapsible-navbar.tsx

### 4.2 User journey components

1. components/landing-section.tsx
2. components/submit-feedback.tsx
3. components/suggested-feedback.tsx
4. components/feedback-history.tsx
5. components/user-profile.tsx
6. components/submit-feedback.failsafe.backup.tsx

### 4.3 Search and interaction helpers

1. components/search-with-autocomplete.tsx
2. components/search-bar.tsx
3. components/campaign-search-bar.tsx
4. components/expandable-campaign-search.tsx
5. components/interest-selector.tsx
6. components/captcha.tsx
7. components/email-sign-on.tsx
8. components/client-company-profile.tsx

### 4.4 Modal subsystem

1. components/modals/chat-modal.tsx
2. components/modals/company-details-modal.tsx
3. components/modals/detailed-report-modal.tsx
4. components/modals/notifications-modal.tsx

### 4.5 Client feature module

1. components/client/feedback-templates.tsx

### 4.6 UI primitives

components/ui contains shadcn/radix primitives including button, input, card, dialog, select, table, chart, tabs, toast, and many interaction primitives.

## 5. Domain Logic Layer

### 5.1 Authentication and session

File: lib/auth-utils.ts

Main responsibilities:

1. Store and retrieve current user/client/admin profiles.
2. Persist simple login state and role tags.
3. Maintain local password history records by email.
4. Clear session values on logout.

Storage keys used:

1. isLoggedIn
2. userType
3. userEmail
4. currentUser
5. currentClient
6. currentAdmin
7. passwordHistory

### 5.2 Feedback forms and responses domain

File: lib/feedback-store.ts

Main responsibilities:

1. Define domain types for questions, forms, statuses, and responses.
2. Seed initial example forms.
3. Implement form CRUD, submission, approval, rejection, and request-change transitions.
4. Enforce approved-company mapping logic during approval/submission.
5. Persist and increment response counts.
6. Emit custom events for state synchronization.

Storage keys and events:

1. trustvox_feedback_forms
2. trustvox_feedback_responses
3. trustvox:forms-updated

### 5.3 Approved companies and managed users domain

File: lib/approved-company-store.ts

Main responsibilities:

1. Seed approved company catalog by category.
2. Seed managed users list.
3. Add and update company records.
4. Toggle company active/inactive states.
5. Update user status Active or Blocked.
6. Emit and subscribe to update events.

Storage keys and events:

1. trustvox_approved_companies
2. trustvox_managed_users
3. trustvox:companies-updated
4. trustvox:users-updated

### 5.4 Quota and streak domain

File: lib/feedback-quota.ts

Main responsibilities:

1. Enforce daily free-user submission limit.
2. Track completedToday, completedTotal.
3. Track streak continuity across dates.
4. Provide consume and subscribe APIs.

Storage key and event prefix:

1. trustvox:feedback-quota:v1:
2. trustvox:feedback-quota-updated

### 5.5 Notification domain

File: lib/user-notifications.ts

Main responsibilities:

1. Maintain user notifications list and read state.
2. Track pending rewards and release windows.
3. Generate notifications for:
   1. Survey completed and reward pending.
   2. Reward credited after delay.
   3. New approved feedback opportunities.
   4. Streak risk reminders.
4. Subscribe and emit updates for UI refresh.

Storage key/event:

1. trustvox:user-notifications:v1:
2. trustvox:user-notifications-updated

### 5.6 Utility modules

1. lib/utils.ts: className merge helper for Tailwind and clsx.
2. utils/feedback-utils.ts: helper callbacks for save for later and section state.
3. hooks/use-mobile.tsx: viewport/mobile helper.
4. hooks/use-toast.ts: toast state helper.

## 6. Implemented Feature Matrix

### 6.1 Authentication and role routing

1. Login/signup UI for three actor types.
2. Local identity persistence and role tagging.
3. Route redirection by role outcomes.

### 6.2 User-side capabilities

1. Feedback discovery from approved forms.
2. Search and category filtering.
3. Dynamic per-form question execution.
4. Submission validation.
5. Daily quota enforcement.
6. Streak progression tracking.
7. History and draft experiences.
8. Suggestion cards and save-for-later UX.

### 6.3 Client-side capabilities

1. Campaign creation wizard route.
2. Advanced form builder with multiple question types.
3. Draft, update, delete form lifecycle.
4. Submit for admin approval.
5. Status board and filter tabs.
6. Analytics dashboards and campaign list screens.
7. Client profile and settings persistence.

### 6.4 Admin-side capabilities

1. Moderation queue for pending forms.
2. Approve, reject, request changes transitions.
3. Preview forms prior to decision.
4. Approved-company governance with activation toggles.
5. User management and block/unblock workflow.
6. Moderation and reporting landing pages.

## 7. Technology Stack

### 7.1 Frontend

1. Next.js 15 App Router.
2. React 19.
3. TypeScript 5.

### 7.2 Styling and design system

1. Tailwind CSS.
2. Shadcn UI component composition.
3. Radix UI primitives.
4. Lucide icon library.

### 7.3 Supporting libraries

1. react-hook-form
2. zod
3. @hookform/resolvers
4. recharts
5. sonner
6. date-fns
7. clsx
8. class-variance-authority
9. tailwind-merge

### 7.4 Backend and database

No server-side database integration is currently implemented. Persistence is local browser storage.

## 8. Component and Page Connectivity

### 8.1 User flow connectivity

1. app/dashboard/page.tsx composes user-navbar and section components.
2. landing-section and suggested-feedback trigger callbacks to submit flow and modals.
3. user/feedbacks route reads approved forms from feedback-store.
4. user/feedback/[id] route submits to feedback-store and calls quota + notification domains.

### 8.2 Client flow connectivity

1. client-navbar controls route-level navigation.
2. client/create-feedback writes to feedback-store.
3. client/forms reads and transitions status in feedback-store.
4. client profile/settings persist local preferences.

### 8.3 Admin flow connectivity

1. admin-navbar routes to approvals, moderation, reports, users.
2. admin/approvals mutates feedback-store transitions.
3. admin/approved-companies mutates approved-company-store.
4. admin/user-management mutates managed user status in approved-company-store.

### 8.4 Cross-screen synchronization

1. CustomEvent emissions after store writes.
2. Storage event listeners for cross-tab synchronization.
3. subscribe helper APIs in each domain store.

## 9. Data Model Contracts (Current Frontend Domain Models)

### 9.1 Feedback domain

Question:

1. id: string
2. type: star-rating | text-short | text-long | multiple-choice | multi-select | tag-selection | voice-feedback
3. title: string
4. required: boolean
5. options: string[]

FeedbackForm:

1. id: string
2. title: string
3. description: string
4. product: string
5. category: string
6. categoryDetails?: string
7. companyId?: string
8. questions: Question[]
9. status: draft | pending | approved | rejected
10. clientId: string
11. clientName: string
12. createdAt: string
13. submittedAt?: string
14. approvedAt?: string
15. rejectionReason?: string
16. requestChangesNote?: string
17. responseCount: number

FormResponse:

1. id: string
2. formId: string
3. answers: Record<string, unknown>
4. submittedAt: string
5. userId?: string

### 9.2 Company and user governance domain

ApprovedCompany:

1. id: string
2. name: string
3. category: string
4. status: active | inactive
5. dateAdded: string
6. baselineActiveCampaigns: number
7. baselineTotalCampaigns: number

ManagedUser:

1. id: string
2. name: string
3. email: string
4. role: User | Client | Admin
5. status: Active | Blocked
6. feedbackSubmittedCount: number
7. lastActiveAt: string

### 9.3 Quota domain

FeedbackQuotaState:

1. date: string
2. remaining: number
3. completedToday: number
4. completedTotal: number
5. streakCount: number
6. lastSubmittedDate: string | null

### 9.4 Notifications domain

UserNotification:

1. id: string
2. type: reward_pending | reward_credited | new_opportunity | streak_risk
3. title: string
4. message: string
5. createdAt: string
6. isRead: boolean
7. action?: route/form linkage

## 10. Backend and Database Integration Status

Current status:

1. No external backend API integration.
2. No SQL/NoSQL database integration.
3. No server-side authentication provider.
4. No persistent multi-user state beyond browser storage.

Implication for production:

1. Existing domain contracts should be retained.
2. Store functions should be reimplemented as API client adapters.
3. Security-sensitive flows must move server-side.

## 11. UI/UX Interaction Flows

### 11.1 User journey

1. Enter app root.
2. Redirect to login route.
3. Authenticate as user role.
4. Enter dashboard and navigate sections.
5. Discover opportunities or open user/feedbacks listing.
6. Open specific form route by id.
7. Answer each question step-by-step.
8. Submit and trigger response persistence + quota + notification.
9. View updated history and streak state.

### 11.2 Client journey

1. Authenticate as client.
2. Enter client home.
3. Build campaign/forms from create routes.
4. Save draft and iterate.
5. Submit forms for approval.
6. Track statuses in forms board.
7. Open analytics dashboard.
8. Manage profile and settings.

### 11.3 Admin journey

1. Authenticate as admin.
2. Open dashboard and moderation center.
3. Review pending forms in approvals queue.
4. Preview each form before action.
5. Approve/reject/request changes.
6. Manage approved company activation states.
7. Manage user statuses.

## 12. API Contract Plan for Production Rebuild

Recommended API surface preserving current frontend behavior:

### 12.1 Auth APIs

1. POST /api/auth/login
2. POST /api/auth/signup
3. POST /api/auth/logout
4. GET /api/auth/session

### 12.2 Forms APIs

1. GET /api/forms
2. GET /api/forms/{id}
3. POST /api/forms
4. PATCH /api/forms/{id}
5. DELETE /api/forms/{id}
6. POST /api/forms/{id}/submit
7. POST /api/forms/{id}/approve
8. POST /api/forms/{id}/reject
9. POST /api/forms/{id}/request-changes
10. GET /api/forms/{id}/responses
11. POST /api/forms/{id}/responses

### 12.3 Companies and users APIs

1. GET /api/companies
2. POST /api/companies
3. PATCH /api/companies/{id}
4. POST /api/companies/{id}/toggle-status
5. GET /api/admin/users
6. PATCH /api/admin/users/{id}/status

### 12.4 Quota and notifications APIs

1. GET /api/users/me/quota
2. POST /api/users/me/quota/consume
3. GET /api/users/me/notifications
4. POST /api/users/me/notifications/mark-read
5. POST /api/users/me/notifications/mark-all-read

## 13. Database Schema Plan for Production Rebuild

### 13.1 Core tables

1. users
2. sessions
3. companies
4. forms
5. form_questions
6. form_responses
7. form_response_answers
8. user_quota_daily
9. user_notifications
10. rewards
11. audit_logs

### 13.2 Key relationships

1. users 1:N forms (client owner).
2. companies 1:N forms.
3. forms 1:N form_questions.
4. forms 1:N form_responses.
5. form_responses 1:N form_response_answers.
6. users 1:N user_notifications.

## 14. Migration Map from Current Stores to Backend Services

### 14.1 auth-utils migration

Current function groups:

1. get/set stored user/client/admin.
2. isUserLoggedIn.
3. clearUserSession.

Migration target:

1. Replace localStorage read/write with session token + server session endpoint.
2. Keep frontend call sites stable using adapter methods with same names where possible.

### 14.2 feedback-store migration

Current function groups:

1. form CRUD.
2. transitions submit/approve/reject/request changes.
3. response submit.
4. subscriptions.

Migration target:

1. Replace storage operations with REST calls.
2. Maintain event-driven UI updates via query invalidation or websocket push.

### 14.3 approved-company-store migration

Current function groups:

1. company CRUD and status toggles.
2. managed user status updates.

Migration target:

1. Replace with admin endpoints and role-based authorization checks.

### 14.4 feedback-quota migration

Current function groups:

1. get quota.
2. consume quota.
3. streak updates.

Migration target:

1. Move quota/streak logic server-side in transactional update.
2. Return computed quota state to frontend after submission.

### 14.5 user-notifications migration

Current function groups:

1. create/read notifications.
2. reward scheduling.
3. unread counts.

Migration target:

1. Persist in notifications table.
2. process delayed reward credit via background job.

## 15. Full Rebuild Order (Module-by-Module)

### Phase 1: foundation

1. Initialize Next.js App Router project.
2. Configure Tailwind and shadcn.
3. Implement root shell files and global styles.
4. Install and wire core UI primitives.

### Phase 2: domain contracts and data layer

1. Create shared TypeScript domain interfaces.
2. Implement API client layer and mock adapters.
3. Recreate auth, forms, companies, quota, notifications services.

### Phase 3: authentication and route skeleton

1. Implement login page and role routing.
2. Create route groups and empty page scaffolds for all existing paths.

### Phase 4: user module

1. Build user dashboard orchestrator.
2. Build submit/suggested/history/profile components.
3. Build user/feedbacks listing and dynamic feedback form execution route.
4. Integrate quota and notifications.

### Phase 5: client module

1. Build client navbar and client home.
2. Build create-campaign wizard route.
3. Build advanced form builder route.
4. Build forms board with status management.
5. Build analytics, profile, and settings routes.

### Phase 6: admin module

1. Build admin navbar and dashboard.
2. Build approvals queue and actions.
3. Build approved-companies governance route.
4. Build user management route.
5. Build moderation/reports entry pages.

### Phase 7: cross-cutting

1. Add loading and not-found states.
2. Add error boundaries and telemetry hooks.
3. Add route guards by role.

### Phase 8: production hardening

1. Enable strict type checks and lint checks for build.
2. Add API auth middleware and RBAC.
3. Add integration tests for lifecycle transitions.
4. Add security headers and audit logging.

## 16. Quality and Risk Notes for Production Team

1. Build configuration currently ignores TypeScript and ESLint errors in next.config.mjs. This must be reversed for production hardening.
2. Several auth routes are placeholders while main auth is centralized in app/login/page.tsx.
3. There are route aliases that intentionally duplicate entry points for compatibility.
4. Current local-only state permits rapid prototyping but no multi-user consistency guarantee.

## 17. Deliverables to Create in New Environment

1. Route parity map matching every current app route.
2. Shared domain package containing all interfaces.
3. API layer with endpoint parity to migration plan.
4. Data migrations and seeded reference data.
5. End-to-end tests for:
   1. user feedback submission flow.
   2. client form submit flow.
   3. admin approval flow.
   4. company activation constraints.
   5. quota and notification behavior.

## 18. Minimal Acceptance Criteria for Rebuild Completion

1. Users can submit feedback on approved forms.
2. Clients can create, edit, and submit forms for approval.
3. Admins can approve/reject/request changes on pending forms.
4. Company activation controls affect approval and exposure behavior.
5. Quota and streak logic works against server state.
6. Notifications update correctly for reward and opportunity events.
7. All current routes are accessible and role-guarded.
8. Type and lint checks pass in CI without ignore flags.
`