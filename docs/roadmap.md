# Bosla — Roadmap

> Status: planning document. Phase 0 is complete (it's the current repository).
> Every later phase is proposed sequencing, not a commitment to exact dates.
> Ordering is chosen to de-risk the hardest/most valuable question at each step
> before investing in the next layer.

## Phase 0 — Marketing Foundation ✅ (done)

What exists today: Next.js 15 + next-intl bilingual (`en`/`ar`) marketing
homepage, premium UI, RTL/LTR support, SEO metadata, and Bosla's brand identity —
all backed by static mock data. See [`architecture.md`](./architecture.md) §1 for
the exact inventory.

**Why this came first:** validates brand, positioning, and bilingual UX with zero
backend risk before any data model is committed to.

## Phase 1 — Data & Identity Foundation

**Goal:** replace "no backend" with a real, minimal backend, without changing a
single pixel of the existing marketing site.

- Stand up Supabase Auth (email/password) and the `users` table.
- Implement the core catalog tables: `specialties`, `courses`, `modules`,
  `lessons` (see [`database-overview.md`](./database-overview.md) §1–2).
- Re-point the existing marketing sections (`FeaturedCourses`, etc.) to read
  from the database instead of `src/data/*.ts` — the components don't change,
  only where their data comes from.
- Seed the initial catalog (the 6 courses live today as mock data) directly as
  database rows, curated by an Admin acting through direct data seeding — **not**
  through an Instructor Panel, which doesn't exist yet (see Phase 4 rationale).

**Exit criteria:** the public site looks identical to today, but every course
shown is a real database row, and a real user can sign up / sign in.

## Phase 2 — Course Consumption (Student Experience)

**Goal:** a signed-in Student can actually learn, not just browse.

- Course detail page (public, pre-purchase) and the Student Dashboard's Course
  Player (post-enrollment) — see
  [`roles-and-permissions.md`](./roles-and-permissions.md) §4.
- `lesson_progress`, `enrollments` (source: `manual_grant` only at this stage —
  no payments yet), quizzes/`quiz_attempts`.
- Student Dashboard: Overview, My Learning, Profile & Settings.

**Why before Commerce:** proves the actual learning experience (the product's
core value) using free/manually-granted enrollments, before adding the
complexity of real money.

**Exit criteria:** an Admin can manually enroll a test student in a course, and
that student can watch lessons, take a quiz, and see progress update — end to
end, no payment involved yet.

## Phase 3 — Commerce & Payments

**Goal:** Bosla can take real money for a course that already works end-to-end
(de-risked in Phase 2).

- `orders`, `order_items`, `payments`, `coupons`, `refunds` (see
  [`database-overview.md`](./database-overview.md) §3).
- The `PaymentGateway` abstraction from [`architecture.md`](./architecture.md) §5,
  implemented first for **Paymob and Fawry** (primary MENA payment rails for the
  target market), with **Stripe** added when/if international expansion needs
  it — not the other way around, since building Stripe first would optimize for
  a smaller initial audience.
- Checkout flow, order confirmation, Student Dashboard's Orders & Billing page.

**Exit criteria:** a real student can pay for a real course via at least one
live provider and be enrolled automatically via the webhook → enrollment path.

## Phase 4 — Instructor Panel

**Goal:** open the marketplace side — instructors publish their own courses
without engineering involvement per course.

- `instructor_profiles`, the approval workflow, and every page in
  [`roles-and-permissions.md`](./roles-and-permissions.md) §5: Course Builder
  (Module → Lesson → Quiz/Resources tree editor), Submit for Review, Students,
  Reviews, Coupons, Earnings, Profile.
- Course state machine (`draft → in_review → published → archived`) and the
  Admin-side approval screen it depends on (pulled forward from Phase 5, since
  it's required for Phase 4 to be useful).

**Why after Commerce, not before:** authoring tooling (a rich Module/Lesson/Quiz
editor) is one of the largest single pieces of engineering in the whole product.
Building it only after the purchase → learn → pay loop is already proven avoids
building an expensive authoring tool for a commerce model that hasn't been
validated yet.

**Exit criteria:** an external instructor can apply, get approved, build a
course entirely through the UI, submit it, get approved, and see it sellable on
the public catalog with zero direct database access from the Bosla team.

## Phase 5 — Admin CMS

**Goal:** marketing and operations no longer depend on engineering for routine
content changes.

- `homepage_sections`, `landing_pages`, `articles`, `media_assets`, `seo_meta`,
  `navigation_menus`, `site_settings` (see
  [`cms-overview.md`](./cms-overview.md) in full).
- Remaining Admin pages: Reviews moderation (+ "feature as testimonial"),
  Articles, Homepage Sections, Landing Pages, Navigation, Media Library, SEO
  Defaults.
- Super-Admin-only pages: Users & Roles, Site Settings, Payment Providers.

**Exit criteria:** an Admin can reorder/hide a homepage section, publish an
article, and feature a real student review as a homepage testimonial — all
without a deploy.

## Phase 6 — Engagement & Trust

**Goal:** the features that turn "a course I bought" into "a platform I trust
and keep coming back to."

- Certificates (issuance + verification link — currently marketed as "launching
  soon").
- Notifications (order confirmations, course updates, new review alerts) —
  in-app first, email as a fast-follow.
- Wishlist, wider search/filtering across the growing catalog.

**Exit criteria:** a student who completes a course receives a verifiable
certificate and a notification, without manual Admin involvement.

## Phase 7 — Scale & Expansion

**Goal:** grow the catalog and the market, on top of a proven marketplace.

- Additional specialties beyond Physiotherapy/Nutrition (Sports Medicine,
  Nursing, Occupational Therapy, ...) — a data/content operation, not an
  engineering one, thanks to the `specialties` table design from Phase 1.
- Revisit anything deferred for good reason earlier: multi-currency display,
  Stripe (if not already added in Phase 3), instructor payout automation.
- Evaluate [`future-features.md`](./future-features.md) against real usage data
  collected from Phases 2–6 (which of those speculative ideas actual instructors
  and students are asking for).

**Exit criteria:** intentionally open-ended — this phase is "what Bosla earns
the right to build" once the core marketplace loop is running profitably.

## Related documents

- [`architecture.md`](./architecture.md), [`database-overview.md`](./database-overview.md),
  [`cms-overview.md`](./cms-overview.md), [`roles-and-permissions.md`](./roles-and-permissions.md)
  — the detailed designs each phase above implements.
- [`future-features.md`](./future-features.md) — ideas deliberately kept out of
  every phase above.
