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
Soon"/nonexistent state. Phase 6 (Instructor Experience) is now underway:
Step 6.1 built `instructor_profiles` and the instructor application/
approval workflow — a signed-in student can apply to become an Instructor
(`/dashboard/apply-instructor`), an Admin or Super Admin can approve or
reject the application at `/admin/instructors` (replacing its "Coming
Soon" placeholder), and approval promotes the applicant to the
`instructor` role through the existing `UserRoleService` (extended with
one narrow carve-out: an Admin, not only a Super Admin, may promote a
user to `instructor` specifically — every other role change remains
Super-Admin-only). The `/instructor/*` route guard now checks
`instructor_profiles.status === "approved"` in addition to the role
check, completing the deferred check `docs/roles-and-permissions.md` §3
had flagged since the route was first guarded; a pending or rejected
applicant sees a review-status page instead of the Instructor Panel. Step
6.2 built the course state machine (`draft → in_review → published →
archived`) and its Admin-side approval screen, pulled forward from Phase
7 since Phase 6 needs it — `CourseService` gained `submitForReview`
(the course's own instructor, resolved through the `instructors
.profileId` bridge Step 6.1 left unwired, or an Admin/Super Admin),
`approve`, and `reject`, each enforcing its own valid starting status;
`update()` no longer accepts a `status` field at all, closing the gap
where an Admin could previously set a course to any status directly
through the edit form. `/admin/courses` gained Submit for Review/
Approve/Reject row actions alongside the existing Archive/Restore/
Delete. Step 6.3 built the Instructor Panel foundation: a real
`/instructor` Dashboard (course counts by status, no
enrollments/revenue/ratings yet), "My Courses"
(`/instructor/courses`, scoped to the signed-in Instructor's own
courses only), and Create/Edit Course
(`/instructor/courses/new`/`/instructor/courses/[id]/edit`) — the exact
same `CourseEditorForm` the Admin Course Editor uses, not a duplicate,
with the Instructor/Status pickers and SEO section hidden and
`createOwnCourseAction`/`updateOwnCourseAction` injected in place of the
Admin actions. `CourseService.createOwn` finally wires the
`instructors.profileId` bridge Step 6.1 deliberately left unset,
auto-creating an Instructor's own content-attribution row the first time
they create a course. Editing is `draft`-only — the moment a course is
submitted for review (reusing Step 6.2's `submitForReview` as a My
Courses row action), an Instructor loses edit access until an Admin
approves or rejects it, matching docs/roles-and-permissions.md §2's
"Author/edit own courses (**draft**)". Step 6.4 built the Curriculum
Builder: an Instructor can create, edit, delete, and drag-reorder
their own courses' Modules and Lessons at
`/instructor/courses/[id]/curriculum`, with a nested tree editor
(`@dnd-kit`, the one new dependency this step needed — no existing
drag-and-drop primitive to reuse) supporting all three lesson types
(Video, Quiz, Resource — "Resource" is the existing `reading` lesson
type from Step 4.1's schema, relabeled for the Instructor-facing UI
rather than adding a new enum value). `ModuleService`/`LessonService`
gained `createOwn`/`updateOwn`/`deleteOwn`/`reorderOwn` alongside their
existing Admin-only methods, all reusing the exact same repositories
and `learning_audit_logs` trail; a new `requireOwnCourseAccess` helper
(reusing `CourseService.getOwnById`) is the one ownership+draft-status
check every one of them calls first. A `"quiz"`-typed lesson gets its
placeholder `Quiz` row auto-created via `QuizService.createOwn` (Step
6.4) — reusing the existing Quiz domain from Phase 4, not duplicating
it. Step 6.5 built the Quiz Builder: from a `"quiz"`-typed lesson row in
the Curriculum Builder, an Instructor reaches a dedicated Quiz Editor
(`/instructor/courses/[id]/curriculum/quiz/[lessonId]`) to author that
quiz's own questions — multiple-choice prompts with a single correct
answer, drag-reordered the same `@dnd-kit` way modules/lessons already
are, plus per-question answer-choice add/remove/reorder and a pass
threshold field — entirely on top of the existing Phase 4 Quiz domain
(`QuizService`/`QuizQuestionService` gained their own `createOwn`/
`updateOwn`/`deleteOwn`/`reorderOwn`, mirroring Step 6.4's Module/Lesson
pattern exactly, gated by the same `requireOwnCourseAccess`). A quiz's
"title"/"description" are its lesson's existing `title`/`body` fields,
edited in the same form via the already-existing `updateOwnLessonAction`
— no new columns, no duplicate title field. The Student Quiz Player
(Step 4.5) and its grading (`QuizAttemptService.submit`) were not
touched and were verified to still work unmodified against
Instructor-authored content. Step 6.6 finished the rest of Phase 6's
Instructor-facing scope: Students (`/instructor/students`, a read-only
list of everyone enrolled across the Instructor's own courses with
computed progress, reusing `EnrollmentService`/`LessonProgressRepository`
as-is), Coupons (`/instructor/coupons`, course-scoped-only discount
codes, reusing the Commerce `CouponService`/`CouponRepository`), Earnings
(`/instructor/earnings`, a read-only gross-revenue-per-course display,
`paid` orders only — no payout figure, since payout automation is
deliberately deferred), and Profile (`/instructor/profile`, editing the
same `instructors` row `CourseService.createOwn` already attributes
courses to). **Phase 6 (Instructor Experience) is now complete**, with
one deliberate, explicit exception: the Instructor Panel's Reviews page
(a read-only view of reviews left on own courses) is intentionally
postponed, not built, because the Review entity itself — a `reviews`
table, a student review-submission flow — does not exist anywhere in
this codebase yet, and no step in `roadmap.md` has ever scoped building
it (Phase 7's "Reviews" line only ever covers Admin *moderation* of
reviews that already exist, never their authoring). Introducing that
whole domain from scratch was judged out of scope for an
Instructor-Experience-only phase; the Instructor's Reviews page will
become buildable once a future phase introduces the Review domain
itself, at which point it's a small addition on top of the same
`requireOwnCourseAccess` pattern every other Instructor Panel page here
already uses.

Phase 7 (Remaining Admin Modules) is now underway: Step 7.1 built the
Media Library — a real uploader/browser at `/admin/media` (replacing its
"Coming Soon" placeholder), extending the existing `cms_media_assets`
table (in place since Phase 2, previously storage/metadata-only with no
uploader) with real file metadata (title/caption/description/tags/
folder/fileType/fileSize/uploadedByUserId), a new `cms_media_audit_logs`
trail, and real Supabase Storage integration (a new public `media`
bucket) behind the same `StorageProvider` port `avatar-storage
.repository.ts` already established. Search/filter/pagination, drag-
and-drop multi-upload, image/video/PDF previews, optimistic concurrency,
and audit logging are all real. Most importantly, a generic `MediaPicker`
component (id-based `value`/`onChange`, not hardcoded to any domain) is
now available for every future feature that needs to attach an
uploaded asset. That component is now wired into every existing form
that used to take a typed-in raw asset id: the Course Editor's Cover
Image/Thumbnail/Trailer Video, the Instructor Profile's avatar, the
Curriculum Builder's Lesson video, the Homepage Editor's Hero image, and
the shared SEO form's social share image (used by both the Homepage
Editor and the Course Editor) — via a new `MediaPickerField` wrapper
(`Controller` + `MediaPicker` + label/hint, the same shell
`LocalizedTextField`/`NumberField` already give their own fields).
`IdReferenceField` itself remains in use for the one reference it was
never meant to replace (the Hero slide's `instructorId` — a different
domain, not a media asset).

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

### Instructor Application & Approval (Phase 6, Step 6.1)

- [x] `instructor_profiles`/`instructor_profile_audit_logs` schema
      (`src/db/schema/instructor.ts`) — a single `status` enum
      (`pending | approved | rejected`) rather than a separate boolean,
      matching the Course Domain's `course_status` state-machine
      convention; one application per user (unique on `user_id`, which
      references `auth.users.id`, matching `enrollments.studentId`'s
      established "FK the JWT/session identity, not `profiles.id`"
      precedent)
- [x] Repository → Service → Server Action layers for the new
      `src/instructor/` domain, matching every other domain's shape —
      its own result type, its own `safeRead`/`safeMutation`, its own
      `requireInstructorManagementAccess` (Admin/Super Admin, mirrors
      `requireCommerceManagementAccess`)
- [x] A signed-in student can apply at `/dashboard/apply-instructor`
      (bilingual headline + credentials); one application per user
      (a rejected applicant doesn't get a self-serve reapply path in
      this step); a `/dashboard` prompt card links to it and shows the
      current status once one exists
- [x] `/admin/instructors` — the real Instructor Applications listing
      (replacing its `AdminPlaceholderPage`), with search/filter/
      pagination and Approve/Reject row actions, same
      Table/Pagination/`StatusBadge` primitives every other admin
      listing uses (`approved`/`rejected` added to `StatusBadge`'s
      status union)
- [x] Approving promotes the applicant to `instructor` through the
      existing `UserRoleService.updateUserRole` — the **only** place
      `app_metadata.role`/`profiles.role` is written — with one narrow
      exception added in this step: an Admin (not only a Super Admin)
      may promote specifically *to* `instructor`; every other role
      change stays Super-Admin-only, unchanged
- [x] The `/instructor/*` route guard now completes the check
      `docs/roles-and-permissions.md` §3 had flagged as deferred: after
      the existing role check, it additionally requires
      `instructor_profiles.status === "approved"`, rendering a review-
      status page in place of the Instructor Panel for a pending/
      rejected/no-application user with `role === "instructor"` (reachable
      today only via a direct Super Admin role edit through
      `/admin/users`, bypassing the application)
- [x] Its own audit trail — `instructor_profile_audit_logs`
      (`application_submitted`/`application_approved`/
      `application_rejected`)
- [x] Optimistic concurrency on `approve`/`reject` (same
      `expectedUpdatedAt` pattern as every other domain)
- [x] Full loading/error/empty states, and RTL/i18n throughout
- [x] Fixed a pre-existing gap: `UserRoleAdminRepository` (unlike its
      sibling `AuthAdminRepository`) still imported `createAdminClient`
      at module top-level instead of dynamically inside each method —
      merely importing `UserRoleService` (now a dependency of
      `InstructorApplicationService.approve`) would have crashed any
      `tsx`-run verification script outside Next's bundler. Fixed to
      match `AuthAdminRepository`'s existing pattern

### Course State Machine & Admin Approval Screen (Phase 6, Step 6.2)

- [x] `CourseService.submitForReview` (`draft -> in_review`) — the one
      state-machine method with a real non-Admin caller: the course's
      own instructor, resolved via `course.instructorId` (the content
      `instructors` row) → `instructors.profileId` → `profiles.id` →
      compared against the signed-in `actingUser.id`. An Admin/Super
      Admin may also call it directly on any course, matching their
      existing "author/edit any course" authority
      (docs/roles-and-permissions.md §2) — one implementation, not a
      separate instructor-only code path, so the later Course Builder
      step reuses this exact method for its own "Submit for Review"
      button
- [x] `CourseService.approve` (`in_review -> published`) and `.reject`
      (`in_review -> draft`) — Admin/Super-Admin-only, each rejecting a
      course that isn't currently `in_review`
- [x] `CourseService.update()` no longer accepts a `status` field —
      `updateCourseSchema` now omits it entirely (a type-level guarantee,
      not just a runtime check). Status only changes through
      `submitForReview`/`approve`/`reject`/`archive`/`restore`, each
      enforcing its own valid starting state. Initial status at course
      *creation* is unaffected — `createCourseSchema` still sets it
      freely, matching existing behavior
      (an Admin seeding a course directly as `published` is unchanged)
- [x] `/admin/courses` gained Submit for Review/Approve/Reject row
      actions (visible only when the course's current status makes them
      valid), alongside the existing Archive/Restore/Delete — same
      dropdown-menu-plus-toast-plus-`router.refresh()` pattern as every
      other admin listing's row actions
- [x] The Course Editor's status field is now read-only in edit mode (a
      `StatusBadge` plus a hint pointing to the listing's row actions) —
      still a free `Select` in create mode, unchanged
- [x] Optimistic concurrency (`expectedUpdatedAt`) on all three new
      transitions, same pattern as every other domain; `archive`/
      `restore` also gained the (previously absent) parameter, though
      no caller passes it yet — an additive, backward-compatible change
- [x] Its own audit actions on the existing `course_audit_logs` table —
      `submitted_for_review`/`approved`/`rejected`, alongside the
      pre-existing `create`/`update`/`archive`/`restore`/`delete`
- [x] Full loading/error/empty states, and RTL/i18n throughout

### Instructor Panel Foundation (Phase 6, Step 6.3)

- [x] `/instructor` — a real Dashboard entry point: course counts by
      status (draft/in review/published/archived) and links to My
      Courses/Create Course, replacing the "coming soon" placeholder.
      Deliberately minimal — no enrollments/revenue/ratings, all
      still-ahead Phase 6 scope
- [x] `/instructor/courses` ("My Courses") — search/status-filter/
      pagination, scoped server-side to the signed-in Instructor's own
      courses only (`CourseService.searchResolvedForInstructor`, which
      forces the `instructorId` filter to the caller's own resolved
      `instructors` row and never reads it from the request) — a
      tampered `instructorId` query param can never surface another
      Instructor's courses
- [x] `/instructor/courses/new` and `/instructor/courses/[id]/edit` —
      the *same* `CourseEditorForm` component the Admin Course Editor
      uses (Step 3.3), not a parallel copy: `createAction`/
      `updateAction` props swap in `createOwnCourseAction`/
      `updateOwnCourseAction`, and `showInstructorField`/
      `showStatusField`/`showSeoSection` hide the pickers an Instructor
      must never touch. Every other field, validation rule, and piece of
      loading/error/RTL/i18n behavior is identical — same schema, same
      `<SectionFormShell>` tree
- [x] `CourseService.createOwn`/`updateOwn` — an Instructor can create
      and edit only their own courses, enforced server-side regardless
      of what the client sends: `instructorId`/initial `status` are
      always forced (never read from input) on create, `instructorId`
      is always stripped back out of the row on update, and ownership
      (`instructors.profileId` → `profiles.id` → `actingUser.id`) is
      re-checked on every mutation — reusing the exact `ownsCourse`
      helper `submitForReview` (Step 6.2) already established, now
      extracted for both to share. Editing is further restricted to
      `draft`-status courses only, matching
      docs/roles-and-permissions.md §2
- [x] `CourseService.createOwn` finally wires the `instructors
      .profileId` bridge Step 6.1 deliberately left unset — the first
      time an approved Instructor creates a course,
      `resolveOrCreateOwnInstructor` auto-creates their own content-
      attribution row (name copied from their profile's display name,
      both locales — no bilingual bio-editing UI exists yet); every
      course after reuses the same row, verified idempotent
- [x] "Submit for Review" is a My Courses row action for `draft`
      courses, reusing `CourseService.submitForReview` (Step 6.2)
      verbatim — the exact method call an Instructor and an Admin now
      both exercise, not two implementations
- [x] Optimistic concurrency (`expectedUpdatedAt`) and the existing
      `course_audit_logs` trail (`create`/`update`/
      `submitted_for_review`) carry through unchanged for every
      Instructor-initiated mutation — same methods, same guarantees, as
      their Admin-initiated counterparts
- [x] Full loading/error/empty states, and RTL/i18n throughout —
      Instructor-facing copy reuses `Admin.courses.*`'s existing
      translations wherever the string is genuinely shared (status
      labels, column headers, toasts, pagination), with new
      `Instructor.*` keys added only for copy that's actually different
      (page titles/descriptions, empty states, the "can't edit right
      now" status message)

### Curriculum Builder (Phase 6, Step 6.4)

- [x] `/instructor/courses/[id]/curriculum` — a nested tree editor for an
      Instructor's own course: Modules containing Lessons, both
      drag-reorderable (`@dnd-kit/core`+`@dnd-kit/sortable`, the one new
      dependency this step needed — no existing drag-and-drop primitive
      in the codebase to reuse). One `DndContext` for the whole tree,
      with a top-level `SortableContext` for modules and one nested
      `SortableContext` per module for its own lessons; a lesson can
      only be reordered within its own module in this step (moving one
      to a different module isn't supported yet)
- [x] Create/Edit/Delete for both Modules and Lessons, via `Sheet`
      (already built on `@base-ui/react/dialog`, previously unused —
      reused as the Curriculum Builder's form modal rather than adding a
      new Dialog primitive) forms reusing the same
      `LocalizedTextField`/`NumberField`/`CheckboxField`/`SelectField`
      building blocks the Course Editor already established
- [x] All three lesson types supported: Video, Quiz, Resource.
      "Resource" is the existing `reading` lesson type from
      `db/schema/learning.ts` (Step 4.1) — relabeled for the
      Instructor-facing UI, not a new enum value (renaming the stored
      value would have touched the already-shipped Course Player, Step
      4.4). A `"quiz"`-typed lesson gets its placeholder `Quiz` row
      auto-created/backfilled via a new `QuizService.createOwn` —
      reusing the existing Quiz domain from Phase 4 rather than
      duplicating it; authoring the quiz's own questions is still later
      Phase 6 scope
- [x] `ModuleService`/`LessonService` gained `createOwn`/`updateOwn`/
      `deleteOwn`/`reorderOwn`, alongside their existing Admin-only
      `create`/`update`/`delete` (unchanged) — same
      `ModuleRepository`/`LessonRepository` calls either way, gated by a
      new shared `requireOwnCourseAccess` helper
      (`src/learning/utils/require-own-course-access.ts`) instead of
      `requireCourseManagementAccess`. That helper reuses
      `CourseService.getOwnById` (Step 6.3) as its ownership check — one
      implementation of "does this course belong to this signed-in
      Instructor," not a third copy — plus an optional `requireDraft`
      flag enforcing docs/roles-and-permissions.md §2's "Author/edit own
      courses (**draft**)" for curriculum too: an Instructor can still
      *view* their curriculum once submitted for review, just not edit
      it
- [x] A new `CurriculumService.getForInstructor` composes the nested
      tree from `ModuleRepository.findByCourseId` +
      `LessonRepository.findByModuleIds` (batched — no N+1 across a
      course's modules), returning *raw* bilingual `Module`/`Lesson`
      data (not locale-resolved) since this is an editing surface, the
      same "raw for editing" reasoning `/instructor/courses/[id]/edit`
      already established for the course itself
- [x] Reorder rejects any list that doesn't exactly match the course's
      (or module's) current rows — wrong length, a foreign id, a missing
      id — rather than silently applying a partial reorder; ownership
      can never be bypassed by tampering with which rows a reorder
      request names
- [x] Optimistic concurrency (`expectedUpdatedAt`) on Module/Lesson
      create/update, same pattern as every other domain; reorder itself
      is a bulk position rewrite with no per-item concurrency check (by
      design — only one Instructor can ever be dragging their own
      course's tree at a time in practice)
- [x] Its own audit actions on the existing `learning_audit_logs`
      table — `module_reordered`/`lesson_reordered`, alongside the
      pre-existing `module_created`/`updated`/`deleted`,
      `lesson_created`/`updated`/`deleted`, `quiz_created`/`updated`/
      `deleted`
- [x] Full loading/error/empty states, and RTL/i18n throughout

### Quiz Builder (Phase 6, Step 6.5)

- [x] `/instructor/courses/[id]/curriculum/quiz/[lessonId]` — reached
      from a "Manage quiz" button on any `"quiz"`-typed lesson row in the
      Curriculum Builder (Step 6.4). Confirms the requested lesson
      actually belongs to the course in the URL (`resolveLessonCourse`)
      before rendering, so an Instructor can't read another course's
      quiz content by editing the URL's lesson id
- [x] Question CRUD (prompt, multiple-choice answers, single correct
      answer) and drag-reorder (same `@dnd-kit` `SortableContext`
      pattern Step 6.4 established for Modules/Lessons), plus
      per-question Answer Choice CRUD and ordering (add/remove/move-up/
      move-down inside the question form, via `useFieldArray` — a plain
      button-based reorder rather than a second nested `DndContext`,
      appropriate for a handful of short strings inside a modal)
- [x] Quiz "title"/"description" are edited in the same page, but are
      really the lesson's own `title`/`body` fields — reused via the
      already-existing `updateOwnLessonAction` (Step 6.4), not a new
      column on `quizzes`; the pass threshold is the one field `quizzes`
      actually owns, edited via a new `QuizService.updateOwn`
- [x] `QuizService.updateOwn` and `QuizQuestionService`'s new
      `createOwn`/`updateOwn`/`deleteOwn`/`reorderOwn` are the exact
      same `QuizRepository`/`QuizQuestionRepository` calls the
      Admin-only `create`/`update`/`delete` already used, gated by the
      same `requireOwnCourseAccess` helper Step 6.4 built (two new
      `resolveQuizCourse`/`resolveQuizQuestionCourse` helpers walk
      `quiz -> lesson -> module -> course` / `question -> quiz -> ...`
      to reach it, the same "compose via extra reads" pattern
      `resolveLessonCourse` already used)
- [x] Reorder uses the identical exact-match validation Step 6.4's
      Module/Lesson reorder established (wrong length, a foreign id, or
      a missing id is rejected outright); optimistic concurrency
      (`expectedUpdatedAt`) on quiz and question create/update, same
      pattern as every other domain
- [x] New `question_created`/`question_updated`/`question_deleted`/
      `question_reordered` audit actions on `learning_audit_logs` — the
      Admin-only question path stays intentionally unlogged at this
      granularity (unchanged), but an Instructor authoring their own
      quiz content now is, matching Step 6.4's "reorder gets its own
      audit action" precedent
- [x] The Student Quiz Player (Step 4.5) and its grading
      (`QuizAttemptService.submit`, `CoursePlayerService`) were not
      modified at all — verified end-to-end against
      Instructor-authored questions (a passing attempt still marks the
      lesson complete via the existing `LessonProgressService` flow)
- [x] Full loading/error/empty states, and RTL/i18n throughout

### Remaining Instructor Experience (Phase 6, Step 6.6)

- [x] Students (`/instructor/students`) — a new
      `EnrollmentService.listForInstructor` composes every enrollment
      across the signed-in Instructor's own courses (never another
      Instructor's — scoped via `CourseService.getOwnInstructor` +
      `CourseRepository.findByInstructorId`, the same "own course id
      list" resolution `getMyCourseCounts` already established) with a
      per-student completion percentage, reusing the exact
      `computeProgressPercentage` math `CoursePlayerService` already
      uses. Read-only — no row actions; enrollment management itself
      stays an Admin capability
- [x] Coupons (`/instructor/coupons`, `/new`, `/[id]/edit`) — the
      Commerce `CouponService` gained `listOwnByInstructor`/`createOwn`/
      `updateOwn`/`setActiveOwn`, mirroring the Admin
      `searchResolved`/`create`/`update`/`setActive` methods exactly
      (same repository calls, same `recordCouponAuditLog` reuse), gated
      by course ownership instead of `requireCommerceManagementAccess`.
      An Instructor's own coupon is always `scope: "course"`, targeting
      one of their own courses — `scope` is never a form field, and
      `scopeId` can't be changed after creation
- [x] Earnings (`/instructor/earnings`) — a new
      `OrderItemRepository.getRevenueByCourseIds` (a real SQL
      `sum`/`count(distinct ...)` grouped query, `paid` orders only) and
      `OrderService.getOwnEarningsSummary`, scoped to the Instructor's
      own courses the same way Students is. Deliberately no payout/
      revenue-share figure — that math doesn't exist anywhere in this
      codebase (`docs/future-features.md`'s "Automated instructor
      payouts" is still deferred); this is a read-only display of gross
      revenue actually collected, matching
      `docs/roles-and-permissions.md` §5's own "read-only display until
      payout automation exists" wording
- [x] Profile (`/instructor/profile`) — an Instructor editing their own
      public `instructors` row (name/title/qualification/bio/
      experienceYears/avatarImageId only — `slug`/`isFeatured`/
      `isActive`/`displayOrder`/`specialtyId`/`profileId` stay
      Admin-managed), resolved via the pre-existing
      `CourseService.getOwnInstructor`. Not audit-logged — no existing
      audit table has a nullable `courseId` to anchor a courseId-less
      event to, and self-editing one's own bio isn't audited anywhere
      else in this codebase either; adding a new table for this one
      event was judged disproportionate for this step
- [x] Reviews intentionally **postponed**, not built — the underlying
      entity (a `reviews` table, a student review-submission flow)
      doesn't exist anywhere in this codebase yet, and the roadmap only
      ever scopes Admin *moderation* of reviews (Phase 7's "Reviews"
      module), never their authoring. Building that whole domain from
      scratch was judged out of scope for an Instructor-Experience-only
      phase; this is a deliberate deferral, not a gap — Phase 6 is
      considered complete without it, and the Instructor Reviews page
      becomes buildable once a future phase introduces the Review
      domain itself
- [x] `CourseInstructorRepository.update` gained optimistic-concurrency
      support (`expectedUpdatedAt`) for the Profile editor, same pattern
      every other domain's `update` already uses — the pre-existing
      Admin caller is unaffected (it simply never passes the new,
      optional third argument); `CouponRepository.update` already had
      it from Phase 5, reused as-is for `updateOwn`/`setActiveOwn`
- [x] Full loading/error/empty states, and RTL/i18n throughout

### Media Library (Phase 7, Step 7.1)

- [x] `/admin/media` — a real Media Library replacing its "Coming Soon"
      placeholder: card-grid browsing (not a table — a thumbnail is the
      useful summary a media row doesn't have), search, file-type filter,
      folder filter, and pagination, mirroring `CouponsManager`'s exact
      URL-search-param-driven shell
- [x] `cms_media_assets` (real since Phase 2, storage/metadata-only)
      extended with `storagePath`/`fileType`/`mimeType`/`fileSize`/
      `title`/`caption`/`description`/`tags`/`folder`/
      `uploadedByUserId`; `alt`/`width`/`height` made nullable (only
      meaningful for an image, not a PDF). A new `cms_media_audit_logs`
      table (own table, not `cms_audit_logs` — that one's `pageId` is
      `NOT NULL`, and a media asset isn't a page), migration
      `0012_media_library.sql`, applied
- [x] Real Supabase Storage integration — a new public `media` bucket
      (50MB limit, image/video/PDF mime allowlist enforced by the bucket
      itself, not just app code), `SupabaseMediaStorage` implementing the
      exact `StorageProvider` port `auth/repositories/avatar-storage
      .repository.ts` already defined (reused as-is, not duplicated) —
      a provider swap later (S3, Cloudinary, ...) means one new adapter,
      not touching `CmsMediaService`. Row Level Security policies for
      `storage.objects` (migration `0013_media_storage_policies.sql`) —
      Supabase enables RLS on that table with zero policies by default,
      so the first real upload through the app failed ("new row
      violates row-level security policy") until these were added;
      insert/update/delete are scoped to `bucket_id = 'media'` and the
      same `app_metadata.role` JWT claim `getRoleFromUser` already reads
      (admin/super_admin only) — not a second authorization system, a
      Storage-level re-check of the same role `requireCmsAccess`
      already gated on before Storage is ever touched. Also fixed:
      Server Actions default to a 1MB body size limit, well under a
      real upload — `next.config.ts` now sets
      `experimental.serverActions.bodySizeLimit: "50mb"` to match
      `MEDIA_MAX_FILE_SIZE_BYTES`
- [x] Drag & drop + multi-file upload (`MediaUploadZone`, shared by the
      admin grid and `MediaPicker`) — client-side reads image/video
      pixel dimensions via a load event (no new server-side
      image-processing dependency needed), validates type/size on the
      client for fast feedback and again server-side (never trusted),
      and removes the just-uploaded Storage object if the DB insert
      after it fails, so a failed upload never leaves an orphaned file
- [x] Image and video previews (an actual `<video>` element, muted, its
      first frame) in every grid card; PDF/other get a file-type icon —
      a real PDF thumbnail would need a render pipeline out of this
      step's scope
- [x] Full metadata editing, "rename" (the same form's `title` field —
      no separate flow, and never touches the underlying Storage
      object's path), delete (Storage object removed before the DB row,
      so a failed delete never leaves a dangling reference), and "copy
      public URL", all in one `MediaDetailSheet`
- [x] Optimistic concurrency (`expectedUpdatedAt`) and its own audit
      actions (`media_created`/`media_updated`/`media_renamed`/
      `media_deleted`) on every mutation, same pattern as every other
      domain
- [x] A generic, reusable `MediaPicker` component (`value`/`onChange`
      over a plain asset id, an optional `accept` file-type filter) —
      the "most important" deliverable of this step per its own scope:
      every future feature that needs an image/video/document attaches
      through this instead of building its own upload flow or a
      typed-in raw id
- [x] `MediaPicker` retrofitted into every existing raw-asset-id field
      via a new `MediaPickerField` wrapper (`Controller` + `MediaPicker`
      + label/hint, the same shell every other field component gives
      its own field): the Course Editor's Cover Image/Thumbnail
      (`accept: ["image"]`) and Trailer Video (`accept: ["video"]`),
      the Instructor Profile's avatar (`accept: ["image"]`), the
      Curriculum Builder's Lesson video (`accept: ["video"]`), the
      Homepage Editor's Hero image (`accept: ["image"]`), and the
      shared `SeoForm`'s social share image (used by both the Homepage
      Editor and the Course Editor). `IdReferenceField` stays in use
      for the one reference it was never meant to replace — the Hero
      slide's `instructorId`, a different domain, not a media asset.
      Two field schemas (`heroContentSchema.imageId`,
      `seoMetaSchema.ogImageId`) gained `.nullable()` they were
      previously missing — needed so `MediaPicker`'s "remove" action
      (which sends an explicit `null`) can actually clear a
      previously-set image, not just omit setting one
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
- [x] A signed-in student can apply to become an Instructor at
      `/dashboard/apply-instructor`; an Admin or Super Admin can review,
      approve, or reject the application at `/admin/instructors`;
      approval promotes the applicant's role and grants `/instructor/*`
      access, with a pending/rejected applicant seeing a review-status
      page there instead
- [x] A Super Admin/Admin can move a course through its full lifecycle
      at `/admin/courses` — Submit for Review, Approve, Reject, Archive,
      Restore — each a real, authorized, audited transition; a course's
      status can no longer be set to an arbitrary value through the
      Course Editor's edit form
- [x] An approved Instructor can sign in, see their own course counts
      and create a course at `/instructor`, manage only their own
      courses at `/instructor/courses`, create and edit a course's
      details/pricing (while it's `draft`) at
      `/instructor/courses/new`/`/instructor/courses/[id]/edit`, and
      submit it for review — never able to see, edit, or reassign
      another Instructor's course, even by tampering with a request
- [x] That same Instructor can build a real curriculum for their own
      draft course at `/instructor/courses/[id]/curriculum` — add,
      edit, delete, and drag-reorder Modules and Lessons (Video, Quiz,
      Resource), with a Quiz-type lesson getting its placeholder quiz
      row automatically. An Admin can still author curriculum too via
      the pre-existing `ModuleService`/`LessonService`
      `create`/`update`/`delete` (unchanged) — there's just no admin UI
      wired to them yet, same as before this step
- [x] From a Quiz-type lesson, that same Instructor can now open a real
      Quiz Editor at `/instructor/courses/[id]/curriculum/quiz/[lessonId]`
      and fully author it — add/edit/delete/drag-reorder multiple-choice
      questions, edit each question's answer choices and which one is
      correct, and set the quiz's title/description/pass threshold — so
      a course built entirely through the Instructor Panel can now
      actually be taken end to end, with no direct database seeding
      required
- [x] That same Instructor can also see who's enrolled in their own
      courses and how far along they are at `/instructor/students`,
      create and manage discount codes scoped to their own courses at
      `/instructor/coupons`, see gross revenue collected per course at
      `/instructor/earnings`, and edit their own public bio/credentials/
      avatar at `/instructor/profile` — **Phase 6 (Instructor Experience)
      is now complete**, with Reviews intentionally postponed (see
      Current Limitations) until a future phase introduces the Review
      domain
- [x] A Super Admin or Admin can upload, browse, search, filter, edit
      the metadata of, rename, and delete real media files (images,
      video, PDFs) at `/admin/media`, with drag-and-drop multi-upload
      and real previews — no direct Supabase Storage access needed. The
      reusable `MediaPicker` component is wired into every form that
      used to take a typed-in raw asset id — Course cover/thumbnail/
      trailer, Instructor avatar, Lesson video, the Homepage Editor's
      Hero image, and every SEO form's social share image — so
      attaching real media to any of those no longer means knowing a
      UUID

## Current Limitations

- [ ] Question banks, randomized questions, timed quizzes, and
      essay/file-upload/drag-and-drop question types (Quiz Builder, Step
      6.5) are deliberately out of scope — only single-correct-answer
      multiple choice is supported, matching the Quiz Player's own
      (Step 4.5) grading model
- [ ] The Quiz Builder (Step 6.5) is Instructor-only — there's still no
      Admin UI for authoring `quiz_questions` on an Admin-seeded course;
      an Admin would need to either use the unchanged `QuizQuestionService`
      `create`/`update`/`delete` directly or have the course's
      `instructors.profileId` bridged to their own profile first
- [ ] Enrollment can now come from an Admin grant (`/admin/enrollments`,
      or `/admin/users/[id]`'s Enrollments tab) *or* a real self-serve
      checkout (`/checkout/[courseSlug]`) — there's no third path yet
      (e.g. an Instructor granting their own students free access)
- [ ] The homepage's "Featured Courses" section still reads
      `src/data/*.ts` mock data, not real courses — re-pointing it is
      still-ahead Phase 3 work
- [ ] The Homepage Editor's Hero section carousel still references its
      per-slide instructor by a typed-in raw id (`IdReferenceField`) —
      an Instructor reference, not a media asset, so `MediaPicker`
      doesn't apply; the Course Editor's own Instructor/Category fields
      already use a real dropdown (`SelectField`), unaffected by this
- [ ] Two `MediaPicker` integration audits found genuinely dead ends, not
      missed wiring: the CTA section's `backgroundImageId` field exists
      in the schema but has no admin UI *or* public rendering at all
      (a half-built field, not a picker gap — wiring a picker onto a
      value nothing displays would be misleading), and the Categories
      section has no admin editor built yet at all (`imageId` per item
      exists in the schema, but there's no `CategoriesSectionForm` to
      put a picker in). Both are pre-existing gaps unrelated to the
      Media Library — building either is a CMS-section-completion task,
      not a media-picker retrofit
- [ ] No real payment provider — only `ManualPaymentGateway` (simulated
      success/failure) exists; Stripe/Paymob/Fawry integration is
      still-ahead Phase 5 work, per docs/roadmap.md's own sequencing
- [ ] `/profile` and `/settings` are still "Coming Soon" placeholders —
      the "Apply to become an Instructor" entry point
      `docs/roles-and-permissions.md` §4 places on the Profile & Settings
      page was instead built as its own route
      (`/dashboard/apply-instructor`, linked from `/dashboard`) rather
      than inside that still-unbuilt placeholder
- [ ] Reviews (`docs/roles-and-permissions.md` §5) is **intentionally
      postponed**, not an oversight — the Review entity itself (a
      `reviews` table, a student review-submission flow) does not exist
      anywhere in this codebase yet, and no step in `roadmap.md` has
      ever scoped building it (Phase 7's "Reviews" line covers Admin
      *moderation* of reviews that already exist, never their
      authoring). Phase 6 (Instructor Experience) is considered
      **complete** without this page; it stays deferred until a future
      phase introduces the Review domain itself, at which point the
      Instructor's read-only Reviews page is a small addition on the
      same `requireOwnCourseAccess` pattern every other page here uses
- [ ] The Instructor Profile editor (Step 6.6) doesn't have the Admin
      "moderation" (unpublish) capability `docs/cms-overview.md` §4
      describes as the eventual design — no admin UI/workflow for that
      exists yet for the `instructors` table specifically (only its
      `isActive` column, unused by any admin surface today)
- [ ] Certificates not implemented
- [ ] Most Admin Panel pages are still "Coming Soon" placeholders
      (Homepage Sections, Courses, Enrollments, Users, Orders, Coupons,
      and Instructors are the real ones so far)
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
  lesson, take a quiz, see progress update) is now met end to end, and as
  of Phase 6 Steps 6.4–6.5 an Instructor can author that entire lesson/
  quiz tree themselves instead of a super_admin seeding it directly
- **Commerce** — Orders, Checkout, Coupons, and the Payment foundation
  are done (Step 5.1); a real Stripe/Paymob/Fawry `PaymentGateway`
  implementation (today only `ManualPaymentGateway`/simulation exists)
  is still ahead
- **Instructor Experience — ✅ done.** `instructor_profiles` and the
  application/approval workflow are done (Step 6.1); the course state
  machine and its Admin-side approval screen are done (Step 6.2); the
  Instructor Panel foundation — Dashboard, My Courses, Create/Edit
  Course, all ownership-scoped — is done (Step 6.3); the Curriculum
  Builder — Modules/Lessons, drag-reorder, Video/Quiz/Resource lesson
  types — is done (Step 6.4); the Quiz Builder — question/answer-choice
  CRUD, ordering, pass threshold — is done (Step 6.5); Students,
  Coupons, Earnings, and Profile editing are done (Step 6.6). **Phase 6
  is complete**, with Reviews intentionally postponed — it has no
  underlying entity anywhere in this codebase yet, and the roadmap only
  ever scopes Admin *moderation* of reviews (Phase 7), never their
  authoring, so there's nothing for an Instructor-facing "my reviews"
  page to read from until a future phase introduces the Review domain
  itself
- **Remaining Admin Modules** — the Media Library (uploader/browser +
  `MediaPicker`) is done (Step 7.1); Reviews, Navigation, Landing Pages,
  SEO, Site Settings are still ahead. User Management (`/admin/users`,
  built ahead of sequence), Orders/Coupons management (`/admin/orders`,
  `/admin/coupons`, the natural in-sequence Commerce/Step 5.1 admin
  surface), and Instructor Applications (`/admin/instructors`, Step 6.1)
  are also done
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
