import { getDb, type DbClient } from "@/db";
import { categoryAuditLogs } from "@/db/schema/course";
import { auditSearchOrderBy, buildAuditSearchConditions, type AuditLogSearchFilters } from "@/db/audit-search";
import { and } from "drizzle-orm";
import type { CategoryAuditLogEntry, NewCategoryAuditLogInput } from "@/courses/types/category-audit-log";

type CategoryAuditLogRow = typeof categoryAuditLogs.$inferSelect;

function mapRowToEntry(row: CategoryAuditLogRow): CategoryAuditLogEntry {
  return {
    id: row.id,
    action: row.action as CategoryAuditLogEntry["action"],
    categoryId: row.categoryId,
    actorId: row.actorId,
    createdAt: row.createdAt.toISOString(),
    metadata: row.metadata as Record<string, unknown>,
  };
}

/** Data access for `category_audit_logs` — mirrors `CourseAuditLogRepository`
 *  exactly. */
export const CategoryAuditLogRepository = {
  async create(input: NewCategoryAuditLogInput, db: DbClient = getDb()): Promise<CategoryAuditLogEntry> {
    const [row] = await db
      .insert(categoryAuditLogs)
      .values({
        action: input.action,
        categoryId: input.categoryId,
        actorId: input.actorId,
        metadata: input.metadata ?? {},
      })
      .returning();
    return mapRowToEntry(row);
  },

  async search(filters: AuditLogSearchFilters): Promise<CategoryAuditLogEntry[]> {
    const columns = {
      id: categoryAuditLogs.id,
      actorId: categoryAuditLogs.actorId,
      action: categoryAuditLogs.action,
      createdAt: categoryAuditLogs.createdAt,
    };
    const conditions = buildAuditSearchConditions(columns, filters);
    const rows = await getDb()
      .select()
      .from(categoryAuditLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(...auditSearchOrderBy(columns))
      .limit(filters.limit);
    return rows.map(mapRowToEntry);
  },
};
