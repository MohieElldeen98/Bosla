import { getDb } from "@/db";
import { cmsMediaAuditLogs } from "@/db/schema/cms";
import { auditSearchOrderBy, buildAuditSearchConditions, type AuditLogSearchFilters } from "@/db/audit-search";
import { and } from "drizzle-orm";
import type { MediaAuditLogEntry, NewMediaAuditLogInput } from "@/cms/types/media-audit-log";

type MediaAuditLogRow = typeof cmsMediaAuditLogs.$inferSelect;

function mapRowToEntry(row: MediaAuditLogRow): MediaAuditLogEntry {
  return {
    id: row.id,
    action: row.action as MediaAuditLogEntry["action"],
    mediaAssetId: row.mediaAssetId,
    actorId: row.actorId,
    createdAt: row.createdAt.toISOString(),
    metadata: row.metadata as Record<string, unknown>,
  };
}

/** Data access for `cms_media_audit_logs` — mirrors `CmsAuditLogRepository`'s
 *  shape. `recordMediaAuditLog` (`cms/utils/media-audit-log.ts`) is the only
 *  write caller; `search` backs `AuditFeedService`. */
export const MediaAuditLogRepository = {
  async create(input: NewMediaAuditLogInput): Promise<MediaAuditLogEntry> {
    const [row] = await getDb()
      .insert(cmsMediaAuditLogs)
      .values({
        action: input.action,
        mediaAssetId: input.mediaAssetId,
        actorId: input.actorId,
        metadata: input.metadata ?? {},
      })
      .returning();
    return mapRowToEntry(row);
  },

  async search(filters: AuditLogSearchFilters): Promise<MediaAuditLogEntry[]> {
    const columns = {
      id: cmsMediaAuditLogs.id,
      actorId: cmsMediaAuditLogs.actorId,
      action: cmsMediaAuditLogs.action,
      createdAt: cmsMediaAuditLogs.createdAt,
    };
    const conditions = buildAuditSearchConditions(columns, filters);
    const rows = await getDb()
      .select()
      .from(cmsMediaAuditLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(...auditSearchOrderBy(columns))
      .limit(filters.limit);
    return rows.map(mapRowToEntry);
  },
};
