/**
 * Mirrors `courses/types/course-audit-log.ts`'s shape/rationale exactly,
 * scoped to this domain — see `db/schema/learning.ts`'s
 * `learningAuditLogs` doc comment for why it's a separate table from
 * `course_audit_logs`. A plain union, not a Postgres enum (the DB column
 * is `text`), same reasoning as every other audit table here: new
 * actions shouldn't need a migration.
 */
export type LearningAuditAction =
  | "module_created"
  | "module_updated"
  | "module_deleted"
  | "lesson_created"
  | "lesson_updated"
  | "lesson_deleted"
  | "quiz_created"
  | "quiz_updated"
  | "quiz_deleted"
  | "enrollment_created"
  | "enrollment_revoked"
  | "enrollment_restored";

/** Mirrors `db/schema/learning.ts`'s `learning_audit_logs`. Write-only —
 *  no read/list method exists (no Audit Log UI, matching `course_audit_logs`
 *  and `cms_audit_logs`'s own scope). */
export interface LearningAuditLogEntry {
  id: string;
  action: LearningAuditAction;
  courseId: string;
  moduleId: string | null;
  lessonId: string | null;
  actorId: string | null;
  createdAt: string;
  metadata: Record<string, unknown>;
}

export interface NewLearningAuditLogInput {
  action: LearningAuditAction;
  courseId: string;
  moduleId?: string | null;
  lessonId?: string | null;
  actorId: string | null;
  metadata?: Record<string, unknown>;
}
