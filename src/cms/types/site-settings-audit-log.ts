/**
 * `cms_site_settings`' own audit trail — a plain union, not a Postgres
 * enum (`cms_site_settings_audit_logs.action` is `text`), same reasoning
 * as every other audit table here: a new action shouldn't need a
 * migration.
 */
export type SiteSettingsAuditAction = "update" | "delete";

/** Mirrors `db/schema/cms.ts`'s `cms_site_settings_audit_logs`.
 *  Write-only for now — no read/list method (no Audit Log UI yet). */
export interface SiteSettingsAuditLogEntry {
  id: string;
  action: SiteSettingsAuditAction;
  settingKey: string;
  actorId: string | null;
  createdAt: string;
  metadata: Record<string, unknown>;
}

export interface NewSiteSettingsAuditLogInput {
  action: SiteSettingsAuditAction;
  settingKey: string;
  actorId: string | null;
  metadata?: Record<string, unknown>;
}
