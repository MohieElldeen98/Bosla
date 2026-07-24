import { and } from "drizzle-orm";
import { getDb } from "@/db";
import { cmsNavigationAuditLogs } from "@/db/schema/cms";
import { auditSearchOrderBy, buildAuditSearchConditions, type AuditLogSearchFilters } from "@/db/audit-search";
import type { NavigationAuditLogEntry, NewNavigationAuditLogInput } from "@/cms/types/navigation-audit-log";

type NavigationAuditLogRow = typeof cmsNavigationAuditLogs.$inferSelect;

function mapRowToEntry(row: NavigationAuditLogRow): NavigationAuditLogEntry {
  return {
    id: row.id,
    action: row.action as NavigationAuditLogEntry["action"],
    navigationItemId: row.navigationItemId,
    actorId: row.actorId,
    createdAt: row.createdAt.toISOString(),
    metadata: row.metadata as Record<string, unknown>,
  };
}

/** Data access for `cms_navigation_audit_logs` — write-only, mirrors
 *  `CmsAuditLogRepository`'s shape. */
export const NavigationAuditLogRepository = {
  async create(input: NewNavigationAuditLogInput): Promise<NavigationAuditLogEntry> {
    const [row] = await getDb()
      .insert(cmsNavigationAuditLogs)
      .values({
        action: input.action,
        navigationItemId: input.navigationItemId,
        actorId: input.actorId,
        metadata: input.metadata ?? {},
      })
      .returning();
    return mapRowToEntry(row);
  },

  async search(filters: AuditLogSearchFilters): Promise<NavigationAuditLogEntry[]> {
    const columns = {
      id: cmsNavigationAuditLogs.id,
      actorId: cmsNavigationAuditLogs.actorId,
      action: cmsNavigationAuditLogs.action,
      createdAt: cmsNavigationAuditLogs.createdAt,
    };
    const conditions = buildAuditSearchConditions(columns, filters);
    const rows = await getDb()
      .select()
      .from(cmsNavigationAuditLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(...auditSearchOrderBy(columns))
      .limit(filters.limit);
    return rows.map(mapRowToEntry);
  },
};
