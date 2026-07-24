import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { authUsers } from "./auth-users";
import { cmsMediaAssets } from "./cms";
import { courses } from "./course";

/**
 * The Student Learning Domain (Phase 4, Step 4.1 — docs/roadmap.md) —
 * how a course's curriculum is structured (Modules, Lessons, Quizzes,
 * Quiz Questions) and what a student has actually done with it
 * (Enrollments, Lesson Progress, Quiz Attempts). Backend/domain layer
 * only: no Student Dashboard, Course Player, enrollment screens, or
 * payments — see roadmap.md Phase 4/5.
 *
 * Two different cascade philosophies on purpose, matching each table's
 * real-world meaning:
 *  - **Content** (`modules`, `lessons`, `quizzes`, `quiz_questions`) is
 *    *compositional* — a lesson has no meaning independent of its module,
 *    same relationship `cms_sections` has to `cms_pages`. These cascade
 *    from their parent, same as `cms_sections.page_id`.
 *  - **Activity** (`enrollments`, `lesson_progress`, `quiz_attempts`) is
 *    *student-owned* — it cascades from `auth.users` (deleting an account
 *    removes what it did), but `enrollments.course_id`
 *    is deliberately `RESTRICT`, not `CASCADE`: unlike a module/lesson, an
 *    enrollment is evidence a real student has access to a course, and
 *    Course Domain's own established rule (`courses.specialty_id`, etc.)
 *    is "never silently delete real activity" — an admin must handle
 *    enrolled students explicitly before a course can be hard-deleted.
 */

/** Mirrors `learning/types/lesson.ts`'s `LESSON_TYPES` tuple exactly. */
export const lessonTypeEnum = pgEnum("lesson_type", ["video", "reading", "quiz"]);

/**
 * Mirrors `learning/types/enrollment.ts`'s `ENROLLMENT_SOURCES` tuple
 * exactly. `purchase` added in Commerce (Phase 5, Step 5.1) — an
 * enrollment created when an `orders` row transitions to `paid`
 * (`OrderService.markPaid`), whether the order was actually free ($0
 * total or a 100%-off coupon) or a simulated paid checkout.
 */
export const enrollmentSourceEnum = pgEnum("enrollment_source", ["manual_grant", "purchase"]);

/**
 * Mirrors `learning/types/enrollment-status.ts`'s `ENROLLMENT_STATUSES`
 * tuple exactly. Added in Step 4.2 so "Revoke" is a soft status flip
 * (`active` → `revoked`), not a hard delete — "do not permanently delete
 * learning history" (docs/roadmap.md Phase 4 Step 4.2). `Restore` is the
 * inverse. Two states only, unlike `courses.status`'s four — an
 * enrollment doesn't have a review/workflow concept, just "does this
 * grant currently apply."
 */
export const enrollmentStatusEnum = pgEnum("enrollment_status", ["active", "revoked"]);

/** One named group of lessons within a course, ordered by `position`. */
export const modules = pgTable(
  "modules",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    title: jsonb("title").notNull(),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => [index("modules_course_position_idx").on(table.courseId, table.position)],
);

/** The atomic content unit within a module. `videoAssetId`/`body` are
 *  only meaningful for `type = "video"`/`"reading"` respectively — not
 *  enforced by a DB constraint (a Zod `.refine()` at the validator layer
 *  is the right place for a cross-field rule like that, not a CHECK that
 *  would need to special-case every future lesson type). */
export const lessons = pgTable(
  "lessons",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    moduleId: uuid("module_id")
      .notNull()
      .references(() => modules.id, { onDelete: "cascade" }),
    title: jsonb("title").notNull(),
    position: integer("position").notNull().default(0),
    type: lessonTypeEnum("type").notNull().default("video"),
    videoAssetId: uuid("video_asset_id").references(() => cmsMediaAssets.id, { onDelete: "set null" }),
    body: jsonb("body"),
    durationSeconds: integer("duration_seconds"),
    /** Free-to-watch before enrollment — a marketing/conversion tool
     *  (matches `database-overview.md`'s original plan for this column). */
    isPreview: boolean("is_preview").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => [
    index("lessons_module_position_idx").on(table.moduleId, table.position),
    check(
      "lessons_duration_seconds_check",
      sql`${table.durationSeconds} IS NULL OR ${table.durationSeconds} >= 0`,
    ),
  ],
);

/** A downloadable resource attached to a lesson (the player's Resources
 *  tab). The file itself is a Media Library asset — attachments add only
 *  lesson linkage, a display title, and ordering, so upload/storage/
 *  deletion mechanics stay in the one media pipeline. `onDelete:
 *  "cascade"` on BOTH FKs: an attachment has no meaning without its
 *  lesson, and a deliberately deleted media file must not leave a
 *  download row pointing at a 404. */
export const lessonAttachments = pgTable(
  "lesson_attachments",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    mediaAssetId: uuid("media_asset_id")
      .notNull()
      .references(() => cmsMediaAssets.id, { onDelete: "cascade" }),
    title: jsonb("title").notNull(),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => [index("lesson_attachments_lesson_position_idx").on(table.lessonId, table.position)],
);

/** A student's access grant to a course. `source` is `manual_grant` only
 *  today (an Admin granting access directly) — no self-serve enrollment
 *  or payment flow exists yet (Phase 5). `unique(studentId, courseId)`:
 *  a student is enrolled in a course at most once.
 *
 *  `studentId`/`grantedByUserId` reference `auth.users.id`, not
 *  `profiles.id` — matching `course_audit_logs.actorId`/
 *  `cms_audit_logs.actorId`'s existing "who did this" precedent, and
 *  critically, matching `AuthUser.id` (what every guard/action already
 *  carries as "who is logged in" — see `auth/types/session.ts`). This
 *  lets `canAccessStudentData` compare `actingUser.id` directly against
 *  `studentId` with no extra profile lookup; using `profiles.id` here
 *  instead would have required resolving `actingUser.id` to a
 *  `profiles.id` on every single authorization check. */
export const enrollments = pgTable(
  "enrollments",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    studentId: uuid("student_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "restrict" }),
    source: enrollmentSourceEnum("source").notNull().default("manual_grant"),
    status: enrollmentStatusEnum("status").notNull().default("active"),
    grantedByUserId: uuid("granted_by_user_id").references(() => authUsers.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => [
    uniqueIndex("enrollments_student_course_key").on(table.studentId, table.courseId),
    index("enrollments_course_id_idx").on(table.courseId),
    index("enrollments_status_idx").on(table.status),
  ],
);

/** Whether a student has completed a specific lesson — the building
 *  block a future Student Dashboard's "% complete" and certificate
 *  issuance would compute from. `completedAt: null` means not yet
 *  completed (the row can exist purely to mark "started", if a later
 *  step needs that — this step doesn't use it that way). */
export const lessonProgress = pgTable(
  "lesson_progress",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    studentId: uuid("student_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    positionSeconds: integer("position_seconds").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => [
    uniqueIndex("lesson_progress_student_lesson_key").on(table.studentId, table.lessonId),
    index("lesson_progress_student_id_idx").on(table.studentId),
  ],
);

export const videoEventTypeEnum = pgEnum("video_event_type", ["play", "pause", "complete", "progress"]);

export const videoEvents = pgTable(
  "video_events",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    lessonId: uuid("lesson_id").references(() => lessons.id, { onDelete: "set null" }),
    articleSlug: text("article_slug"),
    userId: uuid("user_id").references(() => authUsers.id, { onDelete: "set null" }),
    event: videoEventTypeEnum("event").notNull(),
    positionSeconds: integer("position_seconds").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => [
    index("video_events_lesson_created_idx").on(table.lessonId, table.createdAt),
    index("video_events_article_created_idx").on(table.articleSlug, table.createdAt),
  ],
);

/** The quiz configuration for a lesson where `type = "quiz"` — one-to-one
 *  with that lesson (`unique` on `lessonId`). */
export const quizzes = pgTable(
  "quizzes",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    passThresholdPercent: integer("pass_threshold_percent").notNull().default(70),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => [
    uniqueIndex("quizzes_lesson_id_key").on(table.lessonId),
    check(
      "quizzes_pass_threshold_percent_check",
      sql`${table.passThresholdPercent} >= 0 AND ${table.passThresholdPercent} <= 100`,
    ),
  ],
);

/** One question in a quiz. `choices` is a JSON array of `LocalizedText`
 *  (not a separate table — a question's choices have no independent
 *  existence, identity, or ordering need beyond their array index, unlike
 *  modules/lessons which need real rows for FK targets elsewhere).
 *  `correctChoiceIndex` must be a valid index into `choices`. */
export const quizQuestions = pgTable(
  "quiz_questions",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    quizId: uuid("quiz_id")
      .notNull()
      .references(() => quizzes.id, { onDelete: "cascade" }),
    prompt: jsonb("prompt").notNull(),
    position: integer("position").notNull().default(0),
    choices: jsonb("choices").notNull().default([]),
    correctChoiceIndex: integer("correct_choice_index").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => [
    index("quiz_questions_quiz_position_idx").on(table.quizId, table.position),
    check("quiz_questions_correct_choice_index_check", sql`${table.correctChoiceIndex} >= 0`),
    check(
      "quiz_questions_correct_choice_in_range_check",
      sql`${table.correctChoiceIndex} < jsonb_array_length(${table.choices})`,
    ),
  ],
);

/** One student's attempt at a quiz — multiple attempts per student are
 *  allowed (retakes), so no unique constraint on `(quizId, studentId)`. */
export const quizAttempts = pgTable(
  "quiz_attempts",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    quizId: uuid("quiz_id")
      .notNull()
      .references(() => quizzes.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    scorePercent: integer("score_percent").notNull(),
    passed: boolean("passed").notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().default(sql`now()`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => [
    index("quiz_attempts_quiz_student_idx").on(table.quizId, table.studentId),
    index("quiz_attempts_student_id_idx").on(table.studentId),
    check(
      "quiz_attempts_score_percent_check",
      sql`${table.scorePercent} >= 0 AND ${table.scorePercent} <= 100`,
    ),
  ],
);

/**
 * Write-only audit trail for the content-authoring half of this domain
 * (Module/Lesson/Quiz create/update/delete, Enrollment grants) — mirrors
 * `course_audit_logs`'s shape/rationale exactly, kept as its own table
 * (not reusing `course_audit_logs`) since `moduleId`/`lessonId` are
 * genuinely new optional secondary references `course_audit_logs` has no
 * columns for; `courseId` stays the required anchor either way, same
 * pattern `cms_audit_logs`'s `pageId` (required) + `sectionId` (optional)
 * already established. Deliberately NOT used for `lesson_progress`/
 * `quiz_attempts` — those are routine student self-service activity, not
 * an admin/moderation action, matching what every other audit table in
 * this codebase actually logs.
 */
export const learningAuditLogs = pgTable(
  "learning_audit_logs",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    action: text("action").notNull(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    moduleId: uuid("module_id").references(() => modules.id, { onDelete: "set null" }),
    lessonId: uuid("lesson_id").references(() => lessons.id, { onDelete: "set null" }),
    actorId: uuid("actor_id").references(() => authUsers.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    metadata: jsonb("metadata").notNull().default({}),
  },
  (table) => [
    index("learning_audit_logs_course_id_idx").on(table.courseId, table.createdAt),
    index("learning_audit_logs_actor_id_idx").on(table.actorId, table.createdAt),
    index("learning_audit_logs_created_at_idx").on(table.createdAt),
  ],
);
