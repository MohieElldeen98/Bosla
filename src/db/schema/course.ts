import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { authUsers } from "./auth-users";
import { cmsMediaAssets, cmsSeoMeta } from "./cms";
import { profiles } from "./profiles";

/**
 * The Course Domain (Phase 3, Step 3.1 — docs/roadmap.md) — the catalog
 * this platform is actually selling, distinct from the CMS's marketing
 * content (`db/schema/cms.ts`) and from `profiles`' identity/auth data.
 * Backend/domain layer only: no admin UI, no public pages, no Module/Lesson
 * tables yet (those are a later step). Every FK here uses `onDelete:
 * "restrict"`/`"set null"`, never `"cascade"`, on purpose — deleting a
 * specialty/category/instructor should never silently delete real course
 * rows; an admin has to explicitly reassign or delete courses first.
 *
 * No Drizzle `relations()` helper is declared here — the existing codebase
 * (CMS, Auth) doesn't use that API anywhere; every read that needs a join
 * does parallel queries + manual composition at the Service layer instead
 * (see `CmsPageService.getResolvedBySlug` for the established pattern).
 * "Relations" for this schema means the FK `.references()` below.
 */

/** Mirrors `courses/types/course-level.ts`'s `COURSE_LEVELS` tuple exactly. */
export const courseLevelEnum = pgEnum("course_level", ["beginner", "intermediate", "advanced"]);

/**
 * Mirrors `courses/types/course-status.ts`'s `COURSE_STATUSES` tuple
 * exactly. The state machine itself (who can transition a course between
 * these, e.g. Instructor submits for review / Admin approves) is Phase 6
 * scope (docs/roadmap.md) — this step only stores the column.
 */
export const courseStatusEnum = pgEnum("course_status", [
  "draft",
  "in_review",
  "published",
  "archived",
]);

/**
 * Which language(s) the course's actual lesson content is delivered in —
 * distinct from the site's own bilingual `en`/`ar` UI (`src/i18n/`), which
 * every course's marketing copy (title/description below) still has both
 * of regardless of this value. Mirrors
 * `courses/types/course-language.ts`'s `COURSE_LANGUAGES` tuple exactly.
 */
export const courseLanguageEnum = pgEnum("course_language", ["en", "ar", "both"]);

/**
 * The top-level clinical discipline a course belongs to (Physiotherapy,
 * Nutrition, ...) — see docs/product-blueprint.md §3 "Category / Specialty"
 * and docs/database-overview.md §2. Every course belongs to exactly one.
 */
export const specialties = pgTable(
  "specialties",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    slug: text("slug").notNull(),
    name: jsonb("name").notNull(),
    description: jsonb("description"),
    icon: text("icon"),
    isActive: boolean("is_active").notNull().default(true),
    displayOrder: integer("display_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => [
    uniqueIndex("specialties_slug_key").on(table.slug),
    index("specialties_is_active_idx").on(table.isActive),
  ],
);

/**
 * A finer-grained classification within (optionally) a specialty — e.g.
 * "Manual Therapy" under Physiotherapy — used for catalog browsing/filtering
 * beyond the specialty-level grouping. Nullable `specialty_id`: a category
 * doesn't have to be scoped to one specialty (a cross-cutting tag like
 * "New Graduate" is valid too). Optional secondary classification on a
 * course, unlike specialty which is required.
 */
export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    slug: text("slug").notNull(),
    name: jsonb("name").notNull(),
    description: jsonb("description"),
    icon: text("icon"),
    specialtyId: uuid("specialty_id").references(() => specialties.id, { onDelete: "set null" }),
    isActive: boolean("is_active").notNull().default(true),
    displayOrder: integer("display_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => [
    uniqueIndex("categories_slug_key").on(table.slug),
    index("categories_specialty_id_idx").on(table.specialtyId),
    index("categories_is_active_idx").on(table.isActive),
  ],
);

/**
 * Write-only audit trail for category create/update/delete, mirroring
 * `course_audit_logs`'s exact shape/rationale — its own table, not a
 * shared cross-domain one, per the established convention.
 */
export const categoryAuditLogs = pgTable(
  "category_audit_logs",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    action: text("action").notNull(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id").references(() => authUsers.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    metadata: jsonb("metadata").notNull().default({}),
  },
  (table) => [
    index("category_audit_logs_category_id_idx").on(table.categoryId, table.createdAt),
    index("category_audit_logs_actor_id_idx").on(table.actorId, table.createdAt),
    index("category_audit_logs_created_at_idx").on(table.createdAt),
  ],
);

/**
 * Who teaches a course — content/attribution data (name, bio, credentials),
 * NOT a platform user account. Deliberately separate from the
 * still-planned `instructor_profiles` (docs/database-overview.md §1), which
 * is the Phase 6 concept of a real signed-in user who applied and was
 * approved to author courses (`is_approved`, `payout_details`, etc.) — that
 * workflow doesn't exist yet, so this table has no auth/approval logic of
 * its own. `profile_id` is a nullable, forward-compatible bridge: if/when
 * Phase 6 links an instructor row to a real account, it can be set without
 * a schema change; nothing in this step sets or reads it.
 *
 * Also deliberately separate from `src/mock/instructors.mock.ts` /
 * `src/types/instructor.ts` (`InstructorSlide`), which still power the
 * live homepage Hero section's instructor slides — this step does not
 * touch or repoint that (no public pages in scope). The two will likely
 * converge in a future step.
 */
export const instructors = pgTable(
  "instructors",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    slug: text("slug").notNull(),
    name: jsonb("name").notNull(),
    title: jsonb("title"),
    qualification: jsonb("qualification"),
    bio: jsonb("bio"),
    specialtyId: uuid("specialty_id").references(() => specialties.id, { onDelete: "set null" }),
    experienceYears: integer("experience_years"),
    avatarImageId: uuid("avatar_image_id").references(() => cmsMediaAssets.id, {
      onDelete: "set null",
    }),
    /** Admin-managed marketing image for public surfaces (homepage Hero,
     *  course cards, instructors page) — deliberately separate from
     *  `avatarImageId`, which the instructor can self-edit. Never exposed
     *  through `updateOwnInstructorSchema`. */
    publicPortraitImageId: uuid("public_portrait_image_id").references(() => cmsMediaAssets.id, {
      onDelete: "set null",
    }),
    profileId: uuid("profile_id").references(() => profiles.id, { onDelete: "set null" }),
    isFeatured: boolean("is_featured").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    displayOrder: integer("display_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => [
    uniqueIndex("instructors_slug_key").on(table.slug),
    uniqueIndex("instructors_profile_id_key").on(table.profileId),
    index("instructors_specialty_id_idx").on(table.specialtyId),
    index("instructors_is_featured_idx").on(table.isFeatured),
    check(
      "instructors_experience_years_check",
      sql`${table.experienceYears} IS NULL OR ${table.experienceYears} >= 0`,
    ),
  ],
);

/**
 * The catalog itself. `student_count`/`rating`/`lesson_count`/
 * `duration_minutes` are deliberately NOT columns here — those are
 * aggregates that only mean something once enrollments/reviews/modules/
 * lessons are real (later phases); a manually-set placeholder number would
 * just be fake data shown to visitors. Module/Lesson tables (and therefore
 * a real lesson count/duration) are explicitly out of scope for this step.
 */
export const courses = pgTable(
  "courses",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    slug: text("slug").notNull(),
    title: jsonb("title").notNull(),
    subtitle: jsonb("subtitle"),
    description: jsonb("description").notNull(),
    shortDescription: jsonb("short_description"),
    specialtyId: uuid("specialty_id")
      .notNull()
      .references(() => specialties.id, { onDelete: "restrict" }),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    instructorId: uuid("instructor_id")
      .notNull()
      .references(() => instructors.id, { onDelete: "restrict" }),
    level: courseLevelEnum("level").notNull().default("beginner"),
    status: courseStatusEnum("status").notNull().default("draft"),
    language: courseLanguageEnum("language").notNull().default("en"),
    price: numeric("price", { precision: 10, scale: 2 }).notNull().default("0"),
    originalPrice: numeric("original_price", { precision: 10, scale: 2 }),
    currency: text("currency").notNull().default("USD"),
    isFree: boolean("is_free").notNull().default(false),
    /** When the current `price` (vs `original_price`) stops being a live
     *  promotion. The public purchase card's deal countdown renders only
     *  while `now() < sale_ends_at`; NULL means no time-limited deal —
     *  a discount without a deadline shows the struck price but never a
     *  timer, so urgency can't exist without a real end (the countdown is
     *  display-only; expiry hides the timer, it does not reprice). */
    saleEndsAt: timestamp("sale_ends_at", { withTimezone: true }),
    /** Minutes. Nullable — unknown/not-yet-estimated until Modules/Lessons
     *  (a later phase) can compute a real total from lesson durations. */
    estimatedDurationMinutes: integer("estimated_duration_minutes"),
    certificateAvailable: boolean("certificate_available").notNull().default(false),
    /** Homepage "Featured Courses" candidacy — distinct from `status`,
     *  which is the editorial workflow state. No separate `isPublished`
     *  boolean exists: `status = "published"` already means exactly that,
     *  and the Course Editor (Step 3.3) deliberately doesn't add a second,
     *  redundant flag that could drift out of sync with it. */
    featured: boolean("featured").notNull().default(false),
    /** Bulleted marketing copy — arrays of `LocalizedText`, not a single
     *  translatable blob, so the public course page (later phase) can
     *  render each as its own list item. */
    requirements: jsonb("requirements").notNull().default([]),
    learningObjectives: jsonb("learning_objectives").notNull().default([]),
    targetAudience: jsonb("target_audience").notNull().default([]),
    coverImageId: uuid("cover_image_id").references(() => cmsMediaAssets.id, {
      onDelete: "set null",
    }),
    thumbnailId: uuid("thumbnail_id").references(() => cmsMediaAssets.id, { onDelete: "set null" }),
    trailerVideoId: uuid("trailer_video_id").references(() => cmsMediaAssets.id, {
      onDelete: "set null",
    }),
    /** Nullable, unlike `cms_pages.seo_meta_id`: a course can exist (and be
     *  edited) before its SEO record is created — `CourseService.create`
     *  creates one automatically, but this stays nullable defensively (see
     *  `CourseService.attachSeoMeta`) rather than assuming that always
     *  succeeds. Reuses `cms_seo_meta` as-is — that table's own doc comment
     *  already anticipates "later courses/articles/landing pages". */
    seoMetaId: uuid("seo_meta_id").references(() => cmsSeoMeta.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => [
    uniqueIndex("courses_slug_key").on(table.slug),
    index("courses_specialty_id_idx").on(table.specialtyId),
    index("courses_category_id_idx").on(table.categoryId),
    index("courses_instructor_id_idx").on(table.instructorId),
    index("courses_status_idx").on(table.status),
    check("courses_price_check", sql`${table.price} >= 0`),
    check(
      "courses_original_price_check",
      sql`${table.originalPrice} IS NULL OR ${table.originalPrice} >= ${table.price}`,
    ),
    check(
      "courses_estimated_duration_minutes_check",
      sql`${table.estimatedDurationMinutes} IS NULL OR ${table.estimatedDurationMinutes} >= 0`,
    ),
  ],
);

/**
 * Write-only audit trail for course mutations (Step 3.3), mirroring
 * `cms_audit_logs`'s exact shape/rationale (docs/cms-overview.md §16) but
 * scoped to `courses` — kept as its own table rather than reusing
 * `cms_audit_logs` directly since that table's `page_id` is a required FK
 * into `cms_pages`, which a course is not; matches this domain's existing
 * "own copy, not a shared cross-domain table" convention (see
 * `courses/utils/safe-operation.ts`).
 */
export const courseAuditLogs = pgTable(
  "course_audit_logs",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    action: text("action").notNull(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id").references(() => authUsers.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    metadata: jsonb("metadata").notNull().default({}),
  },
  (table) => [
    index("course_audit_logs_course_id_idx").on(table.courseId, table.createdAt),
    index("course_audit_logs_actor_id_idx").on(table.actorId, table.createdAt),
    index("course_audit_logs_created_at_idx").on(table.createdAt),
  ],
);
