# Bosla Progress

> This is the project's implementation status dashboard — not a roadmap, not
> architecture documentation. It answers one question: what's actually built,
> usable, in progress, or still ahead, right now. See
> [`roadmap.md`](./roadmap.md) for sequencing/rationale and
> [`architecture.md`](./architecture.md) for how things are built.

## Project Status

Authentication is complete. The CMS foundation is complete. The Homepage CMS
— draft, preview, publish, revert, versioning, audit logging, optimistic
concurrency — is production-ready. The Admin homepage editor is complete.
Project documentation (architecture, database, CMS, authentication, roles &
permissions, roadmap) is synchronized with the real codebase. Phases 0–2 of
[`roadmap.md`](./roadmap.md) are done. Phase 3 (Core LMS) is now underway:
Step 3.1 built the Course Domain's backend (Specialties, Categories,
Instructors, Courses — schema, repositories, services, Server Actions,
validators). Step 3.2 added the Course Management admin UI (`/admin/courses`
— listing, search, filters, sorting, pagination, archive/restore, and a
super-admin-gated hard delete). Step 3.3 built the real Course Editor
(`/admin/courses/new`, `/admin/courses/[id]/edit`) — full Create/Edit form,
optimistic concurrency, its own audit trail, and a reused SEO editor. Step
3.4 built the public Course Catalog and Course Details pages (`/courses`,
`/courses/[slug]`) — a course an Admin creates and publishes is now visible
on the live site. Re-pointing the homepage's mock "Featured Courses"
section to real data is what's left of Phase 3. Phase 4 (Student
Experience) has also started: Step 4.1 built the Student Learning
Domain's backend (Modules, Lessons, Enrollments, Lesson Progress,
Quizzes, Quiz Questions, Quiz Attempts) — schema, repositories, services,
Server Actions, validators, no UI yet. Step 4.2 built the first real UI
on top of it: `/admin/enrollments` — an Admin can manually grant and
revoke a student's course access, with a real listing, create form,
detail view, and its own optimistic concurrency and audit trail. Step 4.3
built the real Student Dashboard (`/dashboard`, replacing its "Coming
Soon" placeholder) — a signed-in student sees their own active
enrollments, computed progress, and a "Continue Learning" shortlist, all
from real data. Step 4.4 built the real Course Player
(`/courses/[slug]/learn`, replacing its temporary placeholder) — an
enrolled student can browse a course's modules/lessons, read real lesson
content, mark lessons complete, and navigate Previous/Next, with progress
and "last opened lesson" both derived live from `lesson_progress`. No
Curriculum Editor yet, so every course still has zero real lessons in
practice — the player itself is real, but there's no admin UI to author
the content it shows. The Admin User Management module
(`/admin/users`) was then built ahead of the remaining Phase 4/roadmap
sequence — with Authentication, Roles, Profiles, Enrollments, the
Student Dashboard, and the Course Player all already real, the Admin
Panel had no way to manage a user or grant them access for end-to-end
testing; this module closes that gap. Step 4.5 completed the Student
Experience's learning loop: the Course Player now detects `"quiz"`
lessons and opens a real Quiz Player — single-choice questions rendered
from `quiz_questions`, graded server-side against the real answer key
(never sent to the client), with the resulting `quiz_attempts` row and
automatic lesson completion (on a pass) reusing the same Learning Domain
services every other step in Phase 4 already established. This closes
Phase 4's own exit criteria ("a student can watch lessons, take a quiz,
and see progress update") — a Curriculum Editor to *author* that content
through the UI is still Phase 6 scope. Phase 5 (Commerce) Step 5.1 built
the full Commerce foundation: real Orders (`orders`/`order_items`), a
real Checkout flow (`/checkout/[courseSlug]`, reachable from every
course detail page's price card) supporting both free and paid courses,
Coupons (percentage/fixed, course/specialty/sitewide-scoped, expiring,
usage-limited), and the Payment foundation from
[`architecture.md`](./architecture.md) §5 (`PaymentGateway`
interface, `PaymentIntent`/`PaymentTransaction` models) — with only a
`ManualPaymentGateway` implementation, since no real provider
(Stripe/Paymob/Fawry) is integrated yet by design. The Student
Dashboard's Orders & Billing page and full admin Order/Coupon management
(`/admin/orders`, `/admin/coupons`) are real, replacing their "Coming
Soon"/nonexistent state.

## Completed Milestones

### Authentication & Identity

- [x] Supabase Authentication (email/password + Google OAuth)
- [x] Profiles (`profiles` table, auto-created on sign-up)
- [x] Roles (`student | instructor | admin | super_admin`)
- [x] Permissions (role model role checks are evaluated against)
- [x] Route Guards (middleware + route-group layout guards)
- [x] Session handling (server + client session reads, `useSession()`)
- [x] JWT role synchronization (`UserRoleService`, keeps `profiles.role` and
      the Supabase JWT's `app_metadata.role` in sync)
- [x] Admin authorization (`/admin` role-gated, Forbidden page for wrong role)

### CMS Foundation

- [x] Generic CMS (fixed section-type registry, not a page builder)
- [x] Homepage CMS (the live homepage's data model)
- [x] Section registry (`cms_sections`, per-type content schemas)
- [x] Zod validation (client + server, one schema per section type)
- [x] Repository / Service architecture (Repository → Service → Server
      Action/Server Component, consistent across every domain)
- [x] Server Actions (thin, validated, authorization-checked)
- [x] SEO management (per-page SEO fields, `cms_seo_meta`)

### Homepage CMS

- [x] Homepage connected to database (migrated off static mock data)
- [x] Homepage editor (`/admin/homepage`)
- [x] Enable/Disable sections
- [x] Reordering sections
- [x] Draft editing
- [x] Preview (reuses the public rendering pipeline via Next.js Draft Mode)
- [x] Publish (atomic, validated, immediately revalidates the public site)
- [x] Revert (restores the draft to the last published version)
- [x] Version history (`cms_page_versions`, append-only — no viewer UI yet)
- [x] Audit logging (`cms_audit_logs` — no viewer UI yet)
- [x] Optimistic concurrency (conflict detection on saves, publish, revert)
- [x] Unsaved changes protection (leave/refresh/route-change warnings)

### Admin

- [x] Admin shell (routing, role-gated layout)
- [x] Sidebar
- [x] Navigation (`admin-nav.ts`, single source of truth for the sidebar)
- [x] Layout (header/breadcrumb/shell chrome)
- [x] Authorization guards (`requireRoleOrForbidden`, redirect vs. Forbidden
      semantics)
- [x] User menu (admin header — avatar, sign out)
- [x] Session navigation (authentication-aware public navbar — user
      dropdown, role-conditional Admin Panel link, sign out)

### Core LMS — Course Domain (Step 3.1, backend)

- [x] `specialties`, `categories`, `instructors`, `courses` schema (enums,
      relations, indexes, check constraints) — no public pages, no
      Modules/Lessons yet
- [x] Repository / Service / Server Action / Zod validator layers, matching
      the CMS/Auth pattern exactly (`src/courses/`)
- [x] `instructors` is deliberately separate from the still-mock-backed
      Hero-section instructor data and from the still-planned
      `instructor_profiles` (auth/approval) — see `database-overview.md` §1–2

### Core LMS — Course Management Admin (Step 3.2)

- [x] `/admin/courses` — real course listing (reachable from the Admin
      nav), replacing the earlier "Coming Soon" placeholder
- [x] Server-side pagination, search (title/slug), and filters (Status,
      Specialty, Category, Instructor), all URL-driven and combinable
- [x] Sortable columns (Course/slug, Price, Status, Updated)
- [x] Archive / Restore (status flip) and a hard Delete gated to Super
      Admin only, both in the row menu and again in `CourseService.delete`
- [x] Bulk-selection checkboxes (infrastructure only — no bulk actions
      wired up yet)
- [x] Loading / empty / error states

### Core LMS — Course Editor (Step 3.3)

- [x] `/admin/courses/new` and `/admin/courses/[id]/edit` — one reusable
      form for both Create and Edit, reusing the CMS section-form infra
      (`SectionFormShell`, `LocalizedTextField`, `ArrayFieldEditor`,
      `useContentDirty`, `useSaveContent`, `useUnsavedChangesGuard`) rather
      than a parallel set of form primitives
- [x] Every field group: Basic Information (title/subtitle/slug/
      description/short description/status/language/difficulty/specialty/
      category/instructor), Pricing (price/original price/currency/is
      free), Course Details (estimated duration/certificate available/
      featured), Content (requirements/learning objectives/target
      audience — localized text arrays), Media (cover image/thumbnail/
      trailer video IDs, temporary ID fields — no picker yet)
- [x] SEO — reuses the exact `SeoForm`/`CmsSeoService`/`cms_seo_meta` the
      Homepage Editor uses (that table was already designed to be
      reusable beyond `cms_pages`); a new course gets an empty SEO record
      automatically, with an "Add SEO" fallback if that sub-step didn't
      run
- [x] Optimistic concurrency on save (`expectedUpdatedAt`, same
      conflict-detection pattern as CMS section/SEO saves)
- [x] Its own audit trail (`course_audit_logs` — create/update/archive/
      restore/delete; no viewer UI yet, matching `cms_audit_logs`'
      own scope)
- [x] Dirty-state tracking, unsaved-changes warning, validation errors,
      success/error toasts — all via the reused CMS form hooks
- [x] Permissions: `/admin/*` is already Admin/Super-Admin-gated at the
      route-group layout; `CourseService`'s own mutations re-check
      regardless of which UI called them

### Core LMS — Public Course Catalog & Details (Step 3.4)

- [x] `/courses` — the public catalog: server-side pagination, search,
      and filters (Specialty, Category, Language, Difficulty, Featured),
      all URL-driven and combinable, plus sorting (Newest, Price)
- [x] Only `published` courses whose specialty/instructor (and category,
      if set) are each still `is_active` are ever shown — enforced
      server-side (`CourseRepository.search`'s `onlyActive` flag), never
      influenced by a URL param
- [x] `/courses/[slug]` — the public course detail page: cover image,
      title/subtitle, description, requirements, learning objectives,
      target audience, instructor/specialty/category, duration, language,
      difficulty, certificate availability, price — a course that isn't
      public yet 404s the same as a nonexistent slug
- [x] Dynamic `generateMetadata` on both routes — title/description/
      canonical/OpenGraph/Twitter, reusing the exact `cms_seo_meta`
      record the Course Editor's SEO section writes to (falling back to
      the course's own title/description when a course has none)
- [x] `CourseRepository.search()` and `CourseService.searchResolved()`
      are reused as-is from the Admin listing (Step 3.2) — no parallel
      query/pagination logic; only a new `getPublicDetailBySlug` was
      added, for the single-course detail view
- [x] ISR (`revalidate = 60`), same mechanism as the homepage
- [x] The public Navbar's existing "Courses" link (previously
      `/#courses`, the homepage's mock section anchor) now points at the
      real catalog

### Student Learning Domain (Step 4.1, backend)

- [x] `modules`, `lessons`, `enrollments`, `lesson_progress`, `quizzes`,
      `quiz_questions`, `quiz_attempts`, `learning_audit_logs` schema —
      no Student Dashboard, Course Player, enrollment screens, or
      payments yet
- [x] Repository / Service / Server Action / Zod validator layers for all
      seven entities, matching the Course/CMS/Auth pattern exactly
      (`src/learning/`)
- [x] Two authorization shapes, matching what each entity really is:
      Module/Lesson/Quiz/Quiz Question (course *content*) reuse
      `requireCourseManagementAccess` from the Course Domain as-is
      (Admin/Super Admin); Enrollment/Lesson Progress/Quiz Attempt
      (student-*owned* data) use a new `canAccessStudentData` check
      (mirrors `auth`'s `canModifyProfile` — a student can always
      read/write their own, Admin can act on anyone's)
- [x] Optimistic concurrency on Module/Lesson/Quiz updates, same
      `expectedUpdatedAt` pattern as the Course Editor
- [x] Its own audit trail (`learning_audit_logs` — Module/Lesson/Quiz
      create/update/delete, Enrollment grants; no viewer UI, matching
      every other audit table in this codebase)
- [x] Cascade rules deliberately differ by what a row means: curriculum
      *content* cascades from its parent (a lesson has no meaning without
      its module); student *activity* cascades from the student's
      account, but `enrollments.course_id` is `RESTRICT` — a course with
      real enrolled students can't be silently hard-deleted

### Enrollment Management (Step 4.2)

- [x] `/admin/enrollments` — real listing: server-side pagination, free-text
      search (student name/email or course title, via `EXISTS` subqueries
      — no cross-domain SQL join), filters (Student, Course, Status), and
      sorting (Granted At, Updated At), all URL-driven and combinable
- [x] `/admin/enrollments/new` — grant a manual enrollment (Student +
      Course selects only; `source` is fixed to `manual_grant`, never a
      form field — no payment fields anywhere); re-granting an already-
      revoked enrollment is rejected with a message pointing at Restore
      instead, since the unique `(student, course)` slot is still occupied
- [x] `/admin/enrollments/[id]` — read-only detail view (student, course,
      granted by, source, status, timestamps) with the same Revoke/
      Restore action the listing uses
- [x] Revoke/Restore are a soft `status` flip (`active` ⇄ `revoked`), not
      a delete — the grant's own record (who, when, by whom) and all
      separately-stored learning history are never lost
- [x] Optimistic concurrency on Revoke/Restore (`expectedUpdatedAt`, same
      pattern as the Course Editor) — a stale action surfaces as a
      conflict toast and refreshes the row, not a silent overwrite
- [x] Its own audit trail (`learning_audit_logs` — `enrollment_created`/
      `enrollment_revoked`/`enrollment_restored`, extending Step 4.1's
      table, not a new one)
- [x] Authorization: `/admin/*` is already Admin/Super-Admin-gated at the
      route-group layout; `EnrollmentService`'s mutations reuse
      `requireCourseManagementAccess` as-is (the same boundary as course
      content authoring) — a student can never reach these actions

### Student Dashboard (Step 4.3)

- [x] `/dashboard` — replaces the `ComingSoonPage` placeholder with a
      real dashboard: "Continue Learning" (in-progress courses, most
      recently active first) and "My Courses" (every active enrollment)
- [x] Only `active` enrollments are ever shown — enforced server-side
      (`EnrollmentRepository.findByStudentId`'s `status` filter), the
      same "server-side, never a URL param" rule the public catalog's
      `onlyActive` filter established
- [x] Progress (`completedLessons`/`totalLessons`/percentage/last
      activity) is computed per course, not stored — composed from
      `modules`/`lessons`/`lesson_progress` (Step 4.1) with two new
      batch-lookup repository methods (`Module.findByCourseIds`,
      `Lesson.findByModuleIds`), the same N+1-avoiding pattern every
      other resolved view in this codebase uses
- [x] Course cards: cover image, title, instructor, a real progress bar
      (new `Progress` UI primitive), Continue/Review button, completion
      badge — reusing `Card`/`Badge`/`Button` the same way the public
      catalog's `CourseCard` (Step 3.4) does, adapted for progress
      instead of marketing fields
- [x] The Continue/Review button links to `/courses/[slug]/learn` — the
      Course Player's route, since built out into the real player
      (Step 4.4)
- [x] Authorization: the dashboard always fetches the signed-in user's
      *own* id server-side — there is no route param for "whose
      dashboard," so no request could ever be crafted to see someone
      else's; `canAccessStudentData` (Step 4.1) is still checked inside
      `StudentDashboardService.getDashboard` as defense-in-depth
- [x] Full loading/error/empty states, and RTL/i18n throughout

### Course Player (Step 4.4)

- [x] `/courses/[slug]/learn` — a smart "resume" entry point: redirects
      to the most-recently-opened lesson (by `lesson_progress.updatedAt`)
      if the student has touched this course before, otherwise the first
      lesson in module/lesson position order; a course with zero lessons
      shows an empty state instead of redirecting nowhere
- [x] `/courses/[slug]/learn/[lessonId]` — the real player: a modules/
      lessons sidebar (progress bar, per-lesson completion checkmarks,
      current-lesson highlight), the current lesson's content, and
      Previous/Next navigation across the course's full flattened lesson
      sequence
- [x] Real content for `"reading"` lessons (renders `lesson.body`); clear
      placeholders for `"video"`/`"quiz"` lessons (no video player, no
      quiz UI, no new media system — explicitly out of scope for this
      step, same as the Curriculum Editor)
- [x] Mark a lesson complete/incomplete — reuses the existing
      `setLessonProgressAction` (Step 4.1) as-is; no new Server Action
      needed for completion
- [x] Opening a lesson records "last activity" via a new, distinct
      `LessonProgressRepository.recordOpened` upsert — separate from
      `setCompleted` so viewing an already-completed lesson again never
      silently un-completes it
- [x] Course progress (`completedLessons`/`totalLessons`/percentage) is
      derived live from `lesson_progress` on every render, via a
      `computeProgressPercentage` helper shared with the Student
      Dashboard (Step 4.3) rather than duplicated
- [x] Authorization: only a signed-in student with an `active` enrollment
      can reach either route — enforced server-side on every request
      (not just in the UI), so a direct URL to a lesson from a course the
      student isn't enrolled in, or whose enrollment was revoked, or that
      belongs to a different course entirely, all resolve to
      forbidden/not_found before any content renders
- [x] `CoursePlayerService` follows the same `actingUser`-explicit,
      `canAccessStudentData`-gated convention as `LessonProgressService`/
      `StudentDashboardService` — no new authorization pattern introduced
- [x] Full loading/error/empty states, and RTL/i18n throughout; mobile
      responsiveness is pure CSS stacking (sidebar above content on
      narrow viewports), not a drawer component

### Quiz Experience (Step 4.5)

- [x] The Course Player now detects `type: "quiz"` lessons with a `Quiz`
      row and at least one question, and opens the real `QuizPlayer`
      instead of the "coming soon" placeholder — the placeholder still
      shows for a quiz-type lesson with no `Quiz` authored yet (no
      Curriculum Editor exists to author one)
- [x] Single-choice questions, rendered from `quiz_questions` via the
      existing `QuizQuestionService` — `correctChoiceIndex` is stripped
      before the data ever reaches the Client Component (`PlayerQuizQuestion`,
      not `ResolvedQuizQuestion`), so the answer key never appears in the
      page's HTML/RSC payload
- [x] Grading moved server-side: `QuizAttemptService.submit` now takes
      raw answers (not a client-computed score, which the original Step
      4.1 design deliberately deferred but would have let a student
      fabricate a passing result) and grades against the real
      `correctChoiceIndex` values, via a new pure `gradeQuizAttempt`
      util
- [x] Submission re-verifies *active* enrollment server-side
      (`EnrollmentService.isEnrolled`) independently of the Course
      Player's own read-path check — a direct POST to the submit action
      can't bypass it
- [x] The graded `QuizAttempt` persists through the existing
      `QuizAttemptRepository.create` — no new table, no bypassed
      repository
- [x] On a passing attempt, the quiz's lesson is marked complete via the
      existing `LessonProgressService.setCompleted` (Step 4.1/4.4); a
      failing attempt is still recorded (score history) but does not
      complete the lesson. Course progress is derived, not stored, so
      the Student Dashboard and Course Player reflect the change
      immediately with no separate "update progress" step
- [x] Retakes are allowed — matching the `quiz_attempts` schema's own
      design (no unique `(quiz, student)` constraint) — via an explicit
      "Retake Quiz" action; accidental double-submission of the same
      click is prevented by disabling the Submit button while pending,
      the same pattern every other mutation in this codebase uses
- [x] Revisiting an already-attempted quiz lesson shows the result
      (score, pass/fail, correct-answer count) immediately instead of a
      blank form
- [x] New `RadioGroup` UI primitive (`@base-ui/react/radio-group`),
      matching the existing base-ui-wrapper convention
- [x] Full RTL/i18n throughout
- [x] Fixed a real import-time regression found while wiring this in:
      `ProfileService`'s Admin-API dependency (added for the User
      Management module) had started transitively pulling
      `src/lib/supabase/admin.ts`'s `import "server-only"` into every
      module that imports `EnrollmentService`/`CoursePlayerService`/
      `QuizAttemptService` — harmless inside Next.js (its bundler
      special-cases `server-only` server-side) but broke `tsx`-run
      verification scripts. Fixed by making `AuthAdminRepository`'s
      `createAdminClient` import dynamic instead of a static top-level
      one — same runtime behavior, no more accidental import-time
      coupling.

### Admin User Management (built ahead of sequence)

- [x] `/admin/users` — real listing, replacing the "Coming Soon"
      placeholder: avatar, name, email, role, status, created date, last
      sign-in; server-side pagination, debounced search (name/email),
      filters (Role, Status), sortable columns (Name, Created, Last
      Sign-In) — same `ActionToolbar`/`SearchInput`/`Pagination`/
      `Table`/`StatusBadge` primitives every other admin listing uses,
      no new pattern invented
- [x] `/admin/users/[id]` — the permanent administrative view of a user,
      organized into tabs (Profile, Enrollments, Learning, Quiz
      Attempts, Orders, Activity) so later phases (Commerce, Instructor
      Panel, Certificates) can add a tab instead of redesigning the page
- [x] Profile tab: profile fields, a Role select (delegates entirely to
      the existing `UserRoleService.updateUserRole` — the only place
      `app_metadata.role`/`profiles.role` are ever written, no
      duplicated role logic) and Activate/Suspend (new
      `ProfileService.setAccountStatus`, `super_admin`-only, the same
      authorization bar role changes already have)
- [x] Enrollments tab: view/grant/revoke/restore, reusing the
      Enrollment Domain (Step 4.2) as-is — `EnrollmentRowActions` for
      Revoke/Restore, `grantEnrollmentAction` for Grant. A new
      lightweight searchable Course selector (`Combobox`, a new
      base-ui-backed UI primitive) fills the one real gap: no
      searchable course picker existed before this
- [x] Learning tab: reuses `StudentDashboardService.getDashboard`
      verbatim — no progress/completion math duplicated, just rendered
      as an admin table instead of student-facing cards
- [x] Quiz Attempts tab: reuses `QuizAttemptService.listForStudent`
      (Step 4.1), resolved to course/lesson titles; a real Empty State
      today since no Curriculum Editor exists yet to author real quizzes
- [x] Orders tab: the permanent tab layout for Commerce (not built yet)
      — a real Empty State, no mock orders or fake payment data; becomes
      a real table automatically once Commerce ships, no page redesign
      needed
- [x] Activity tab: a merged, sorted read across the three *existing*
      audit tables (`course_audit_logs`, `learning_audit_logs`,
      `cms_audit_logs`) filtered to this user as actor — a new
      `findByActorId` read method added to each (they were write-only
      before), no new audit table
- [x] `AuthAdminRepository` (new, sibling to `UserRoleAdminRepository`)
      reads "sign-in provider" from Supabase Auth's Admin API,
      best-effort — `profiles.lastLoginAt` already covers "last sign-in"
      (kept in sync by `ProfileService.recordLogin` on every sign-in,
      password or OAuth)
- [x] Authorization: `/admin/users*` is `super_admin`-only (redirect,
      not Forbidden — same convention as `/admin/settings`); every
      mutation re-checks regardless of which UI called it

### Commerce Foundation (Phase 5, Step 5.1)

- [x] `orders`/`order_items`/`coupons`/`payment_intents`/
      `payment_transactions`/`order_audit_logs`/`coupon_audit_logs`
      schema — `enrollment_source` extended with `"purchase"` (the
      `manual_grant`-only enum's own doc comment had anticipated this
      exact addition since Step 4.1)
- [x] Repository → Service → Server Action layers for the whole domain
      (`src/commerce/`), matching every other domain's shape exactly —
      its own result type, its own `safeRead`/`safeMutation`, its own
      `requireCommerceManagementAccess` (Admin/Super Admin, mirrors
      `requireCourseManagementAccess`) and `canAccessStudentData` (mirrors
      the Learning Domain's, for a student's own orders/checkout)
- [x] Real checkout (`/checkout/[courseSlug]`, under the same
      `(student)` route group `/dashboard` uses): order summary, an
      optional coupon code, "Place Order." A free course (or a coupon
      that brings the total to $0) completes immediately with no
      `PaymentIntent` at all; a paid course creates one in `pending`
      status
- [x] Duplicate-purchase prevention: checking out for a course you're
      already actively enrolled in is rejected; checking out again for
      a course with an existing `pending` order resumes that *same*
      order instead of creating a second one, refreshing to a new
      payable `PaymentIntent` only if the previous attempt failed
- [x] Course-availability validation — only a `published` course can be
      checked out
- [x] Coupons: percentage or fixed-amount, scoped to a specific course,
      a whole specialty, or sitewide; expiration dates; usage limits
      (`maxRedemptions`/`redeemedCount`, incremented only when an order
      actually gets paid, never at checkout time — an abandoned pending
      order never consumes a redemption); Active/Inactive status. The
      discount is resolved and locked into the `Order` at checkout time,
      never recalculated later, per docs/architecture.md §5's design
- [x] The Payment foundation, exactly as docs/architecture.md §5
      designed ahead of this step: a provider-agnostic `PaymentGateway`
      interface (`createCheckoutSession`/`verifyWebhookSignature`/
      `handleWebhookEvent`), with only a `ManualPaymentGateway`
      implementation — no Stripe/Paymob/Fawry integration yet, by this
      step's explicit scope. `PaymentIntent` (one attempt to pay) and
      `PaymentTransaction` (its append-only event log) are separate
      models, so a retried failed attempt has a real history
- [x] Manual payment success/failure simulation stands in for a real
      gateway's webhook: the checkout page's "Simulate Successful/Failed
      Payment" buttons drive the exact same `OrderService.markPaid`
      completion path (enrollment grant, coupon redemption count,
      order-paid audit log) an admin's own "Mark as Paid" override uses
      — one completion path, not two
- [x] The Student Dashboard's real Orders & Billing page
      (`/dashboard/orders`) — order/billing history, invoice status
      (`order.status`; this schema doesn't model a separate invoice
      entity), and payment status, always the signed-in student's own
- [x] Full admin Commerce Management: `/admin/orders` (search,
      pagination, filters, detail view, Mark as Paid, Cancel, Refund)
      and `/admin/coupons` (full CRUD, Activate/Deactivate, usage
      statistics) — same table/pagination/search primitives every other
      admin listing in this codebase uses, no new UI pattern
- [x] Optimistic concurrency on every status-changing mutation (orders'
      `cancel`/`refund`, coupons' `update`/`setActive`), the same
      `expectedUpdatedAt` pattern as the Course Editor
- [x] Its own audit trail — `order_audit_logs` (created/paid/cancelled/
      refunded) and `coupon_audit_logs` (created/updated/activated/
      deactivated), kept as two separate tables per this codebase's
      one-audit-table-per-bounded-sub-domain convention
- [x] Full loading/error/empty states, and RTL/i18n throughout

### Documentation

- [x] Architecture (`architecture.md`)
- [x] Database overview (`database-overview.md`)
- [x] CMS overview (`cms-overview.md`)
- [x] Authentication architecture (`authentication-architecture.md`)
- [x] Roles & permissions (`roles-and-permissions.md`)
- [x] Roadmap (`roadmap.md`)

## Current State

What can already be done, today, in the real running app:

- [x] Create an account
- [x] Sign in (email/password or Google)
- [x] Access the Admin Panel (as `admin`/`super_admin`)
- [x] Edit homepage content
- [x] Publish homepage updates
- [x] Preview unpublished changes
- [x] Restore previous versions
- [x] Homepage renders from the real database (published snapshot, not mock
      data)
- [x] Role-based authorization is active across every route group
- [x] See an authentication-aware navbar, and sign out from it
- [x] Browse, search, filter, sort, and paginate the course catalog in the
      Admin Panel; archive/restore courses; a Super Admin can permanently
      delete one
- [x] Create a course and edit every field on it, including SEO, through
      a real form with concurrency protection and an audit trail
- [x] Browse, search, and filter the real course catalog at `/courses`,
      and open a course's real detail page, in English and Arabic
- [x] Manually grant and revoke a student's course access at
      `/admin/enrollments`, with search/filter/sort/pagination and an
      audit trail
- [x] A signed-in student sees their real enrolled courses, computed
      progress, and a "Continue Learning" shortlist at `/dashboard`
- [x] An enrolled student can open `/courses/[slug]/learn`, read real
      lesson content, mark lessons complete, and navigate a course's
      modules/lessons with live progress tracking
- [x] A Super Admin can browse/search/filter every user at
      `/admin/users`, open one's permanent detail page, change their
      role, activate/suspend their account, and grant/revoke/restore
      their course enrollments — end-to-end admin user management
      without touching SQL
- [x] An enrolled student who reaches a real quiz lesson can answer
      single-choice questions, submit, and immediately see their score,
      pass/fail result, and — if they passed — the lesson and course
      progress update to match, on the Course Player and the Dashboard
      alike
- [x] A student can check out for a free or paid course at
      `/checkout/[courseSlug]`, optionally apply a coupon, complete
      payment (simulated — no real gateway yet), and land enrolled;
      order history and payment status are real at `/dashboard/orders`
- [x] A Super Admin can search/filter/paginate every order and coupon at
      `/admin/orders`/`/admin/coupons`, view details, manually mark an
      order paid, cancel or refund it, and create/edit/activate/
      deactivate coupons with real usage statistics

## Current Limitations

- [ ] Modules/Lessons/Quizzes have a real schema and backend (Step 4.1),
      a real Course Player (Step 4.4), and a real Quiz Player (Step 4.5)
      to consume them, but no admin UI to author them yet — every course
      today has zero real lessons, so the player's empty states and the
      Dashboard's "Not started yet" are what actually renders until a
      Curriculum Editor exists
- [ ] Enrollment can now come from an Admin grant (`/admin/enrollments`,
      or `/admin/users/[id]`'s Enrollments tab) *or* a real self-serve
      checkout (`/checkout/[courseSlug]`) — there's no third path yet
      (e.g. an Instructor granting their own students free access)
- [ ] The homepage's "Featured Courses" section still reads
      `src/data/*.ts` mock data, not real courses — re-pointing it is
      still-ahead Phase 3 work
- [ ] No dedicated Media Library/Picker, Category Picker, or Instructor
      Picker — Cover Image/Thumbnail/Trailer Video are typed-in IDs
- [ ] Media Library not built yet (table exists; no admin UI)
- [ ] No real payment provider — only `ManualPaymentGateway` (simulated
      success/failure) exists; Stripe/Paymob/Fawry integration is
      still-ahead Phase 5 work, per docs/roadmap.md's own sequencing
- [ ] `/profile` and `/settings` are still "Coming Soon" placeholders —
      only `/dashboard` (Step 4.3) got a real implementation this phase
- [ ] Instructor Panel not implemented (`/instructor` has a route guard,
      no pages)
- [ ] Certificates not implemented
- [ ] Most Admin Panel pages are still "Coming Soon" placeholders
      (Homepage Sections, Courses, Enrollments, Users, Orders, and
      Coupons are the real ones so far)
- [ ] Instructor approval workflow deferred (`instructor_profiles` table
      doesn't exist yet)
- [ ] Audit Log has no viewer page yet (backend/data model only)

## Next Major Milestones

Summarized from [`roadmap.md`](./roadmap.md) — see it for the full detail,
ordering rationale, and exit criteria per phase:

- **Core LMS** — schema/backend for Specialties, Categories, Instructors,
  Courses done (Step 3.1); Course Management admin listing done (Step 3.2);
  the Course Editor done (Step 3.3); the public Course Catalog/Details done
  (Step 3.4)
- **Student Experience** — the Student Learning Domain's backend
  (Modules, Lessons, Enrollments, Progress, Quizzes) is done (Step 4.1);
  manual Enrollment Management admin UI is done (Step 4.2); the Student
  Dashboard is done (Step 4.3); the Course Player is done (Step 4.4); the
  Quiz Player is done (Step 4.5) — Phase 4's own exit criteria (watch a
  lesson, take a quiz, see progress update) is now met end to end; a
  Curriculum Editor admin UI (so courses can actually have real lessons/
  quizzes to author, rather than a super_admin seeding them directly) is
  still ahead
- **Commerce** — Orders, Checkout, Coupons, and the Payment foundation
  are done (Step 5.1); a real Stripe/Paymob/Fawry `PaymentGateway`
  implementation (today only `ManualPaymentGateway`/simulation exists)
  is still ahead
- **Instructor Experience** — the Instructor Panel and course authoring
- **Remaining Admin Modules** — Media Library, Instructor Management,
  Reviews, Navigation, Landing Pages, SEO, Site Settings — User
  Management (`/admin/users`, built ahead of sequence) and Orders/
  Coupons management (`/admin/orders`, `/admin/coupons`, the natural
  in-sequence Commerce/Step 5.1 admin surface) are done
- **Engagement** — Certificates, Notifications, Wishlist, Email
- **Scale & Production** — Analytics, Search, Performance, Monitoring

## Documentation Index

| Document | Description |
|---|---|
| [`roadmap.md`](./roadmap.md) | Phased build sequencing, why each phase is ordered where it is, and exit criteria per phase. |
| [`architecture.md`](./architecture.md) | Current-state technical architecture — stack, layering, what's real vs. proposed. |
| [`authentication-architecture.md`](./authentication-architecture.md) | The implemented auth/session/profile/role-sync system in full. |
| [`cms-overview.md`](./cms-overview.md) | The CMS content model, Homepage CMS, and the draft/publish/versioning/audit/concurrency design. |
| [`database-overview.md`](./database-overview.md) | Every table — real and planned — across the whole product. |
| [`roles-and-permissions.md`](./roles-and-permissions.md) | The role model, permission matrix, route access rules, and page inventories per role. |
| [`product-blueprint.md`](./product-blueprint.md) | The product vision and domain model Bosla is being built toward. |
| [`future-features.md`](./future-features.md) | Ideas deliberately deferred, with the reasoning for deferring each. |

## Development Notes

Update this document whenever a numbered [`roadmap.md`](./roadmap.md) phase
is completed. It should always reflect the real, current implementation
state of the project — not a plan, not an aspiration. If something here
stops being true, fix it here rather than leaving it stale.
