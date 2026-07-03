# Bosla — Database Overview

> Status: mostly still planning — **except §1's `profiles` table** (Step
> 5.4: `src/db/schema/profiles.ts`, migrated in
> `drizzle/0000_military_tyrannus.sql` and
> `drizzle/0001_profiles_auto_create_trigger.sql`) **and §2's `specialties`,
> `categories`, `instructors`, `courses`, and `course_audit_logs` tables,
> all real** (Phase 3 Step 3.1 "Course Domain" — `src/db/schema/course.ts`,
> migrated in `drizzle/0006_bitter_guardian.sql`; extended in Step 3.3
> "Course Editor" with the Course Editor's own fields plus
> `course_audit_logs`, migrated in `drizzle/0007_natural_madripoor.sql` —
> see [`roadmap.md`](./roadmap.md) Phase 3) **and §1's `instructor_profiles`/
> `instructor_profile_audit_logs`, also real** (Phase 6 Step 6.1 —
> `src/db/schema/instructor.ts`, migrated in
> `drizzle/0011_instructor_profiles.sql`). `student_profiles`, `modules`,
> `lessons`, and everything in §3–§4 (commerce, engagement) are still
> conceptual — no table exists yet. Field lists for anything still
> "planned" below are illustrative, not final column specs — the point is
> to agree on entities and relationships before writing Drizzle schema,
> per [`roadmap.md`](./roadmap.md).

Conventions used below:

- Every entity has an implicit `id`, `created_at`, `updated_at` — omitted from
  each list for brevity.
- "Translatable" means the field follows the bilingual content strategy in
  [`architecture.md`](./architecture.md) (JSONB per-field, `{"en": ..., "ar": ...}`).
- `→` denotes a foreign key / relationship, read as "belongs to" or "references."

## 1. Identity & access

### `profiles` — **real, implemented (Step 5.4)**
Purpose: one row per authenticated identity, regardless of role — application-owned
business data, deliberately separate from Supabase Auth's own `auth.users`
(email/password/identity, owned by Supabase; referenced here only via the
`user_id` foreign key). See
[`authentication-architecture.md`](./authentication-architecture.md) §14 for
the full lifecycle, repository/service responsibilities, and completeness
scoring.
- `id` (uuid, PK) — surrogate key, distinct from `user_id`
- `user_id` → `auth.users.id`, unique, `ON DELETE CASCADE`
- `email` (unique, denormalized from `auth.users` at creation time)
- `full_name`, `display_name`, `avatar_url`
- `profession` (→ `src/mock/professions.mock.ts` id), `country` (→
  `src/mock/countries.mock.ts` id), `language` (`en | ar`)
- `bio`, `website`, `linkedin`, `years_of_experience` (check: `>= 0`)
- `specialties` (text array)
- `role`: `student | instructor | admin | super_admin` (Postgres enum,
  mirrors `auth/types/role.ts`'s `ROLES` — see roles doc)
- `status`: `pending | active | suspended | archived | deleted` (Postgres
  enum, mirrors `auth/types/profile-status.ts`)
- `is_public` (boolean — future public-page eligibility, gated further by
  profile completeness; see authentication-architecture.md)
- `last_login_at`, `deleted_at` (soft delete — the row is never removed)
- Indexes: unique on `user_id`, unique on `email`, plus `role`/`status`/
  `country`/`profession`/`display_name`

Created automatically — never manually — by the `handle_new_user()` trigger
on `auth.users` (`drizzle/0001_profiles_auto_create_trigger.sql`) **and**
defensively by `ProfileService.bootstrapProfile` right after
`AuthService.signUp`; both paths are idempotent
(`ON CONFLICT (user_id) DO NOTHING`/`DO UPDATE ... COALESCE`), so neither can
ever produce a duplicate regardless of which runs first.

### `instructor_profiles` — **real, implemented (Phase 6, Step 6.1)**
Purpose: a student's application to become an Instructor, and (once
approved) the record of that approval. **Not** the same table as §2's
real `instructors` (Course Domain, Phase 3) — that table is course
attribution/content (who teaches a course, for display), with no auth or
approval logic; this one is the real signed-in user who applied and was
approved to author courses. `instructors.profile_id` remains a nullable,
unused bridge between the two — Step 6.1 deliberately doesn't wire it;
a later step (Course Builder) sets it when attributing an authored
course to its approved instructor.
- `user_id` → `auth.users.id` (unique — one application per user), not
  `profiles.id` — matching `enrollments.student_id`'s established
  precedent of FK-ing the JWT/session identity directly, so
  authorization checks need no extra `profiles` lookup
- `headline` (translatable), `credentials` (plain text, e.g. "DPT, RD")
- `status`: `pending | approved | rejected` (Postgres enum) — a single
  state machine, not a separate `is_approved` boolean, matching
  `courses.course_status`'s own precedent; a rejected application is a
  distinct terminal state from "still pending"
- `approved_at`, `approved_by_user_id` → `auth.users.id`
- No `payout_details` column yet — nothing in Step 6.1 reads or writes
  it; added whichever later step (Earnings) actually needs it, per this
  codebase's established preference against speculative unused columns

### `instructor_profile_audit_logs` — **real, implemented (Phase 6, Step 6.1)**
Purpose: write-only audit trail for the application lifecycle —
`application_submitted | application_approved | application_rejected`.
One bounded-audit-table per sub-domain, mirroring `course_audit_logs`/
`order_audit_logs`/`coupon_audit_logs` exactly.
- `action` (text, not a Postgres enum — new actions never need a migration)
- `instructor_profile_id` → `instructor_profiles`, `ON DELETE CASCADE`
- `actor_id` → `auth.users.id`, nullable, `ON DELETE SET NULL`
- `metadata` (jsonb)

### `student_profiles` — planned
Purpose: extends a `profile` with learner-only data. One-to-one with `profiles` where `role = student`. Most of what this table would have held
(`profession`, `country`) already lives directly on `profiles` (Step 5.4) —
this stays reserved for genuinely student-only data that doesn't belong on
every profile (e.g. enrollment-derived stats), decided when that data
actually exists.
- `profile_id` → `profiles`

## 2. Catalog

> `specialties`, `categories`, `instructors`, and `courses` below are
> **real, implemented** (Phase 3 Step 3.1 "Course Domain" —
> `src/db/schema/course.ts`, migrated in `drizzle/0006_bitter_guardian.sql`).
> Backend/domain layer only: no Admin UI, no public pages, no seeded data —
> see [`roadmap.md`](./roadmap.md) Phase 3 for what's still ahead
> (Course Catalog pages, admin course management, Modules/Lessons).
> `modules`/`lessons` below remain planned.

### `specialties` — **real, implemented (Step 3.1)**
Purpose: the clinical discipline a course belongs to (Physiotherapy, Nutrition,
future: Sports Medicine, Nursing, ...). This is the entity that makes specialty
expansion a data change, not a code change. Every course belongs to exactly
one.
- `slug` (unique), `name` (translatable), `description` (translatable, nullable), `icon`
- `is_active`, `display_order`

### `categories` — **real, implemented (Step 3.1)**
Purpose: a finer-grained classification within (optionally) a specialty —
e.g. "Manual Therapy" under Physiotherapy — for catalog browsing/filtering
beyond specialty-level grouping. Optional secondary classification on a
course (unlike specialty, which is required).
- `slug` (unique), `name` (translatable), `description` (translatable, nullable), `icon`
- `specialty_id` → `specialties`, nullable, `ON DELETE SET NULL` (a category
  isn't required to belong to one specialty — a cross-cutting tag is valid)
- `is_active`, `display_order`

### `instructors` — **real, implemented (Step 3.1)**
Purpose: who teaches a course — content/attribution data (name, bio,
credentials), **not** a platform user account; see §1's `instructor_profiles`
entry above for how the two relate and deliberately don't overlap yet. Also
deliberately separate from the still-mock-backed `src/mock/instructors
.mock.ts` (`InstructorSlide`) that powers the live homepage Hero section
today — this table isn't wired to any page yet.
- `slug` (unique), `name` (translatable), `title`/`qualification`/`bio` (translatable, nullable)
- `specialty_id` → `specialties`, nullable, `ON DELETE SET NULL`
- `experience_years` (nullable, check: `>= 0`)
- `avatar_image_id` → `cms_media_assets`, nullable, `ON DELETE SET NULL`
- `profile_id` → `profiles`, nullable + unique, `ON DELETE SET NULL` — the
  bridge to a real account, **wired as of Phase 6, Step 6.3**:
  `CourseService`'s `createOwn`/`resolveOrCreateOwnInstructor` creates
  this row (name copied from the profile's own display name, both
  locales — no bilingual instructor-bio UI exists yet, see §1's
  `instructor_profiles`) the first time an approved Instructor creates a
  course, then reuses it for every course after
- `is_featured`, `is_active`, `display_order`

### `courses` — **real, implemented (Step 3.1; extended Step 3.3)**
Purpose: the sellable unit. `student_count`/`rating`/`lesson_count` are
deliberately not columns here — those are aggregates that only mean
something once enrollments/reviews/modules/lessons are real (later
phases); a manually-set placeholder number would just be fake data.
- `slug` (unique), `title` (translatable), `subtitle` (translatable,
  nullable), `description` (translatable), `short_description`
  (translatable, nullable)
- `specialty_id` → `specialties`, `ON DELETE RESTRICT` (never silently
  delete real courses)
- `category_id` → `categories`, nullable, `ON DELETE SET NULL`
- `instructor_id` → `instructors` (not `instructor_profiles` — see above),
  `ON DELETE RESTRICT`
- `level`: `beginner | intermediate | advanced`
- `price`, `original_price` (nullable, for discount display; check:
  `original_price IS NULL OR original_price >= price`), `currency`
  (default `USD`), `is_free` (boolean)
- `estimated_duration_minutes` (nullable — unknown until Modules/Lessons
  can compute a real total), `certificate_available` (boolean)
- `featured` (boolean — homepage "Featured Courses" candidacy; distinct
  from `status`, which is the editorial workflow state; no separate
  `is_published` column exists, `status = "published"` already means that)
- `requirements`, `learning_objectives`, `target_audience` (each a JSON
  array of translatable strings — the Course Editor's Content section)
- `cover_image_id`, `thumbnail_id`, `trailer_video_id` → `cms_media_assets`,
  all nullable, `ON DELETE SET NULL` (still typed-in raw IDs in the
  Course Editor's own form — the Media Library and its reusable
  `MediaPicker` component are real as of Phase 7, Step 7.1, but wiring
  `MediaPicker` into this specific form is an explicit follow-up, not
  done yet)
- `seo_meta_id` → `cms_seo_meta`, nullable, `ON DELETE SET NULL` — reuses
  the same table the Homepage Editor's SEO section writes to (that
  table was already designed to be reusable beyond `cms_pages`); a new
  course gets an empty one automatically on creation
- `status`: `draft | in_review | published | archived` — the transition
  rules (who can move a course between these) are **real, implemented
  (Phase 6, Step 6.2)**: `CourseService.submitForReview` (`draft ->
  in_review`, the course's own instructor or an Admin/Super Admin),
  `.approve` (`in_review -> published`, Admin/Super Admin only),
  `.reject` (`in_review -> draft`, Admin/Super Admin only), plus the
  pre-existing `.archive`/`.restore` (unrestricted from/to any status,
  predates the state machine). `CourseService.update` no longer accepts
  `status` at all — every transition now goes through one of these five
  methods, each enforcing its own valid starting state and its own
  authorization; see [`roles-and-permissions.md`](./roles-and-permissions.md)
  §2
- `language`: `en | ar | both` (whether the course itself is delivered in one
  language or bilingual audio/subtitles — distinct from UI translation)

### `course_audit_logs` — **real, implemented (Step 3.3; extended Step 6.2)**
Purpose: write-only audit trail for course create/update/archive/restore/
delete/submitted_for_review/approved/rejected — mirrors `cms_audit_logs`'s
exact shape/rationale but scoped to `courses` (kept as its own table
rather than reusing `cms_audit_logs` directly, since that table's
`page_id` is a required FK into `cms_pages`, which a course is not). No
viewer UI yet, same scope as `cms_audit_logs`.
- `action` (text), `course_id` → `courses`, `ON DELETE CASCADE`
- `actor_id` → `auth.users`, nullable, `ON DELETE SET NULL`
- `metadata` (jsonb)

### `modules`
Purpose: organizes a course's lessons into named groups.
- `course_id` → `courses`
- `title` (translatable), `position` (integer, ordered within course)

### `lessons`
Purpose: the atomic content unit.
- `module_id` → `modules`
- `title` (translatable), `position` (ordered within module)
- `type`: `video | reading | quiz`
- `video_asset_id` → `cms_media_assets` (nullable, when `type = video`)
- `body` (translatable, nullable, when `type = reading`)
- `duration_seconds` (nullable, for video)
- `is_preview`: boolean — free-to-watch before purchase (marketing/conversion tool)

### `quizzes`
Purpose: the quiz configuration for a `lesson` where `type = quiz`. One-to-one with that lesson.
- `lesson_id` → `lessons`
- `pass_threshold_percent`

### `quiz_questions`
Purpose: one question belonging to a quiz.
- `quiz_id` → `quizzes`
- `prompt` (translatable), `position`
- `choices` (translatable JSON array), `correct_choice_index`

### `quiz_attempts`
Purpose: one student's attempt at a quiz.
- `quiz_id` → `quizzes`, `student_id` → `profiles`
- `score_percent`, `passed` (boolean), `submitted_at`

### `resources`
Purpose: a downloadable attachment on a lesson.
- `lesson_id` → `lessons`
- `title` (translatable), `file_asset_id` → `cms_media_assets`

### `certificates`
Purpose: proof of course completion. **Planned, not yet issued** (current
marketing copy: "launching soon").
- `student_id` → `profiles`, `course_id` → `courses`
- `issued_at`, `verification_code` (public, used for the "verify this certificate"
  link mentioned in the FAQ copy)

### `lesson_progress`
Purpose: tracks whether a student has completed a specific lesson — the
building block both the student dashboard's "% complete" and certificate
issuance are computed from.
- `student_id` → `profiles`, `lesson_id` → `lessons`
- `completed_at` (nullable = not yet completed)

## 3. Commerce

### `orders`
Purpose: one commercial transaction.
- `student_id` → `profiles`
- `status`: `pending | paid | failed | refunded`
- `subtotal`, `discount_total`, `total`, `currency`
- `payment_provider`: `stripe | paymob | fawry`
- `provider_reference` (the provider's own transaction/session id)
- `coupon_id` → `coupons` (nullable)

### `order_items`
Purpose: line items of an order — normally one per course, modeled as a table
from day one so multi-course carts aren't a later migration.
- `order_id` → `orders`, `course_id` → `courses`
- `unit_price` (price *at time of purchase*, never recalculated from the live
  course price)

### `payments`
Purpose: a record of a provider payment event, kept separate from `orders`
because one order can have more than one payment attempt (failed retry, etc.).
- `order_id` → `orders`
- `provider`, `provider_payment_id`, `status`, `amount`, `raw_payload` (JSON, for
  audit/debugging of provider webhooks)

### `enrollments`
Purpose: the actual access grant — a student can be enrolled in a course via a
paid order, a coupon making it free, or a manual Admin/Instructor grant.
- `student_id` → `profiles`, `course_id` → `courses`
- `source`: `purchase | manual_grant | coupon_100_percent`
- `order_id` → `orders` (nullable, when source is not a purchase)

### `coupons`
Purpose: a discount code.
- `code`, `discount_type`: `percentage | fixed_amount`, `discount_value`
- `scope`: `course | specialty | sitewide`, `scope_id` (nullable, matches scope)
- `max_redemptions`, `redeemed_count`, `expires_at`
- `created_by` → `profiles` (an Instructor can create coupons scoped to their own
  courses; only Admin can create sitewide coupons — see roles doc)

### `refunds`
Purpose: a refund against a payment, kept distinct from "order status = refunded"
so partial refunds and refund reasons have a home.
- `payment_id` → `payments`
- `amount`, `reason`, `processed_by` → `profiles`

## 4. Engagement

### `reviews`
Purpose: a student's rating + comment on a course they're enrolled in.
- `student_id` → `profiles`, `course_id` → `courses`
- `rating` (1–5), `comment` (nullable)
- `status`: `visible | flagged | hidden` (Admin moderation)

### `wishlists`
Purpose: a student "saving" a course for later without purchasing.
- `student_id` → `profiles`, `course_id` → `courses`

### `notifications`
Purpose: a single message delivered to a user (in-app, and later email/push).
- `user_id` → `profiles`
- `type`: `order_confirmed | course_updated | new_review | instructor_approved | ...`
- `payload` (JSON, shape depends on `type`), `read_at` (nullable)

## 5. CMS & content

> `cms_pages`, `cms_sections`, `cms_navigation_items`, `cms_media_assets`,
> `cms_seo_meta`, and `cms_site_settings` below are **real, implemented**
> (Step 6.1): `src/db/schema/cms.ts`, migrated in
> `drizzle/0002_easy_the_hood.sql`. `cms_page_versions` and
> `cms_pages.published_at` were added in Step 6.5 (draft/publish/versioning
> — `drizzle/0004_chilly_redwing.sql`). `cms_audit_logs` was added in Step
> 6.6 (audit trail/concurrency hardening — `drizzle/0005_real_firebrand.sql`).
> See [`cms-overview.md`](./cms-overview.md) for the full content-shape
> discussion, §13 there for the homepage editor, §15 for the draft/
> publish/versioning model, and §16 for the audit/concurrency hardening.
> `articles` is still conceptual — no table exists.

### `articles` — planned
Purpose: long-form editorial content for SEO/thought-leadership, independent of
paid courses.
- `slug`, `title` (translatable), `body` (translatable), `cover_image_id` → `cms_media_assets`
- `author_id` → `profiles`, `status`: `draft | published`
- `seo_meta_id` → `cms_seo_meta`

### `cms_pages` — **real, implemented (Step 6.1)**
Purpose: any manageable page — the homepage (`slug: "home"`) and future
landing pages are the same table/shape, no separate `landing_pages` table
(see [`cms-overview.md`](./cms-overview.md) §11). Together with
`cms_sections`/`cms_seo_meta`, this is the **draft** (see `cms_page_versions`
below for the published copy visitors actually see).
- `id` (uuid, PK), `slug` (unique), `title` (plain text, internal admin label)
- `seo_meta_id` → `cms_seo_meta`, nullable, `ON DELETE SET NULL`
- `published_at` (timestamptz, nullable — Step 6.5): denormalized copy of
  this page's latest `cms_page_versions.published_at`, for a cheap "has this
  ever been published" check without a join; `null` means draft-only, never
  published.

### `cms_sections` — **real, implemented (Step 6.1)**
Purpose: the CMS-managed, orderable, toggleable blocks that make up a page.
- `page_id` → `cms_pages`, `ON DELETE CASCADE`
- `section_type` (Postgres enum: `hero | featured_instructors |
  featured_courses | categories | testimonials | faq | statistics | cta`)
- `is_enabled`, `position`
- `content` (jsonb, shape depends on `section_type` — validated against the
  Zod schema registered for it in
  `src/cms/validators/section-content.schemas.ts`, not enforced by the
  database itself)

### `cms_page_versions` — **real, implemented (Step 6.5)**
Purpose: immutable, append-only published snapshots of a page — what the
public site actually renders (see [`cms-overview.md`](./cms-overview.md)
§15). `cms_pages`/`cms_sections`/`cms_seo_meta` are the draft; a row here is
written once, by `CmsPageVersionService.publish`, and never updated —
"the current published version" is always the highest `version` for a
`page_id`.
- `page_id` → `cms_pages`, `ON DELETE CASCADE`
- `version` (int), unique per `page_id`
- `snapshot` (jsonb — the full page: title/slug, every section, and SEO, in
  the same raw/bilingual shape `cms_sections`/`cms_seo_meta` store)
- `created_at`/`created_by` → `auth.users`, nullable (`ON DELETE SET NULL`,
  so the audit trail survives the account being deleted later)
- `published_at`/`published_by` → `auth.users`, same nullability

`created_at`/`created_by` and `published_at`/`published_by` are separate
columns even though `publish` sets all four to the same instant today —
this step doesn't build scheduled/staged publishing, but the shape doesn't
need a migration if that arrives later.

### `cms_audit_logs` — **real, implemented (Step 6.6)**
Purpose: append-only audit trail for homepage CMS actions (see
[`cms-overview.md`](./cms-overview.md) §16) — save draft, publish, revert,
enable/disable section, reorder sections. Write-only from the application's
side today; no read/query method exists yet (no Audit Log UI is explicit
Step 6.6 scope — see the `audit_logs` entry below for how this relates to
a future cross-domain viewer).
- `action` (text — `save_draft | publish | revert | toggle_section |
  reorder_sections`)
- `page_id` → `cms_pages`, `ON DELETE CASCADE`
- `section_id` → `cms_sections`, nullable (`ON DELETE SET NULL`) — null for
  page-level actions (publish, revert, reorder)
- `actor_id` → `auth.users`, nullable (`ON DELETE SET NULL`)
- `created_at`, `metadata` (jsonb — action-specific extra context, e.g.
  `{version}` for publish, `{orderedSectionIds}` for reorder)

### `cms_media_assets` — **real, implemented (Step 6.1; extended Phase 7, Step 7.1)**
Purpose: one uploaded file, reusable across every feature that needs an
image/video/document — CMS sections/SEO, course cover/thumbnail/trailer,
instructor avatars, lesson video, quiz attachments. Stored in a real
public Supabase Storage bucket (`media`); this table is the metadata/
reference layer. A real uploader/browser exists at `/admin/media` (Step
7.1) — `url`/`alt`/`width`/`height`/`placeholder` were the only columns
until then (storage/metadata layer only, no uploader UI).
- `url`, `storage_path` (the Storage object key — tracked separately
  from `url` since delete/replace need the raw path, not a URL to parse)
- `file_type`: Postgres enum `image | video | pdf | other`, derived from
  the upload's MIME type, not user-chosen
- `mime_type`, `file_size` (bytes)
- `alt`, `title`, `caption`, `description` (all translatable, all
  nullable — meaningful mainly for an image, meaningless for a PDF)
- `tags` (JSON array of strings), `folder` (a single flat label, not a
  folder tree)
- `width`, `height` (nullable — an image/video only), `placeholder`
  (nullable solid-color fallback)
- `uploaded_by_user_id` → `auth.users`, nullable, `ON DELETE SET NULL`

### `cms_media_audit_logs` — **real, implemented (Phase 7, Step 7.1)**
Purpose: write-only audit trail for Media Library create/update/rename/
delete — its own table, not `cms_audit_logs` (that one's `page_id` is
`NOT NULL`, and a media asset isn't a page).
- `action` (text, not an enum — a new action never needs a migration)
- `media_asset_id` → `cms_media_assets`, `ON DELETE CASCADE` — deleting
  an asset (the last thing ever logged about it) removes its own trail
  with it
- `actor_id` → `auth.users`, nullable, `ON DELETE SET NULL`
- `created_at`, `metadata` (jsonb)

### `cms_seo_meta` — **real, implemented (Step 6.1)**
Purpose: reusable SEO fields attachable to any content type that needs its own
`<title>`/description/canonical rather than the sitewide default.
- `title` (translatable, nullable), `description` (translatable, nullable)
- `og_image_id` → `cms_media_assets`, nullable, `ON DELETE SET NULL`
- `canonical_path`, nullable

### `cms_navigation_items` — **real, implemented (Step 6.1)**
Purpose: editable nav structure (header links, footer columns) so adding/
reordering a nav item doesn't require a code deploy.
- `location`: Postgres enum `header | footer_product | footer_company |
  footer_resources`
- `label` (translatable), `href`, `icon` (nullable, icon key), `position`,
  `is_enabled`

### `cms_site_settings` — **real, implemented (Step 6.1)**
Purpose: sitewide configuration, single-row-per-key — footer content
(tagline, social links, newsletter copy), sitewide SEO defaults, and future
settings (default currency, active payment providers, support email), all
without a schema migration per new setting. `src/cms/types/site-settings.ts`
types the known keys (`footer`, `seoDefaults`) for type-safe access.
- `key` (PK, text — e.g. `footer`, `seoDefaults`)
- `value` (jsonb)

## 6. System

### `audit_logs` — planned
Purpose: who changed what, for anything an Admin/Instructor edits outside
the homepage CMS (course status changes, coupon creation, etc.).
Append-only. `cms_audit_logs` (§5 above, Step 6.6) is the CMS-specific
implementation of this same pattern, built first because the Homepage
editor needed it now — a real cross-domain `audit_logs` table for
courses/coupons/etc. can follow the same shape later; the two aren't
merged into one table since a CMS action's natural keys (`page_id`,
`section_id`) don't generalize cleanly to every future domain's own
entities.
- `actor_id` → `profiles`, `action`, `entity_type`, `entity_id`, `diff` (JSON)

### `webhook_events`
Purpose: raw, immutable log of every inbound payment-provider webhook, kept
independent of `payments` so a signature-verification bug or replay is
debuggable from the original payload.
- `provider`, `event_type`, `raw_payload` (JSON), `processed_at` (nullable)

## 7. Entity relationship summary

```
auth.users ── instructor_profiles (real, 1:1 via user_id — Step 6.1)
profiles ── student_profiles (planned, 1:1 where role=student)
profiles ── instructors.profile_id (nullable, wired as of Step 6.3 — see §1/§2)

specialties ──< categories (nullable specialty_id)
specialties ──< instructors (nullable specialty_id)
specialties ──< courses (required)
categories ──< courses (nullable)
instructors ──< courses (required)

courses ──< modules (planned) ──< lessons (planned) ──< resources (planned)
                  └─ quizzes (planned) ──< quiz_questions (planned)
courses ──< reviews, wishlists, enrollments (all planned)

orders ──< order_items >── courses
orders ──< payments ──< refunds
orders ── coupons

cms_pages ──< cms_sections
cms_pages ── cms_seo_meta ── cms_media_assets (og_image)
cms_pages ──< cms_page_versions (published snapshots)
cms_pages ──< cms_audit_logs >── cms_sections (nullable)
courses ── cms_media_assets (cover_image)
instructors ── cms_media_assets (avatar_image)
articles ── cms_media_assets, cms_seo_meta
```

## 8. Related documents

- [`architecture.md`](./architecture.md) — the bilingual-content and payment
  patterns these tables implement.
- [`cms-overview.md`](./cms-overview.md) — how `cms_pages`, `cms_sections`,
  `cms_navigation_items`, `cms_media_assets`, and `articles` are edited.
- [`roles-and-permissions.md`](./roles-and-permissions.md) — who can create/edit/
  delete each entity.
