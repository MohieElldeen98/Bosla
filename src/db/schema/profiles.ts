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

/**
 * Mirrors `auth/types/role.ts`'s `ROLES` tuple exactly — the two must
 * change together (see docs/authentication-architecture.md §4).
 */
export const profileRoleEnum = pgEnum("profile_role", [
  "student",
  "instructor",
  "admin",
  "super_admin",
]);

/**
 * Mirrors `auth/types/profile-status.ts`'s `PROFILE_STATUSES` tuple
 * exactly. Lifecycle: `pending` (created at sign-up, email not yet
 * verified) → `active` (verified) → `suspended`/`archived` (admin action,
 * not built yet) → `deleted` (soft-delete, paired with `deleted_at`).
 */
export const profileStatusEnum = pgEnum("profile_status", [
  "pending",
  "active",
  "suspended",
  "archived",
  "deleted",
]);

/**
 * Application-owned business data for a user — deliberately separate from
 * Supabase's `auth.users` (identity/credentials, owned by Supabase). One
 * row per Supabase Auth user (`user_id` unique), created automatically by
 * the `on_auth_user_created` trigger (see
 * `drizzle/0001_profiles_auto_create_trigger.sql`) and defensively by
 * `ProfileService.bootstrapProfile` — both idempotent via
 * `ON CONFLICT (user_id) DO NOTHING`, so whichever runs first wins and
 * neither ever produces a duplicate.
 */
export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    fullName: text("full_name"),
    displayName: text("display_name"),
    avatarUrl: text("avatar_url"),
    profession: text("profession"),
    country: text("country"),
    language: text("language").notNull().default("en"),
    bio: text("bio"),
    website: text("website"),
    linkedin: text("linkedin"),
    yearsOfExperience: integer("years_of_experience"),
    specialties: text("specialties")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    role: profileRoleEnum("role").notNull().default("student"),
    status: profileStatusEnum("status").notNull().default("pending"),
    isPublic: boolean("is_public").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("profiles_user_id_key").on(table.userId),
    uniqueIndex("profiles_email_key").on(table.email),
    index("profiles_role_idx").on(table.role),
    index("profiles_status_idx").on(table.status),
    index("profiles_country_idx").on(table.country),
    index("profiles_profession_idx").on(table.profession),
    index("profiles_display_name_idx").on(table.displayName),
    check(
      "profiles_years_of_experience_check",
      sql`${table.yearsOfExperience} IS NULL OR ${table.yearsOfExperience} >= 0`,
    ),
  ],
);

/**
 * Write-only audit trail for role and account-status changes
 * (`UserRoleService.updateUserRole`/`ProfileService.setAccountStatus`) —
 * mirrors `course_audit_logs`'s shape/rationale. `targetUserId` (not
 * `profiles.id`) is the anchor, matching every other audit table's "who
 * did this" precedent of referencing `auth.users.id` directly rather than
 * a `profiles.id` FK (see `enrollments`' own doc comment for why).
 * `actorId` is nullable for the one system-initiated case
 * (`UserRoleService.updateUserRole` accepts `actingUser: "system"`, e.g.
 * an automated role assignment with no human actor).
 */
export const profileAuditLogs = pgTable(
  "profile_audit_logs",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    action: text("action").notNull(),
    targetUserId: uuid("target_user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id").references(() => authUsers.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    metadata: jsonb("metadata").notNull().default({}),
  },
  (table) => [
    index("profile_audit_logs_target_user_id_idx").on(table.targetUserId, table.createdAt),
    index("profile_audit_logs_actor_id_idx").on(table.actorId, table.createdAt),
    index("profile_audit_logs_created_at_idx").on(table.createdAt),
  ],
);
