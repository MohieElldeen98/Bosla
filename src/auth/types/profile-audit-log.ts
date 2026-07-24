/**
 * The Auth Domain's own audit trail for role and account-status changes,
 * mirroring `courses/types/course-audit-log.ts`'s shape/rationale. A
 * plain union, not a Postgres enum (`profile_audit_logs.action` is
 * `text`), same reasoning as every other audit table here: a new action
 * shouldn't need a migration.
 */
export type ProfileAuditAction = "role_changed" | "status_changed";

/** Mirrors `db/schema/profiles.ts`'s `profile_audit_logs`. Write-only for
 *  now — no read/list method (no Audit Log UI yet, matching every other
 *  domain's own audit table). */
export interface ProfileAuditLogEntry {
  id: string;
  action: ProfileAuditAction;
  targetUserId: string;
  actorId: string | null;
  createdAt: string;
  metadata: Record<string, unknown>;
}

export interface NewProfileAuditLogInput {
  action: ProfileAuditAction;
  targetUserId: string;
  actorId: string | null;
  metadata?: Record<string, unknown>;
}
