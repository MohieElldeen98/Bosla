# Bosla — Architecture

> Status: planning document. Section 1 describes what actually exists in the
> repository today. Everything after that is proposed architecture for future
> phases — nothing beyond §1 is implemented.

## 1. Current state (what actually exists today)

This is a factual snapshot of the repo as of this document, so future work has a
known baseline to extend rather than guess at.

**Stack:**

- Next.js 15 (App Router), TypeScript, Tailwind CSS v4
- `next-intl` for i18n — locales `en` (default) and `ar`, routed as `/en` and `/ar`
  via `src/middleware.ts` and `src/i18n/routing.ts`
- shadcn/ui components on top of `@base-ui/react` primitives (`src/components/ui/*`)
- Framer Motion for entrance/hover animation
- Drizzle ORM + `postgres` driver (`drizzle.config.ts`, `src/db/`) — real
  tables: `profiles` (`src/db/schema/profiles.ts`) plus eight CMS tables
  (`src/db/schema/cms.ts` — `cms_pages`, `cms_sections`,
  `cms_navigation_items`, `cms_media_assets`, `cms_seo_meta`,
  `cms_site_settings`, `cms_page_versions`, `cms_audit_logs`), all migrated
  in `drizzle/`, plus a shadow reference to Supabase's own `auth.users` for
  the profile foreign key. Courses/orders/etc. have no table yet.
- `@supabase/supabase-js` + `@supabase/ssr` clients (`src/lib/supabase/client.ts`,
  `server.ts`) back a full, real **authentication + profile architecture**
  (`src/auth/`, `src/middleware/`, `src/lib/auth/`, `src/db/` — see
  [`authentication-architecture.md`](./authentication-architecture.md)) with
  working sign-up/sign-in/forgot-password/reset-password/verify-email pages
  and automatic profile creation, **and a real, independently-usable CMS
  foundation** (`src/cms/` — repositories, services, Server Actions,
  Zod-validated per-section-type content — see
  [`cms-overview.md`](./cms-overview.md)), now driving the live homepage
  (Step 6.2), **an Admin Panel shell** (Step 6.3 —
  `src/app/[locale]/(admin)/admin/*`, `src/components/admin/*`, see
  [`authentication-architecture.md`](./authentication-architecture.md)
  §15): routing, role-gated layout shell (sidebar/header/breadcrumb), 13
  still-placeholder pages, **and one real editor** — `/admin/homepage`
  (Step 6.4, see [`cms-overview.md`](./cms-overview.md) §13): Save/Cancel/
  dirty-state/validation/toast forms for every homepage section and its SEO
  record, all through the same CMS Server Actions the migration in §12
  established, **plus a draft/preview/publish/revert/versioning layer**
  (Step 6.5, see [`cms-overview.md`](./cms-overview.md) §15): the editor's
  saves stay a draft (`cms_pages`/`cms_sections`/`cms_seo_meta`, unchanged
  from Step 6.4) until Publish writes an immutable snapshot to the new
  `cms_page_versions` table; the public homepage now reads only that
  published snapshot, Preview reuses the same public rendering pipeline via
  Next.js Draft Mode to show the draft, and Revert restores the draft to
  the latest published snapshot, **and a QA/hardening pass** (Step 6.6, see
  [`cms-overview.md`](./cms-overview.md) §16): an append-only audit trail
  (`cms_audit_logs`) for every homepage CMS action, optimistic-concurrency
  conflict detection on section/SEO saves and on publish/revert (so one
  admin's save or publish can no longer silently overwrite another's),
  and a resilience/performance/security/accessibility review, **and an
  authentication-aware public navbar** ("Session Navigation & User Menu"):
  the marketing navbar now shows a user dropdown (avatar initials, display
  name, Profile/My Dashboard/Account Settings/Sign Out, Admin Panel for
  admin/super_admin) instead of Sign In/Get Started once a session exists —
  read client-side via the pre-existing `useSession()` hook, not a
  server-rendered prop, so the homepage's ISR/static caching is unaffected
  (`src/components/layout/navbar.tsx`) — and `/dashboard`, `/profile`,
  `/settings` exist as simple "Coming Soon" placeholders reachable from it
  (see [`roles-and-permissions.md`](./roles-and-permissions.md) §3). No
  Media Library, uploader, or Course/Instructor picker exists yet. Still no
  real student/instructor dashboard functionality — those three routes are
  placeholders only.
- **Course Domain** (Phase 3): `specialties`/`categories`/`instructors`/
  `courses` tables are real (Step 3.1), with a full Admin Course
  Management UI on top — a real listing at `/admin/courses` (Step 3.2:
  pagination/search/filters/sort/archive/restore/delete) and a real
  Course Editor at `/admin/courses/new`/`/admin/courses/[id]/edit` (Step
  3.3: every field, optimistic concurrency, its own `course_audit_logs`
  trail, and a reused SEO section — the same `cms_seo_meta`/`SeoForm` the
  Homepage Editor uses, since that table was already designed to be
  reusable beyond `cms_pages`) — **and now the public side too** (Step
  3.4): `/courses` (catalog: pagination/search/filters/sort, `published`
  + active-referenced-entities only) and `/courses/[slug]` (details, with
  full dynamic `generateMetadata` reusing the same `cms_seo_meta` record),
  both under the `(public)` route group, ISR-revalidated like the
  homepage. `CourseService.searchResolved` (Step 3.2) is reused as-is for
  both the admin listing and the public catalog — one paginated/resolved
  query, not two. The marketing homepage's own "Featured Courses" section
  still reads `src/data/*.ts` mock data unchanged (see below); re-pointing
  *that* section to real courses is still-ahead Phase 3 work
  (`roadmap.md`) — Step 3.4 only built the new, separate public pages.
- **Student Learning Domain** (Phase 4, `src/learning/`): `modules`/
  `lessons`/`enrollments`/`lesson_progress`/`quizzes`/`quiz_questions`/
  `quiz_attempts` tables are real (Step 4.1, backend only), with the
  first real UI on top now too (Step 4.2): `/admin/enrollments` — an
  Admin can manually grant/revoke a student's course access (listing,
  create form, detail view; Revoke/Restore is a soft `status` flip with
  its own optimistic concurrency and `learning_audit_logs` trail, not a
  delete). Two authorization shapes coexist in this domain on purpose:
  course *content* (Module/Lesson/Quiz) reuses
  `requireCourseManagementAccess` from the Course Domain as-is, while
  student-*owned* activity (Enrollment/Lesson Progress/Quiz Attempt) uses
  a new `canAccessStudentData` check mirroring Auth's `canModifyProfile`
  (self or Admin). No Student Dashboard, Course Player, or Curriculum
  Editor admin UI yet.
- React Hook Form + Zod installed and used once today (the footer newsletter form)
- Fonts: Inter (`en`) / IBM Plex Sans Arabic (`ar`), swapped via a shared
  `--font-sans` CSS variable in `src/app/[locale]/layout.tsx`

**What's rendered today:** a single marketing homepage
(`src/app/[locale]/page.tsx`) composed of section components
(`src/components/sections/*`), reading its sections, navigation, footer
settings, and SEO metadata from the real CMS tables via
`Repository → Service → Server Component`, the same layering as auth —
specifically, the latest **published** `cms_page_versions` snapshot (Step
6.5, see [`cms-overview.md`](./cms-overview.md) §15), not the live draft
tables directly (Step 6.2, §12). Admins previewing a draft see the same
component tree fed by the draft tables instead, via Next.js Draft Mode.
Course/instructor data (`src/data/*.ts`, `src/mock/instructors.mock.ts`) is
still static/mock — courses and instructor profiles have no table yet. The
homepage is ISR-revalidated (`export const revalidate = 60` in `page.tsx`)
for the published/public case, not purely static, so a publish's
`revalidatePath` call surfaces immediately rather than waiting for the next
window; auth/profile pages, middleware, and Preview mode remain the only
per-request-dynamic reads.

**What does not exist yet:** any *real* student/instructor dashboard
functionality (`/dashboard`, `/profile`, `/settings` are placeholders only —
see above), the Instructor Panel (`/instructor` has a route guard and no
pages), Modules/Lessons (a published course's detail page has no actual
lesson content or player), any payment
integration.
This document proposes how those get built without discarding what's above.

## 2. Bilingual content strategy

Two different problems require two different solutions — conflating them is the
most common mistake in bilingual product architecture:

**A. Static UI chrome** (button labels, nav items, section headings, validation
messages, error copy) — already solved. It lives in `messages/{locale}/*.json`,
organized by feature folder (`common`, `navigation`, `footer`, `home`, `courses`,
`auth`, `dashboard`), loaded through `next-intl`. This pattern is correct and
should be extended, not replaced, as `auth`/`dashboard` namespaces gain real
content in later phases.

**B. Dynamic, database-backed content** (a course title, a lesson description, an
article body, a CMS-edited homepage section) — not yet needed, because no dynamic
content exists yet. When it's introduced (Phase 1 of the roadmap), the
recommendation is:

> **Store translations as a JSONB column per translatable field**, e.g. a
> `courses.title` column holds `{"en": "ICU Physiotherapy", "ar": "العلاج..."}`,
> rather than either (a) parallel columns (`title_en`, `title_ar`) or (b) a fully
> normalized `translations` side-table (`entity_type`, `entity_id`, `locale`,
> `field`, `value`).

Rationale: parallel columns don't scale past two locales and force a migration
for every new language. A side-table is the "textbook correct" answer but adds a
join to every read and real complexity for a two-locale product. JSONB-per-field
gives locale flexibility (add a third language without a migration) while keeping
reads a single-table query. **Revisit this decision if Bosla ever needs more than
~4-5 locales** — at that point a side-table earns its complexity back by making
"which fields are missing a translation" a queryable question.

Whichever pattern is chosen, the rule is: **the database never stores
locale-specific routing or UI copy** (that stays in `messages/`) — it only stores
locale-specific *content* (course titles, lesson bodies, article text, CMS section
copy).

## 3. Application surfaces (future route map)

Bosla grows from one surface (marketing) into four. Proposed top-level routing,
all still under the existing `/[locale]/...` prefix so bilingual routing and RTL
keep working everywhere without change:

| Surface | Route prefix | Audience | Rendering |
|---|---|---|---|
| Marketing site | `/[locale]/` | Guests | Static/SSG + ISR for course pages once catalog is DB-driven |
| Auth | `/[locale]/(auth)/sign-in`, `/sign-up`, `/reset-password` | Guests | Server-rendered forms |
| Student Dashboard | `/[locale]/dashboard/*` | Students | Dynamic, authenticated |
| Instructor Panel | `/[locale]/instructor/*` | Instructors | Dynamic, authenticated |
| Admin Panel | `/[locale]/admin/*` | Admin, Super Admin | Dynamic, authenticated — **shell (Step 6.3) + Homepage editor (Step 6.4) real**, other section editors not built |

Each authenticated surface is a **route group** with its own layout that enforces
role access at the layout level (before render, not just by hiding nav
links) — see [`roles-and-permissions.md`](./roles-and-permissions.md) §3 for the
exact access rule per route, including the one exception (`/admin` shows an
explicit Forbidden page for a wrong-role visitor instead of redirecting).

Marketing pages that today read from `src/data/*.ts` will, in Phase 1, read the
same shape of data from the database instead — the section components
(`FeaturedCourses`, `Testimonials`, etc.) are intentionally already decoupled from
where their data comes from, so this becomes a data-fetching change, not a UI
rewrite.

## 4. Authentication & authorization

> The architecture described in this section is implemented — see
> [`authentication-architecture.md`](./authentication-architecture.md) for
> the full layer breakdown. What's proposed here is now built; only the UI
> that calls it is not.

- **Provider:** Supabase Auth. Supports email/password at launch; social
  providers (Google) are a low-effort later addition since Supabase Auth
  supports them natively.
- **Session handling:** `@supabase/ssr` cookie-based sessions, read in Next.js
  middleware and Server Components — this is why the client/server Supabase
  helpers already exist as a pair (`client.ts` for Client Components, `server.ts`
  for Server Components/Route Handlers).
- **Authorization (roles):** a `role` column on the `users` table (see
  database-overview.md), checked in each protected layout. Start with a simple
  enum column; only introduce a full permissions table (role → permission
  many-to-many) if/when a role's capabilities need to be configurable by a Super
  Admin without a code change (see roadmap Phase 5+).
- **Row-level security:** Supabase/Postgres RLS policies are the intended
  enforcement layer for direct data access (defense in depth alongside
  application-level checks), scoped per table when each table is introduced.

## 5. Payment architecture (design only — not implemented)

Bosla must support three payment providers without the checkout flow, order
model, or UI caring which one is active:

- **Stripe** — international cards, primary for non-MENA customers.
- **Paymob** — MENA-region cards + wallets, primary for the Egyptian market.
- **Fawry** — cash-voucher / reference-number payments, common in Egypt for
  customers without cards.

**Proposed pattern: a provider-agnostic `PaymentGateway` interface**, implemented
once per provider, selected at checkout time by currency/region/user choice:

```
PaymentGateway
 ├─ createCheckoutSession(order): CheckoutSession
 ├─ verifyWebhookSignature(request): boolean
 └─ handleWebhookEvent(payload): PaymentResult   // → updates Order/Payment status
```

- The `Order` entity is created **before** redirecting to any provider, in a
  `pending` state. No provider is ever a source of truth for "does this order
  exist" — only for "has it been paid."
- Each provider's webhook handler is a thin adapter that verifies the signature,
  maps the provider's payload to a common `PaymentResult` shape, and hands off to
  one shared "mark order paid / enroll student" function. This is what prevents
  three near-duplicate checkout implementations as providers are added one at a
  time (Paymob and Fawry first, given the target market; Stripe when
  international expansion needs it — see roadmap Phase 3).
- Coupons are resolved and locked into the `Order` at creation time (price at
  time of purchase), never recalculated from a live coupon at webhook time.
- No payment provider SDK should be imported outside its own adapter module —
  this is the boundary that keeps swapping/adding providers a contained change.

## 6. CMS architecture

> The foundation (Step 6.1) and the live homepage migration (Step 6.2) are
> both implemented — see [`cms-overview.md`](./cms-overview.md) for the full
> layer breakdown and §13 for what the migration changed. The admin panel
> UI that edits this content is still not built — today's seeded content
> was written by a one-time script, not a form.

Bosla's CMS is **custom-built, backed by the same Postgres
database** — not a third-party headless CMS (Contentful, Sanity, etc.). Rationale:
most "content" in Bosla (courses, instructors, orders) is deeply relational to
commerce and roles in a way generic headless CMSs don't model well, and running a
second content system alongside the primary database would duplicate the
translation strategy, auth, and media storage for no real benefit at this scale.

The one place a lightweight "content modeling" pattern earns its keep is the
**homepage / marketing pages**, which are genuinely closer to a page builder than
to commerce data. `src/cms/` follows the exact same Repository → Service →
Server Action layering as `src/auth/`: `cms/repositories/*` are pure Drizzle
data access, `cms/services/*` own validation (via the per-section-type Zod
registry in `cms/validators/section-content.schemas.ts`), locale resolution,
and authorization (`requireCmsAccess`, reusing `SessionService`/
`role.utils.ts` — no separate CMS auth logic), and `cms/actions/*` are thin
`"use server"` wrappers with nothing calling them yet. See
[`cms-overview.md`](./cms-overview.md) for the section-block model that
supports this without building a general-purpose page builder.

**Media** is stored via Supabase Storage (already the natural choice given
Supabase is already the auth provider), referenced from the database by URL/path,
never stored as binary data in Postgres.

## 7. Engineering principles for future phases

- **Extend `messages/` namespaces, don't restructure them.** `auth` and
  `dashboard` already exist as empty namespace files precisely so Phase 1+ work
  drops content into an established pattern instead of inventing a new one.
- **New entities get their own Drizzle schema file** under `src/db/schema/`
  (e.g. `courses.ts`, `orders.ts`) once `schema.ts` would otherwise become a
  monolith — split by domain, not by table count.
- **One `PaymentGateway` adapter per provider**, never provider-specific code in
  checkout UI or webhook routing.
- **Route groups enforce access**, not conditional UI — a student hitting
  `/admin/*` should be redirected before any admin data is fetched, not shown a
  broken page with hidden buttons.
- **No feature reaches for a new external service** if the existing stack
  (Postgres/Drizzle, Supabase Auth/Storage) already solves it — this keeps the
  operational surface small while the team is small.

## 8. Related documents

- [`product-blueprint.md`](./product-blueprint.md) — product vision and entity
  definitions.
- [`database-overview.md`](./database-overview.md) — full entity/field/relationship
  catalog implied by this architecture.
- [`cms-overview.md`](./cms-overview.md) — the section-block CMS model in detail.
- [`roles-and-permissions.md`](./roles-and-permissions.md) — access rules per
  route/surface.
- [`authentication-architecture.md`](./authentication-architecture.md) — the
  implemented auth layer (types, services, guards, middleware) this section
  summarizes.
- [`roadmap.md`](./roadmap.md) — the order these phases actually get built in.
