import { and } from "drizzle-orm";
import { getDb } from "@/db";
import { profileAuditLogs } from "@/db/schema/profiles";
import { auditSearchOrderBy, buildAuditSearchConditions, type AuditLogSearchFilters } from "@/db/audit-search";
import type { NewProfileAuditLogInput, ProfileAuditLogEntry } from "@/auth/types/profile-audit-log";

type ProfileAuditLogRow = typeof profileAuditLogs.$inferSelect;

function mapRowToEntry(row: ProfileAuditLogRow): ProfileAuditLogEntry {
  return {
    id: row.id,
    action: row.action as ProfileAuditLogEntry["action"],
    targetUserId: row.targetUserId,
    actorId: row.actorId,
    createdAt: row.createdAt.toISOString(),
    metadata: row.metadata as Record<string, unknown>,
  };
}

/** Data access for `profile_audit_logs` — write-only, mirrors
 *  `CourseAuditLogRepository`'s shape. */
export const ProfileAuditLogRepository = {
  async create(input: NewProfileAuditLogInput): Promise<ProfileAuditLogEntry> {
    const [row] = await getDb()
      .insert(profileAuditLogs)
      .values({
        action: input.action,
        targetUserId: input.targetUserId,
        actorId: input.actorId,
        metadata: input.metadata ?? {},
      })
      .returning();
    return mapRowToEntry(row);
  },

  async search(filters: AuditLogSearchFilters): Promise<ProfileAuditLogEntry[]> {
    const columns = {
      id: profileAuditLogs.id,
      actorId: profileAuditLogs.actorId,
      action: profileAuditLogs.action,
      createdAt: profileAuditLogs.createdAt,
    };
    const conditions = buildAuditSearchConditions(columns, filters);
    const rows = await getDb()
      .select()
      .from(profileAuditLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(...auditSearchOrderBy(columns))
      .limit(filters.limit);
    return rows.map(mapRowToEntry);
  },
};
