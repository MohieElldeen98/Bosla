/**
 * `cms_navigation_items`' own audit trail — a plain union, not a Postgres
 * enum (`cms_navigation_audit_logs.action` is `text`), same reasoning as
 * every other audit table here: a new action shouldn't need a migration.
 * No separate `reorder` action — reordering is just repeated `update`
 * calls (each changing one item's `position`), so `"update"` covers it.
 */
export type NavigationAuditAction = "create" | "update" | "delete";

/** Mirrors `db/schema/cms.ts`'s `cms_navigation_audit_logs`. Write-only
 *  for now — no read/list method (no Audit Log UI yet). */
export interface NavigationAuditLogEntry {
  id: string;
  action: NavigationAuditAction;
  navigationItemId: string | null;
  actorId: string | null;
  createdAt: string;
  metadata: Record<string, unknown>;
}

export interface NewNavigationAuditLogInput {
  action: NavigationAuditAction;
  navigationItemId: string | null;
  actorId: string | null;
  metadata?: Record<string, unknown>;
}
