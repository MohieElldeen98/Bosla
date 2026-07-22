# Bosla — Roadmap

> Status: **Phase 0, Phase 1, and Phase 2 are complete** and are the current
> repository — see each phase below for exactly what's built vs. still left
> within it (Phase 2 in particular still has placeholder pages that Phase 7
> fills in later). Every phase from Phase 3 onward is proposed sequencing,
> not a commitment to exact dates. Ordering is chosen to de-risk the
> hardest/most valuable question at each step before investing in the next
> layer, and — as of Phase 1/2 — now also reflects the order Bosla was
> actually built in, not just a plan.

## Phase 0 — Marketing Website Foundation ✅ (done)

What exists today: Next.js 15 + next-intl bilingual (`en`/`ar`) marketing
homepage, premium UI, RTL/LTR support, SEO metadata, and Bosla's brand identity —
all backed by static mock data. See [`architecture.md`](./architecture.md) §1 for
the exact inventory.

**Why this came first:** validates brand, positioning, and bilingual UX with zero
backend risk before any data model is committed to.

## Phase 1 — Authentication & Identity ✅ (done)

**Goal:** replace "no backend" with a real, minimal, secure identity layer —
without changing a single pixel of the existing marketing site.

Built (see [`authentication-architecture.md`](./authentication-architecture.md)
in full):

- **Authentication** — Supabase Auth: email/password and Google OAuth,
  sign-up/sign-in/forgot-password/reset-password/verify-email pages, session
  strategy, error handling.
- **Profiles** — the `profiles` table (see
  [`database-overview.md`](./database-overview.md) §1), automatic profile
  creation on sign-up, avatar upload, profile completeness.
- **Roles** — the `student | instructor | admin | super_admin` model (see
  [`roles-and-permissions.md`](./roles-and-permissions.md) §1), kept in sync
  between `profiles.role` and the Supabase JWT (`UserRoleService` — see
  [`authentication-architecture.md`](./authentication-architecture.md) §16).
- **Permissions** — the role permission matrix (see
  [`roles-and-permissions.md`](./roles-and-permissions.md) §2) role checks
  are evaluated against.
- **Route Guards** — middleware + route-group layout guards enforcing
  role-scoped access (see
  [`roles-and-permissions.md`](./roles-and-permissions.md) §3) to `/admin`,
  `/instructor`, `/dashboard`, `/profile`, and `/settings` — the last two,
  plus an authentication-aware public navbar (avatar/user-menu dropdown,
  role-conditional Admin Panel link, Sign Out), were added by the
  "Session Navigation & User Menu" feature as a bridge between Phase 2 and
  Phase 3. `/dashboard`, `/profile`, and `/settings` are still simple
  "Coming Soon" placeholders — their real functionality is Phase 4 (Student
  Experience).
- **Admin Access** — Admin/Super-Admin role recognition wired through the
  same route-guard system. This is the *authorization* layer only; the
  actual Admin Panel UI shell is Phase 2, below.

**Why this came first (right after Phase 0):** every later phase — CMS,
Commerce, the Instructor Panel — needs a real signed-in identity and a role
to check against; building it once, correctly, up front avoids retrofitting
auth into features that assumed it didn't exist.

**Exit criteria:** ✅ met — a real user can sign up, sign in, and reset a
password; every route is protected by the correct role rule; an
Admin/Super-Admin is recognized as such everywhere the app checks.

## Phase 2 — CMS Foundation ✅ (done)

**Goal:** marketing operations no longer depend on engineering for homepage
content changes — proven first on the homepage before extending to the rest
of the CMS surface (Phase 7).

Built (see [`cms-overview.md`](./cms-overview.md) in full):

- **Generic CMS** — the fixed section-type registry and shared building
  blocks (`cms_pages`, `cms_sections`, `cms_seo_meta`, `cms_media_assets`,
  `cms_navigation_items`, `cms_site_settings` — see
  [`database-overview.md`](./database-overview.md) §5) — a fixed content
  model, not a general-purpose page builder.
- **Homepage CMS** — the live homepage migrated off static mock data
  (`src/data/*.ts`) onto these tables.
- **Homepage Editor** (`/admin/homepage`) — real Save/Cancel/dirty-state/
  validation forms for every homepage section and its SEO record; edits
  write directly to the live tables and are immediately what public
  visitors see (a draft/preview/publish/revert/versioning layer was built
  and later removed entirely — see `cms-overview.md` §15).
- **Audit Logs** — an append-only `cms_audit_logs` table recording every
  homepage CMS action (save, toggle, reorder) with actor and timestamp —
  backend infrastructure only, no viewer UI yet (Phase 7).
- **Optimistic Concurrency** — conflict detection on section/SEO saves and
  on publish/revert, so one Admin can no longer silently overwrite
  another's concurrent edit.
- **Admin Shell** — the Admin Panel's routing, role-gated layout
  (sidebar/header/breadcrumb), and 13 still-placeholder pages beyond the
  homepage editor (Phase 7 turns these into real editors).

**Why immediately after Identity, before Core LMS/Commerce:** the homepage
is the highest-traffic, most-frequently-edited surface on day one. Proving
the draft → publish → audit → conflict-safe editing model here, on a small,
well-understood surface, de-risks reusing the exact same model for the rest
of the CMS (Phase 7) and, later, Course authoring (Phase 6), instead of
inventing three different editing systems.

**Exit criteria:** ✅ met — an Admin can edit, preview, and publish a
homepage section, with a full audit trail and no risk of two Admins
silently clobbering each other's work.

## Phase 3 — Core LMS

**Goal:** replace the marketing site's mock course data with a real
catalog — the foundation every later phase (learning, commerce, instructor
authoring) is built on.

- **Specialties**, **Categories**, **Courses**, **Modules**, **Lessons** —
  the core catalog tables (see
  [`database-overview.md`](./database-overview.md) §2).
- **Course Catalog** — re-point the existing marketing sections
  (`FeaturedCourses`, category cards, etc.) and the public course
  detail/catalog pages to read from the database instead of
  `src/data/*.ts` — the components don't change, only where their data
  comes from.
- Seed the initial catalog (the courses live today as mock data) directly
  as database rows, curated by an Admin acting through direct data seeding —
  **not** through an Instructor Panel, which doesn't exist yet (see Phase 6
  rationale).

**Why right after the CMS foundation:** Phase 2 proved the content-editing
model on the homepage; Core LMS is the next foundational data layer
everything else — learning, commerce, instructor authoring — depends on.
Building the schema before those phases avoids forcing a redesign once
they're underway.

**Exit criteria:** the public site looks and reads the same as today, but
every course/specialty/category shown is a real database row.

## Phase 4 — Student Experience

**Goal:** a signed-in Student can actually learn, not just browse.

- Course detail page (public, pre-purchase) and the Student Dashboard's
  Course Player (post-enrollment) — see
  [`roles-and-permissions.md`](./roles-and-permissions.md) §4.
- **Enrollment** — `enrollments` (source: `manual_grant` only at this
  stage — no payments yet).
- **Dashboard** — the real Student Dashboard (Overview, My Learning,
  Orders & Billing once Phase 5 exists) replacing the "Coming Soon"
  placeholder at `/dashboard` built in Phase 1.
- **Course Player** — the real lesson-consumption experience.
- **Progress Tracking** — `lesson_progress`.
- **Quiz** — quizzes/`quiz_attempts`.
- Profile editing and Account Settings functionality, replacing the
  "Coming Soon" placeholders at `/profile` and `/settings` built in Phase 1.

**Why before Commerce:** proves the actual learning experience (the
product's core value) using free/manually-granted enrollments, before
adding the complexity of real money.

**Exit criteria:** an Admin can manually enroll a test student in a course,
and that student can watch lessons, take a quiz, and see progress update —
end to end, no payment involved yet.

## Phase 5 — Commerce

**Goal:** Bosla can take real money for a course that already works
end-to-end (de-risked in Phase 4).

- **Orders** — `orders`, `order_items` (see
  [`database-overview.md`](./database-overview.md) §3).
- **Checkout** — checkout flow, order confirmation, Student Dashboard's
  Orders & Billing page.
- **Coupons** — `coupons`, resolved and locked into the order at creation
  time.
- **Payments** — `payments`, `refunds`, and the `PaymentGateway` abstraction
  from [`architecture.md`](./architecture.md) §5, implemented first for
  **Paymob and Fawry** (primary MENA payment rails for the target market),
  with **Stripe** added when/if international expansion needs it — not the
  other way around, since building Stripe first would optimize for a
  smaller initial audience.

**Exit criteria:** a real student can pay for a real course via at least one
live provider and be enrolled automatically via the webhook → enrollment
path.

## Phase 6 — Instructor Experience

**Goal:** open the marketplace side — instructors publish their own courses
without engineering involvement per course.

- `instructor_profiles`, the approval workflow, and every page in
  [`roles-and-permissions.md`](./roles-and-permissions.md) §5: Course
  Builder (Module → Lesson → Quiz/Resources tree editor), Submit for
  Review, Students, Reviews, Coupons, Earnings, Profile.
- Course state machine (`draft → in_review → published → archived`) and the
  Admin-side approval screen it depends on (pulled forward from Phase 7,
  since it's required for Phase 6 to be useful).

**Why after Commerce, not before:** authoring tooling (a rich
Module/Lesson/Quiz editor) is one of the largest single pieces of
engineering in the whole product. Building it only after the purchase →
learn → pay loop is already proven avoids building an expensive authoring
tool for a commerce model that hasn't been validated yet.

**Exit criteria:** an external instructor can apply, get approved, build a
course entirely through the UI, submit it, get approved, and see it
sellable on the public catalog with zero direct database access from the
Bosla team.

## Phase 7 — Remaining Admin Modules

**Goal:** every Admin Shell placeholder page from Phase 2 becomes a real
editor, and Admin/Super-Admin operations no longer need direct database
access.

- **Media Library** — an uploader/browser UI for `cms_media_assets` (table
  already exists from Phase 2; no admin UI yet).
- **Course Management UI** — moderating/curating the catalog Phase 3
  creates and Phase 6's authoring tooling feeds; also the Admin-side
  course-approval screen pulled forward into Phase 6.
- **Instructor Management** — the Admin-side counterpart to Phase 6's
  applicant/approval workflow.
- **Reviews** — moderation (+ "feature as testimonial" onto the homepage).
- **Navigation** — an editor UI for `cms_navigation_items` (table + public
  read path already exist from Phase 2; no admin UI yet).
- **Landing Pages** — `landing_pages`, reusing the same section-block model
  Phase 2 built for the homepage (see
  [`cms-overview.md`](./cms-overview.md) §11).
- **SEO** — sitewide SEO defaults UI (per-page SEO editing already exists
  from Phase 2's Homepage Editor).
- **Articles** — ✅ done (built ahead of the rest of Phase 7 as the Blog
  module): `articles`/`article_categories`/`article_audit_logs` tables,
  `src/blog/` (Repository → Service → Server Action), a Tiptap rich-text
  Article Editor at `/admin/articles` (+ `/admin/articles/categories`),
  and the public `/blog` + `/blog/[slug]` pages (see
  [`database-overview.md`](./database-overview.md) §5).
- Super-Admin-only modules (see
  [`roles-and-permissions.md`](./roles-and-permissions.md) §3): **Users &
  Roles** (the `UserRoleService` role-sync backend already exists from
  Phase 1 — see
  [`authentication-architecture.md`](./authentication-architecture.md)
  §16 — this phase gives it an admin UI), **Site Settings** (an editor UI
  for `cms_site_settings` — table + public read path already exist from
  Phase 2; no admin UI yet), and **Payment Providers**.

**Exit criteria:** an Admin can upload/manage media, moderate a review into
a homepage testimonial, publish an article and a landing page, edit
navigation/site settings, and a Super-Admin can change a user's role — all
without a deploy or direct database access.

## Phase 8 — Engagement

**Goal:** the features that turn "a course I bought" into "a platform I
trust and keep coming back to."

- **Certificates** — issuance + verification link (currently marketed as
  "launching soon").
- **Notifications** — order confirmations, course updates, new review
  alerts — in-app first.
- **Email** — email notifications as a fast-follow to the in-app feed
  above.
- **Wishlist**.

**Exit criteria:** a student who completes a course receives a verifiable
certificate and a notification, without manual Admin involvement.

## Phase 9 — Scale & Production

**Goal:** grow the catalog and the market, and operate Bosla like a
production system, on top of a proven marketplace.

- **Analytics** — usage/business analytics across the growing catalog and
  student base.
- **Search** — wider search/filtering across the growing catalog (moved
  here from Phase 8, since it's a scale concern, not an initial-engagement
  one).
- **Performance** — revisit anything deferred for good reason earlier:
  multi-currency display, Stripe (if not already added in Phase 5),
  instructor payout automation, and general performance work as usage
  grows.
- **Monitoring** — production observability/alerting.
- Additional specialties beyond Physiotherapy/Nutrition (Sports Medicine,
  Nursing, Occupational Therapy, ...) — a data/content operation, not an
  engineering one, thanks to the `specialties` table design from Phase 3.
- Evaluate [`future-features.md`](./future-features.md) against real usage
  data collected from Phases 4–8 (which of those speculative ideas actual
  instructors and students are asking for).

**Exit criteria:** intentionally open-ended — this phase is "what Bosla
earns the right to build" once the core marketplace loop is running
profitably.

## Related documents

- [`architecture.md`](./architecture.md),
  [`authentication-architecture.md`](./authentication-architecture.md),
  [`database-overview.md`](./database-overview.md),
  [`cms-overview.md`](./cms-overview.md),
  [`roles-and-permissions.md`](./roles-and-permissions.md)
  — the detailed designs each phase above implements.
- [`future-features.md`](./future-features.md) — ideas deliberately kept out of
  every phase above.
