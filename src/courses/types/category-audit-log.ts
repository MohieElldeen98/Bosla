/**
 * The Course Domain's category-level audit trail, mirroring
 * `courses/types/course-audit-log.ts`'s shape/rationale exactly but
 * scoped to `categories`. A plain union, not a Postgres enum
 * (`category_audit_logs.action` is `text`), for the same reason every
 * other audit table here uses one: new actions shouldn't need a
 * migration.
 */
export type CategoryAuditAction = "create" | "update" | "delete";

/** Mirrors `db/schema/course.ts`'s `category_audit_logs`. Write-only for
 *  now — no read/list method (no Audit Log UI yet, matching every other
 *  domain's own audit table). */
export interface CategoryAuditLogEntry {
  id: string;
  action: CategoryAuditAction;
  categoryId: string;
  actorId: string | null;
  createdAt: string;
  metadata: Record<string, unknown>;
}

export interface NewCategoryAuditLogInput {
  action: CategoryAuditAction;
  categoryId: string;
  actorId: string | null;
  metadata?: Record<string, unknown>;
}
