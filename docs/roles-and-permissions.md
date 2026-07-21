# Bosla — Roles & Permissions

> Status: authentication, the role model, and route-level access enforcement
> are implemented and real (see
> [`authentication-architecture.md`](./authentication-architecture.md)) — §1
> (Roles) and §3 (Route-level access rules) describe what's actually running
> today. The rest of this document is still a target model: §2's permission
> matrix and the §4–§6 page inventories describe capabilities/pages for
> features (courses, commerce, CMS beyond the homepage, etc.) that mostly
> don't exist yet, so the Instructor Panel, Student Dashboard, and Admin
> Panel (§3 of [`architecture.md`](./architecture.md)) get built against an
> agreed access model instead of ad hoc checks as each is built out. Each
> section below notes which of its own rows are real.

## 1. Roles

| Role | Who | Notes |
|---|---|---|
| **Guest** | Anyone unauthenticated | Full access to the marketing site; no purchase or dashboard access |
| **Student** | Default role on sign-up | Can browse, purchase, learn, review |
| **Instructor** | A Student approved by an Admin to publish courses | Still retains all Student capabilities (an instructor can also enroll as a learner) |
| **Admin** | Bosla staff, day-to-day operations | Content moderation, course approval, commerce operations |
| **Super Admin** | Bosla founders/leadership | Everything Admin can do, plus user/role management, sitewide settings, payment provider configuration, and other irreversible operations |

A single `profiles.role` column is sufficient at launch — real, implemented
(see [`database-overview.md`](./database-overview.md) §1) and kept in sync
with the Supabase JWT's `app_metadata.role` by `UserRoleService` (see
[`authentication-architecture.md`](./authentication-architecture.md) §16) —
a full role↔permission many-to-many table is deliberately deferred until a
role's capabilities need to be configurable without a code change (see
[`future-features.md`](./future-features.md)).

## 2. Permission matrix

Target model — the underlying features (purchases, enrollments, reviews,
coupons, most of the CMS) mostly don't exist yet (see
[`roadmap.md`](./roadmap.md)), so most rows below aren't enforced by any
code yet. The one exception: CMS management is real for the homepage today
(the "Manage CMS" row), gated the same way this matrix already describes —
`requireCmsAccess()` allows `admin`/`super_admin` only, matching the ✅/✅
here (see [`cms-overview.md`](./cms-overview.md)).

Legend: ✅ full access · 🔶 own records only · ❌ no access

| Capability | Guest | Student | Instructor | Admin | Super Admin |
|---|---|---|---|---|---|
| Browse marketing site, catalog, articles | ✅ | ✅ | ✅ | ✅ | ✅ |
| Sign up / sign in | ✅ | — | — | — | — |
| Purchase / enroll in a course | ❌ | ✅ | ✅ | ✅ | ✅ |
| View own progress & certificates | ❌ | 🔶 | 🔶 | ❌ | ❌ |
| Leave a review on an enrolled course | ❌ | 🔶 | 🔶 | ❌ | ❌ |
| Apply to become an Instructor | ❌ | ✅ | — | — | — |
| Author/edit own courses (draft) | ❌ | ❌ | 🔶 | ✅ (any) | ✅ (any) |
| Submit own course for review | ❌ | ❌ | 🔶 | — | — |
| Approve / reject / feature / unpublish any course | ❌ | ❌ | ❌ | ✅ | ✅ |
| View own earnings | ❌ | ❌ | 🔶 | ✅ (any) | ✅ (any) |
| Create coupons scoped to own courses | ❌ | ❌ | 🔶 | ✅ (any scope) | ✅ (any scope) |
| Create sitewide coupons | ❌ | ❌ | ❌ | ✅ | ✅ |
| Approve/reject Instructor applications | ❌ | ❌ | ❌ | ✅ | ✅ |
| Moderate reviews (hide/flag/feature as testimonial) | ❌ | ❌ | ❌ | ✅ | ✅ |
| Manage CMS (homepage sections, articles, nav, landing pages) | ❌ | ❌ | 🔶 (own articles only) | ✅ | ✅ |
| Manage Media Library | ❌ | ❌ | 🔶 (own uploads) | ✅ | ✅ |
| View/manage all orders & process refunds | ❌ | ❌ | ❌ | ✅ | ✅ |
| Manage users & roles (promote/suspend/delete) | ❌ | ❌ | ❌ | ❌ | ✅ |
| Manage sitewide settings & payment provider config | ❌ | ❌ | ❌ | ❌ | ✅ |
| View audit log | ❌ | ❌ | ❌ | 🔶 (read-only) | ✅ |

> "Manage users & roles" (row above) is Super-Admin-only in general —
> `/admin/users`'s Role dropdown stays behind a Super-Admin-only route
> guard, unchanged. The one narrow exception, added in Phase 6 Step 6.1:
> approving an Instructor application (row above) promotes the applicant
> to `instructor` specifically, and an Admin can trigger that. Every
> other role change — to `admin`, to `super_admin`, or away from
> `instructor` — still requires a Super Admin.

## 3. Route-level access rules

Every rule in this section is real, enforced today at the route-group
**layout** level (before render — see
[`architecture.md`](./architecture.md) §3), not by hiding UI — this is the
one section of this document that's fully implemented, not a target model
(the *pages* those routes render are a separate question — see §4–§6):

- `/[locale]/me/*` → requires `Student` role or higher (Instructors/Admins
  also land here for their own courses/profile/settings, fully separate
  from `/instructor` and `/admin`). Wrong role → redirected to the
  visitor's own default surface, which is `/me` itself for a Student
  (`DEFAULT_REDIRECT_BY_ROLE`, `auth/constants/routes.ts`). This is the
  Learner Workspace — see §4 below, which replaces both the old
  `/dashboard` page inventory and the separate `/profile`/`/settings`
  placeholders described in earlier revisions of this doc.
- `/[locale]/dashboard`, `/[locale]/profile`, `/[locale]/settings` — kept
  as thin redirects into `/me`/`/me/profile`/`/me/settings` respectively
  (old links/bookmarks never 404), same role rule as `/me` since the
  redirect page itself still passes through the shared guard first.
- `/[locale]/instructor/*` → requires `role = instructor` (wrong role →
  redirected to the visitor's own default surface) **and**
  `instructor_profiles.status === "approved"` (real as of Phase 6, Step
  6.1 — see [`database-overview.md`](./database-overview.md) §1). A
  signed-in `role = instructor` user without an approved application
  (normally unreachable, since role promotion only ever happens via
  approving an application — but still possible through a direct Super
  Admin role edit at `/admin/users`) sees a review-status page in place
  of the Instructor Panel instead of being redirected, mirroring
  `/admin/*`'s "explicit state, not a silent bounce" precedent below.
- `/[locale]/admin/*` → requires `role = admin` or `role = super_admin`
  (real as of Step 6.3 — see
  [`authentication-architecture.md`](./authentication-architecture.md) §15).
  Unlike the two rules above, a signed-in Student/Instructor sees an
  explicit **Forbidden** page here rather than being redirected — the
  Admin Panel is sensitive enough that a silent bounce would be confusing.
  An unauthenticated visitor still redirects to sign-in either way.
- Settings screens specifically gated to `super_admin` (`/admin/users`,
  `/admin/settings`) are additionally checked inside their own page (not a
  separate route group) — an Admin who navigates directly to a
  Super-Admin-only URL is **redirected** back to `/admin`, not shown
  Forbidden or a disabled form — this one case still uses the
  redirect-to-default-surface pattern, since "wrong page for my role" and
  "I don't belong in this app area at all" are different situations.

## 4. Learner Workspace — page inventory (`/me/*`)

Real, not a target model — the Learner Workspace replaced the old
fragmented `/dashboard` + `/profile` + `/settings` pages with one
tab-based hub, the same personal home for every authenticated role
(student/instructor/admin alike), fully separate from `/instructor` and
`/admin`.

| Tab | Route | Purpose |
|---|---|---|
| Overview (default) | `/me` | Continue Learning, small learning stats (enrolled/in-progress/completed/average progress), latest certificate, a merged recent-activity timeline, an Orders & Billing link, and the "Apply to become an Instructor" prompt (students only) |
| Courses | `/me/courses` | Every active enrollment, grouped In Progress / Completed |
| Certificates | `/me/certificates` | Every earned certificate — View/Download (real, PDF rendered on demand) and Share (present, disabled — no public verification page yet) |
| Profile | `/me/profile` | Personal information only: avatar, name, bio, profession, country, social links |
| Settings | `/me/settings` | Account-level only: email (change flow), password (current-password re-verified), language, notification preferences, delete account |

Not tabs, but reachable from Overview: Orders & Billing (`/me/orders`)
and "Apply to become an Instructor" (`/me/apply-instructor`) — neither is
frequent enough to earn a permanent tab. Course Player, Wishlist, and My
Reviews from earlier revisions of this table remain unbuilt/out of scope.

## 5. Instructor Panel — page inventory (`/instructor/*`)

The route guard (§3, real as of Step 6.1, including the
`instructor_profiles.status` check) and every page below except
**Reviews** are real as of Phase 6 (Steps 6.1–6.6). Reviews is the one
page still target model — see its own row for why.

| Page | Purpose | Status |
|---|---|---|
| Dashboard | Course counts by status, links to every other Instructor Panel page. No performance/analytics overview yet | **Real (Step 6.3, extended 6.6)**, minimal |
| My Courses | List of own courses by status (`draft`, `in_review`, `published`, `archived`), with Edit/Submit for Review/Curriculum row actions | **Real (Step 6.3–6.4)** |
| Course Builder | Create/edit a course's details & pricing (Step 6.3, reuses the Admin Course Editor); the Module → Lesson tree editor (Step 6.4) with drag-and-drop ordering, Video/Quiz/Resource lesson types, and auto-created quiz placeholders; the Quiz Editor (Step 6.5) reached from a Quiz-type lesson, authoring that quiz's own multiple-choice questions/answer choices, ordering, and pass threshold (see [`product-blueprint.md`](./product-blueprint.md) §4) | **Real (Step 6.3–6.5)** |
| Submit for Review | A row action on My Courses (not a separate page) — `draft -> in_review`, reusing `CourseService.submitForReview` (Step 6.2) | **Real (Step 6.3)** |
| Students | List of students enrolled in own courses, with a computed progress percentage per enrollment (no access to other instructors' students); read-only, no row actions | **Real (Step 6.6)** |
| Reviews | Read-only view of reviews left on own courses (moderation stays an Admin capability) | **Blocked** — the Review entity itself (schema, student submission flow) doesn't exist anywhere in this codebase; the roadmap only ever scopes Admin *moderation* of reviews (Phase 7), never their authoring |
| Coupons | Create/manage coupons scoped to own courses only — always `scope: "course"`, targeting one of the Instructor's own courses; `/instructor/coupons`, `/new`, `/[id]/edit` | **Real (Step 6.6)** |
| Earnings | Revenue breakdown per course (`paid` orders only, gross — no payout/revenue-share figure, since payout automation is deliberately deferred, see future-features.md) | **Real (Step 6.6)**, read-only display |
| Profile | Public instructor bio/credentials/avatar editor — edits go live immediately; the Admin "moderation" step `cms-overview.md` §4 describes as the eventual design isn't built yet (no admin workflow exists for the `instructors` table) | **Real (Step 6.6)**, unmoderated |

## 6. Admin Panel — page inventory (`/admin/*`)

Unlike §4 and §5, the Admin Panel shell itself is real — routing and
role-gated layout (Step 6.3, see
[`authentication-architecture.md`](./authentication-architecture.md) §15) —
but not every row below has a page behind it yet. Three groups:

- **A real editor today:** **Homepage Sections** (the real Homepage
  Editor, Steps 6.4–6.6: [`cms-overview.md`](./cms-overview.md)),
  **Courses** (Phase 3, Steps 3.1–3.2, extended Phase 6 Step 6.2 with the
  course state machine's transition actions — Submit for Review/Approve/
  Reject alongside the existing Archive/Restore/Delete; "feature" is the
  Course Editor's existing checkbox field), **Instructors**,
  partially (Phase 6, Step 6.1 — review/approve/reject Instructor
  applications is real; "feature toggle, suspend" for the
  content-attribution `instructors` directory in the Purpose column below
  is not built yet), and **Media Library** (Phase 7, Step 7.1 —
  upload/browse/search/edit metadata/delete, all real; "Purpose" below
  undersells it slightly, see its own row).
- **A real route, "Coming Soon" placeholder content:** Dashboard,
  Navigation, SEO Defaults, Audit Log
  (the backend — `cms_audit_logs`, written on every homepage CMS action —
  is real; only the viewer page is a placeholder), Users & Roles, Site
  Settings, plus **Footer, Categories, and FAQ** (per-homepage-section
  editors already in the Admin Panel's navigation, added as their own rows
  below for accuracy — this table previously omitted them). Reviews
  corresponds to the existing `/admin/testimonials` placeholder (see
  [`cms-overview.md`](./cms-overview.md) §3: testimonials are sourced from
  reviews, not authored separately).
- **No route at all yet**, because the feature it manages doesn't exist
  yet either: Students, Orders, Coupons, Articles, Landing Pages,
  Notifications, Payment Providers.

Phase 7 of [`roadmap.md`](./roadmap.md) turns every placeholder above into
a real editor and adds the still-missing routes. The Admin/Super-Admin-only
split in the last two columns is enforced today wherever a page exists at
all — see §3.

| Page | Purpose | Admin | Super Admin only |
|---|---|---|---|
| Dashboard | Sitewide metrics: revenue, signups, pending course reviews | ✅ | |
| Courses | Moderation queue + full catalog: approve/reject/feature/unpublish | ✅ | |
| Instructors | Approve/reject applications, feature toggle, suspend | ✅ | |
| Students | Directory, view profile/orders, suspend | ✅ | |
| Orders | List, filter, issue refunds | ✅ | |
| Coupons | Sitewide + oversight of instructor-scoped coupons | ✅ | |
| Reviews | Moderation queue, feature as homepage testimonial | ✅ | |
| Articles | Create/edit/publish | ✅ | |
| Homepage Sections | Reorder, edit content, toggle visibility | ✅ | |
| Landing Pages | Create/edit campaign & specialty pages | ✅ | |
| Navigation | Header/footer link editor | ✅ | |
| Footer | Tagline, social links, newsletter copy | ✅ | |
| Categories | The course category cards shown on the homepage | ✅ | |
| FAQ | The homepage's frequently asked questions | ✅ | |
| Media Library | Browse/upload/edit alt text/delete | ✅ | |
| SEO Defaults | Sitewide meta editor | ✅ | |
| Notifications | View sent notifications, compose sitewide announcements | ✅ | |
| Audit Log | Read-only history of admin/instructor actions | 🔶 read-only | ✅ full |
| Users & Roles | Promote/suspend/delete any account, change roles | ❌ | ✅ |
| Site Settings | Default currency, feature flags, support email | ❌ | ✅ |
| Payment Providers | Stripe/Paymob/Fawry credentials & activation toggles | ❌ | ✅ |

## 7. Related documents

- [`architecture.md`](./architecture.md) — how route-level access is enforced.
- [`authentication-architecture.md`](./authentication-architecture.md) — the
  implemented role/route-protection architecture (`auth/constants/routes.ts`
  mirrors §3 of this document exactly).
- [`database-overview.md`](./database-overview.md) — the `profiles.role`
  field (real) and `instructor_profiles.is_approved` field (planned) this
  document is built on.
- [`cms-overview.md`](./cms-overview.md) — detail behind every Admin CMS page
  listed in §6.
- [`roadmap.md`](./roadmap.md) — which of these pages ship in which phase.
