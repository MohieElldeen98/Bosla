# Bosla — Roles & Permissions

> Status: planning document. No authentication or authorization exists yet. This
> defines the target role model, permission matrix, and the full page inventory
> per authenticated surface, so the Instructor Panel, Student Dashboard, and Admin
> Panel (§3 of [`architecture.md`](./architecture.md)) are built against an agreed
> access model instead of ad hoc checks.

## 1. Roles

| Role | Who | Notes |
|---|---|---|
| **Guest** | Anyone unauthenticated | Full access to the marketing site; no purchase or dashboard access |
| **Student** | Default role on sign-up | Can browse, purchase, learn, review |
| **Instructor** | A Student approved by an Admin to publish courses | Still retains all Student capabilities (an instructor can also enroll as a learner) |
| **Admin** | Bosla staff, day-to-day operations | Content moderation, course approval, commerce operations |
| **Super Admin** | Bosla founders/leadership | Everything Admin can do, plus user/role management, sitewide settings, payment provider configuration, and other irreversible operations |

A single `users.role` column is sufficient at launch (see
[`database-overview.md`](./database-overview.md) §1) — a full role↔permission
many-to-many table is deliberately deferred until a role's capabilities need to be
configurable without a code change (see [`future-features.md`](./future-features.md)).

## 2. Permission matrix

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

Enforced at the route-group **layout** level (before render — see
[`architecture.md`](./architecture.md) §3), not by hiding UI:

- `/[locale]/dashboard/*` → requires `Student` role or higher (Instructors/Admins
  can also access their own student dashboard). Wrong role → redirected to
  the visitor's own default surface.
- `/[locale]/instructor/*` → requires `role = instructor` **and**
  `instructor_profiles.is_approved = true`; a pending applicant is redirected to
  an "application under review" page instead. Wrong role → redirected.
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
- [`database-overview.md`](./database-overview.md) — the `users.role` and
  `instructor_profiles.is_approved` fields this document is built on.
- [`cms-overview.md`](./cms-overview.md) — detail behind every Admin CMS page
  listed in §6.
- [`roadmap.md`](./roadmap.md) — which of these pages ship in which phase.
