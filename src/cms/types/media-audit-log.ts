/** Mirrors `courses/types/course-audit-log.ts`'s shape/rationale exactly,
 *  scoped to this domain — see `db/schema/cms.ts`'s `cmsMediaAuditLogs`
 *  doc comment for why it's a separate table from `cms_audit_logs`. A
 *  plain union, not a Postgres enum (the DB column is `text`), same
 *  reasoning as every other audit table here: a new action shouldn't
 *  need a migration. */
export type MediaAuditAction = "media_created" | "media_updated" | "media_renamed" | "media_deleted";

export interface MediaAuditLogEntry {
  id: string;
  action: MediaAuditAction;
  mediaAssetId: string;
  actorId: string | null;
  createdAt: string;
  metadata: Record<string, unknown>;
}

export interface NewMediaAuditLogInput {
  action: MediaAuditAction;
  mediaAssetId: string;
  actorId: string | null;
  metadata?: Record<string, unknown>;
}
