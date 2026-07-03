import { desc, eq } from "drizzle-orm";
import { getDb, type DbClient } from "@/db";
import { cmsAuditLogs } from "@/db/schema/cms";
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
 * `DbClient` so a caller already inside a transaction (`CmsPageVersionRepository`'s
 * publish/revert) can make the audit insert atomic with the write it's
 * auditing; callers outside a transaction just omit it and get the default
 * connection (`recordAuditLog` in `cms/utils/audit-log.ts` does this for
 * every non-transactional call site).
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
};
