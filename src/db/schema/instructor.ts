import { sql } from "drizzle-orm";
import { index, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { authUsers } from "./auth-users";

/**
 * The Instructor Experience domain (Phase 6, Step 6.1 — docs/roadmap.md).
 * `instructor_profiles` is the real-signed-in-user counterpart to
 * `courses`' `instructors` table (course attribution/content data,
 * `db/schema/course.ts`) — this table is about *authorization* (did a
 * student apply, is the application approved), that one is about
 * *display* (name/bio/credentials shown on a course page). They stay
 * deliberately unbridged by this step; `instructors.profileId` remains
 * unused until a later step (Course Builder) actually needs to attribute
 * an authored course to its approved instructor.
 *
 * `userId` references `auth.users.id`, not `profiles.id` — matching
 * `enrollments.studentId`'s exact precedent (see that column's doc
 * comment in `db/schema/learning.ts`): every "who did/owns this" column
 * in this codebase compares directly against `AuthUser.id`, which is
 * always `auth.users.id`, so no extra `profiles` lookup is needed on the
 * hot authorization path. `courses.instructors.profileId` is the one
 * deliberate exception, since it is display data, not an auth check.
 *
 * `docs/database-overview.md`'s original column list was illustrative
 * (`is_approved` boolean + `payout_details` jsonb). This implementation
 * uses a single `status` enum instead of a separate boolean — mirroring
 * `courses.course_status`'s own single-enum state machine — since a
 * rejected application is a distinct, terminal state from "still
 * pending," not just "not yet approved." `payout_details` isn't a column
 * here: nothing in this step reads or writes it, and the Earnings step
 * that will need it is later in Phase 6 (matching this codebase's
 * established preference against speculative, unused columns — see
 * `courses`' own doc comment on why student_count/rating aren't columns
 * either).
 *
 * One application per user, enforced by the unique index on `userId` —
 * a rejected applicant does not get a self-serve "reapply" path in this
 * step; an admin can revisit the decision as a follow-up if that
 * genuinely becomes needed.
 */
export const instructorApplicationStatusEnum = pgEnum("instructor_application_status", [
  "pending",
  "approved",
  "rejected",
]);

export const instructorProfiles = pgTable(
  "instructor_profiles",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    headline: jsonb("headline").notNull(),
    credentials: text("credentials"),
    status: instructorApplicationStatusEnum("status").notNull().default("pending"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    approvedByUserId: uuid("approved_by_user_id").references(() => authUsers.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => [
    uniqueIndex("instructor_profiles_user_id_key").on(table.userId),
    index("instructor_profiles_status_idx").on(table.status),
  ],
);

/** Write-only audit trail for application submit/approve/reject — one
 *  bounded-audit-table per sub-domain, mirroring `course_audit_logs`/
 *  `order_audit_logs`/`coupon_audit_logs` exactly. */
export const instructorProfileAuditLogs = pgTable(
  "instructor_profile_audit_logs",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    action: text("action").notNull(),
    instructorProfileId: uuid("instructor_profile_id")
      .notNull()
      .references(() => instructorProfiles.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id").references(() => authUsers.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    metadata: jsonb("metadata").notNull().default({}),
  },
  (table) => [
    index("instructor_profile_audit_logs_instructor_profile_id_idx").on(
      table.instructorProfileId,
      table.createdAt,
    ),
    index("instructor_profile_audit_logs_actor_id_idx").on(table.actorId, table.createdAt),
    index("instructor_profile_audit_logs_created_at_idx").on(table.createdAt),
  ],
);
