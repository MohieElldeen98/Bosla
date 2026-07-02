/**
 * The Course Domain's own audit trail (Step 3.3), mirroring
 * `cms/types/audit-log.ts`'s shape/rationale exactly but scoped to
 * `courses` — see `db/schema/course.ts`'s `courseAuditLogs` doc comment
 * for why this isn't just reusing `cms_audit_logs` directly. A plain
 * union, not a Postgres enum (`course_audit_logs.action` is `text`), for
 * the same reason CMS's is: new actions shouldn't need a migration.
 */
export type CourseAuditAction = "create" | "update" | "archive" | "restore" | "delete";

/** Mirrors `db/schema/course.ts`'s `course_audit_logs`. Write-only for now
 *  — no read/list method exists (no Audit Log UI this step, matching
 *  CMS's own Step 6.6 scope). */
export interface CourseAuditLogEntry {
  id: string;
  action: CourseAuditAction;
  courseId: string;
  actorId: string | null;
  createdAt: string;
  metadata: Record<string, unknown>;
}

export interface NewCourseAuditLogInput {
  action: CourseAuditAction;
  courseId: string;
  actorId: string | null;
  metadata?: Record<string, unknown>;
}
