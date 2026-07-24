import { and } from "drizzle-orm";
import { getDb } from "@/db";
import { cmsSiteSettingsAuditLogs } from "@/db/schema/cms";
import { auditSearchOrderBy, buildAuditSearchConditions, type AuditLogSearchFilters } from "@/db/audit-search";
import type { NewSiteSettingsAuditLogInput, SiteSettingsAuditLogEntry } from "@/cms/types/site-settings-audit-log";

type SiteSettingsAuditLogRow = typeof cmsSiteSettingsAuditLogs.$inferSelect;

function mapRowToEntry(row: SiteSettingsAuditLogRow): SiteSettingsAuditLogEntry {
  return {
    id: row.id,
    action: row.action as SiteSettingsAuditLogEntry["action"],
    settingKey: row.settingKey,
    actorId: row.actorId,
    createdAt: row.createdAt.toISOString(),
    metadata: row.metadata as Record<string, unknown>,
  };
}

/** Data access for `cms_site_settings_audit_logs` — write-only, mirrors
 *  `CmsAuditLogRepository`'s shape. */
export const SiteSettingsAuditLogRepository = {
  async create(input: NewSiteSettingsAuditLogInput): Promise<SiteSettingsAuditLogEntry> {
    const [row] = await getDb()
      .insert(cmsSiteSettingsAuditLogs)
      .values({
        action: input.action,
        settingKey: input.settingKey,
        actorId: input.actorId,
        metadata: input.metadata ?? {},
      })
      .returning();
    return mapRowToEntry(row);
  },

  async search(filters: AuditLogSearchFilters): Promise<SiteSettingsAuditLogEntry[]> {
    const columns = {
      id: cmsSiteSettingsAuditLogs.id,
      actorId: cmsSiteSettingsAuditLogs.actorId,
      action: cmsSiteSettingsAuditLogs.action,
      createdAt: cmsSiteSettingsAuditLogs.createdAt,
    };
    const conditions = buildAuditSearchConditions(columns, filters);
    const rows = await getDb()
      .select()
      .from(cmsSiteSettingsAuditLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(...auditSearchOrderBy(columns))
      .limit(filters.limit);
    return rows.map(mapRowToEntry);
  },
};
