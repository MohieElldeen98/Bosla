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

## 3. Route-level access rules

Every rule in this section is real, enforced today at the route-group
**layout** level (before render — see
[`architecture.md`](./architecture.md) §3), not by hiding UI — this is the
one section of this document that's fully implemented, not a target model
(the *pages* those routes render are a separate question — see §4–§6):

- `/[locale]/dashboard/*` → requires `Student` role or higher (Instructors/Admins
  can also access their own student dashboard). Wrong role → redirected to
  the visitor's own default surface.
- `/[locale]/profile` and `/[locale]/settings` → same rule as `/dashboard`
  (any authenticated role). Real as of the "Session Navigation & User Menu"
  step — simple "Coming Soon" placeholders reachable from the navbar's user
  menu, not yet the real profile-editing/settings pages §4 describes below
  (which may end up living at these same top-level routes, or nested under
  `/dashboard`, once actually built).
- `/[locale]/instructor/*` → requires `role = instructor` today. The target
  rule additionally requires `instructor_profiles.is_approved = true`,
  redirecting a pending applicant to an "application under review" page
  instead — deferred until the `instructor_profiles` table itself exists
  (see [`database-overview.md`](./database-overview.md) §1); the route
  guard's own code comment tracks this. Wrong role → redirected either way.
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

## 4. Student Dashboard — page inventory (`/dashboard/*`)

Target model — `/dashboard` itself is real (§3), but today it's a single
"Coming Soon" placeholder; none of the pages below exist yet (Phase 4 of
[`roadmap.md`](./roadmap.md)).

| Page | Purpose |
|---|---|
| Overview | Continue-learning shortcuts, overall progress summary, streak/activity — the authenticated evolution of today's marketing dashboard mockup |
| My Learning | List of enrolled courses with per-course progress |
| Course Player | The real lesson-consumption experience: video/reading/quiz, chapter list, resources, mark-complete — the authenticated evolution of today's "Learning Experience" homepage section |
| Certificates | Earned certificates + verification links (once launched — see roadmap) |
| Wishlist | Saved-for-later courses |
| Orders & Billing | Past orders, receipts, refund status |
| My Reviews | Reviews the student has left, and prompts to review completed-but-unreviewed courses |
| Notifications | In-app notification feed |
| Profile & Settings | Account info, password, locale preference, notification preferences, "Apply to become an Instructor" entry point |

## 5. Instructor Panel — page inventory (`/instructor/*`)

Target model — `/instructor` currently has only its route guard (§3), no
pages at all yet (Phase 6 of [`roadmap.md`](./roadmap.md)).

| Page | Purpose |
|---|---|
| Dashboard | Own courses' performance overview: enrollments, revenue, ratings at a glance |
| My Courses | List of own courses by status (`draft`, `in_review`, `published`, `archived`) |
| Course Builder | Create/edit a course: details & pricing, then the Module → Lesson → Quiz/Resources tree editor (see [`product-blueprint.md`](./product-blueprint.md) §4) |
| Submit for Review | Move a course from `draft` to `in_review`; view Admin feedback if sent back |
| Students | List of students enrolled in own courses, with progress overview (no access to other instructors' students) |
| Reviews | Read-only view of reviews left on own courses (moderation stays an Admin capability) |
| Coupons | Create/manage coupons scoped to own courses only |
| Earnings | Revenue breakdown per course, payout status (read-only display until payout automation exists — see future-features.md) |
| Profile | Public instructor bio/credentials/avatar editor (edits go live after Admin moderation, per [`cms-overview.md`](./cms-overview.md) §4) |

## 6. Admin Panel — page inventory (`/admin/*`)

Unlike §4 and §5, the Admin Panel shell itself is real — routing and
role-gated layout (Step 6.3, see
[`authentication-architecture.md`](./authentication-architecture.md) §15) —
but not every row below has a page behind it yet. Three groups:

- **A real editor today:** only **Homepage Sections** (the real Homepage
  Editor, Steps 6.4–6.6: [`cms-overview.md`](./cms-overview.md)).
- **A real route, "Coming Soon" placeholder content:** Dashboard, Courses,
  Instructors, Navigation, Media Library, SEO Defaults, Audit Log
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
