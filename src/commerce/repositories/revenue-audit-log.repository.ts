import { and } from "drizzle-orm";
import { getDb, type DbClient } from "@/db";
import { revenueAuditLogs } from "@/db/schema/revenue";
import { auditSearchOrderBy, buildAuditSearchConditions, type AuditLogSearchFilters } from "@/db/audit-search";
import type { NewRevenueAuditLogInput, RevenueAuditLogEntry } from "@/commerce/types/revenue-audit-log";

type RevenueAuditLogRow = typeof revenueAuditLogs.$inferSelect;

function mapRowToEntry(row: RevenueAuditLogRow): RevenueAuditLogEntry {
  return {
    id: row.id,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    actorId: row.actorId,
    createdAt: row.createdAt.toISOString(),
    metadata: row.metadata as Record<string, unknown>,
  };
}

/** Data access for `revenue_audit_logs` — previously written only via a
 *  raw insert inline in `recordRevenueAuditLog` (`commerce/utils/
 *  revenue-audit-log.ts`); factored out here to match every other audit
 *  table's repository-owns-data-access convention, and to add the read
 *  path `AuditFeedService` needs. `create` still accepts an optional
 *  `DbClient` so a transactional caller can make the insert atomic with
 *  the movement it describes. */
export const RevenueAuditLogRepository = {
  async create(input: NewRevenueAuditLogInput, db: DbClient = getDb()): Promise<RevenueAuditLogEntry> {
    const [row] = await db
      .insert(revenueAuditLogs)
      .values({
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        actorId: input.actorId ?? null,
        metadata: input.metadata ?? {},
      })
      .returning();
    return mapRowToEntry(row);
  },

  async search(filters: AuditLogSearchFilters): Promise<RevenueAuditLogEntry[]> {
    const columns = {
      id: revenueAuditLogs.id,
      actorId: revenueAuditLogs.actorId,
      action: revenueAuditLogs.action,
      createdAt: revenueAuditLogs.createdAt,
    };
    const conditions = buildAuditSearchConditions(columns, filters);
    const rows = await getDb()
      .select()
      .from(revenueAuditLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(...auditSearchOrderBy(columns))
      .limit(filters.limit);
    return rows.map(mapRowToEntry);
  },
};
