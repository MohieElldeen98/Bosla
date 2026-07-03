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
Server Actions, validators, no UI yet.

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

## Current Limitations

- [ ] Modules/Lessons/Quizzes have a real schema and backend (Step 4.1)
      but no admin UI to author them yet, and no Course Player to
      actually watch/take one — the public course detail page still has
      no lesson content or player/preview
- [ ] No Student Dashboard, enrollment screens, or self-serve enrollment
      — `EnrollmentService.grant` exists but nothing calls it outside a
      script; every enrollment today would be `manual_grant` only
- [ ] The homepage's "Featured Courses" section still reads
      `src/data/*.ts` mock data, not real courses — re-pointing it is
      still-ahead Phase 3 work
- [ ] No dedicated Media Library/Picker, Category Picker, or Instructor
      Picker — Cover Image/Thumbnail/Trailer Video are typed-in IDs
- [ ] Media Library not built yet (table exists; no admin UI)
- [ ] Checkout / Commerce not implemented (no orders/payments/coupons)
- [ ] Student Dashboard not implemented (`/dashboard` is a placeholder page)
- [ ] Instructor Panel not implemented (`/instructor` has a route guard,
      no pages)
- [ ] Certificates not implemented
- [ ] Most Admin Panel pages are still "Coming Soon" placeholders (Homepage
      Sections is the one real editor)
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
  the Student Dashboard, Course Player, enrollment screens, and a
  Curriculum Editor admin UI are still ahead
- **Commerce** — Orders, Checkout, Coupons, Payments
- **Instructor Experience** — the Instructor Panel and course authoring
- **Remaining Admin Modules** — Media Library, Instructor Management,
  Reviews, Navigation, Landing Pages, SEO, Site Settings
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
