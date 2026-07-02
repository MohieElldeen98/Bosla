/**
 * The homepage CMS actions Step 6.6 requires an audit trail for. A plain
 * union, not a Postgres enum (`cms_audit_logs.action` is `text`) — matches
 * `docs/database-overview.md`'s "audit_logs" plan of staying schema-free
 * per new action, since this table is meant to grow to other admin
 * domains later without a migration each time.
 */
export type CmsAuditAction = "save_draft" | "publish" | "revert" | "toggle_section" | "reorder_sections";

/** Mirrors `db/schema/cms.ts`'s `cms_audit_logs`. Write-only for now — no
 *  read/list method exists (no Audit Log UI this step). */
export interface CmsAuditLogEntry {
  id: string;
  action: CmsAuditAction;
  pageId: string;
  sectionId: string | null;
  actorId: string | null;
  createdAt: string;
  metadata: Record<string, unknown>;
}

export interface NewCmsAuditLogInput {
  action: CmsAuditAction;
  pageId: string;
  sectionId?: string | null;
  actorId: string | null;
  metadata?: Record<string, unknown>;
}
