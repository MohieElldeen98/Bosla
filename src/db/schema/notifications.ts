import { sql } from "drizzle-orm";
import { boolean, index, jsonb, pgEnum, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { authUsers } from "./auth-users";

/**
 * The Notifications domain — a cross-domain platform feature (not owned
 * by Courses/Learning/Commerce/Instructor), so it gets its own schema
 * file, matching this codebase's "one file per domain" convention (see
 * `docs/architecture.md` §7). Every action a notification can represent
 * is listed here up front, per the fixed-enum-registry convention
 * `cms_section_type`/`media_file_type` already established — a plain
 * `text` column (like `learning_audit_logs.action`) would fit "new
 * action never needs a migration," but this list is deliberately closed
 * (a real Postgres enum): unlike an audit action, a notification type
 * drives what the UI can meaningfully render/link to, so a typo or an
 * unplanned value should fail loudly at the DB, not silently render as
 * an unrecognized string.
 *
 * Deliberately NOT wired into any other domain yet — `NotificationService
 * .create()` exists and is ready to be called, but nothing calls it
 * until a later, separate integration step.
 */
export const notificationTypeEnum = pgEnum("notification_type", [
  "instructor_application_submitted",
  "instructor_application_approved",
  "instructor_application_rejected",
  "course_submitted",
  "course_approved",
  "course_rejected",
  "new_enrollment",
  "course_purchased",
  "order_paid",
  "order_failed",
  "quiz_passed",
  "quiz_failed",
  "system",
]);

/**
 * One notification for one recipient. `recipientUserId` references
 * `auth.users.id` directly (not `profiles.id`) — the same "every 'who
 * does this belong to' column compares directly against `AuthUser.id`"
 * precedent `enrollments.studentId` already established (see that
 * column's own doc comment, `db/schema/learning.ts`), so authorization
 * checks here never need an extra `profiles` lookup either.
 *
 * `title`/`body` are `LocalizedText` (jsonb `{en, ar}`), not plain
 * strings — every other user-facing string in this codebase is
 * bilingual, and a notification is rendered directly to the recipient in
 * their active locale like anything else. `body` is nullable — a short,
 * title-only notification ("Your course was approved") doesn't always
 * need one. `data` is a free-form JSON payload (e.g. `{courseId}`) for
 * whatever a later integration step wants to deep-link to — reusing the
 * same "JSONB payload, no dedicated columns per notification type"
 * reasoning `learning_audit_logs.metadata` already uses, since the shape
 * genuinely varies per `type` and a column per possible payload key
 * would never stop growing.
 *
 * `updatedAt` isn't part of the four columns the task named
 * explicitly (id/recipientUserId/type/title/body/data/isRead/readAt/
 * createdAt), but every optimistic-concurrency-supporting table in this
 * codebase (`courses`, `modules`, `coupons`, `cms_media_assets`, ...)
 * uses it as the version token compared in `WHERE`, and this task
 * explicitly asks for optimistic concurrency on `markAsRead` — so it's
 * added here as the one deliberate, minimal deviation needed to satisfy
 * that requirement using the established pattern instead of inventing a
 * new one.
 */
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    recipientUserId: uuid("recipient_user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    type: notificationTypeEnum("type").notNull(),
    title: jsonb("title").notNull(),
    body: jsonb("body"),
    data: jsonb("data").notNull().default({}),
    isRead: boolean("is_read").notNull().default(false),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => [
    index("notifications_recipient_created_idx").on(table.recipientUserId, table.createdAt),
    index("notifications_recipient_unread_idx").on(table.recipientUserId, table.isRead),
  ],
);

/**
 * One row per user, created lazily on first write — a missing row means
 * "never touched their preferences," which `notify()` (`notifications/
 * utils/notify.ts`) treats identically to "everything on," so a user who
 * never visits Settings still gets every notification (opt-out, not
 * opt-in). The 13-value `notificationTypeEnum` is deliberately collapsed
 * into three coarse toggles here rather than mirrored 1:1 — a learner
 * doesn't think in terms of "quiz_passed" vs "quiz_failed," they think
 * "learning updates." `system` has no toggle at all: it's never
 * suppressed, the same "don't let a user silence account-security-
 * adjacent messages" reasoning most SaaS settings pages apply.
 */
export const notificationPreferences = pgTable("notification_preferences", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  /** new_enrollment, course_purchased, quiz_passed, quiz_failed */
  learningUpdates: boolean("learning_updates").notNull().default(true),
  /** order_paid, order_failed */
  ordersAndPayments: boolean("orders_and_payments").notNull().default(true),
  /** course_submitted/approved/rejected, instructor_application_* */
  courseAndInstructorUpdates: boolean("course_and_instructor_updates").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
});
