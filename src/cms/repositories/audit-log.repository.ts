import { and, desc, eq } from "drizzle-orm";
import { getDb, type DbClient } from "@/db";
import { cmsAuditLogs } from "@/db/schema/cms";
import { auditSearchOrderBy, buildAuditSearchConditions, type AuditLogSearchFilters } from "@/db/audit-search";
import type { CmsAuditLogEntry, NewCmsAuditLogInput } from "@/cms/types/audit-log";

type CmsAuditLogRow = typeof cmsAuditLogs.$inferSelect;

function mapRowToEntry(row: CmsAuditLogRow): CmsAuditLogEntry {
  return {
    id: row.id,
    action: row.action as CmsAuditLogEntry["action"],
    pageId: row.pageId,
    sectionId: row.sectionId,
    actorId: row.actorId,
    createdAt: row.createdAt.toISOString(),
    metadata: row.metadata as Record<string, unknown>,
  };
}

/**
 * Data access for `cms_audit_logs` — write-only (no read/list method; no
 * Audit Log UI exists yet, Step 6.6 scope). `create` accepts an optional
 * `DbClient` for a caller that ever needs the audit insert atomic with a
 * transaction of its own; every current call site (`recordAuditLog` in
 * `cms/utils/audit-log.ts`) omits it and gets the default connection.
 */
export const CmsAuditLogRepository = {
  async create(input: NewCmsAuditLogInput, db: DbClient = getDb()): Promise<CmsAuditLogEntry> {
    const [row] = await db
      .insert(cmsAuditLogs)
      .values({
        action: input.action,
        pageId: input.pageId,
        sectionId: input.sectionId ?? null,
        actorId: input.actorId,
        metadata: input.metadata ?? {},
      })
      .returning();
    return mapRowToEntry(row);
  },

  /** Read path for the admin User Details page's Activity tab (Phase 7)
   *  — "actions this user performed as an admin," newest first. The
   *  only reader; every other call site stays write-only. */
  async findByActorId(actorId: string, limit = 20): Promise<CmsAuditLogEntry[]> {
    const rows = await getDb()
      .select()
      .from(cmsAuditLogs)
      .where(eq(cmsAuditLogs.actorId, actorId))
      .orderBy(desc(cmsAuditLogs.createdAt))
      .limit(limit);
    return rows.map(mapRowToEntry);
  },

  /** Read path for `AuditFeedService` — actor/action/free-text/date-range
   *  filtered, keyset-paginated via `filters.cursor`. */
  async search(filters: AuditLogSearchFilters): Promise<CmsAuditLogEntry[]> {
    const columns = {
      id: cmsAuditLogs.id,
      actorId: cmsAuditLogs.actorId,
      action: cmsAuditLogs.action,
      createdAt: cmsAuditLogs.createdAt,
    };
    const conditions = buildAuditSearchConditions(columns, filters);
    const rows = await getDb()
      .select()
      .from(cmsAuditLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(...auditSearchOrderBy(columns))
      .limit(filters.limit);
    return rows.map(mapRowToEntry);
  },
};
