import { getDb, type DbClient } from "@/db";
import { articleAuditLogs } from "@/db/schema/articles";
import { auditSearchOrderBy, buildAuditSearchConditions, type AuditLogSearchFilters } from "@/db/audit-search";
import { and } from "drizzle-orm";
import type { ArticleAuditLogEntry, NewArticleAuditLogInput } from "@/blog/types/article-audit-log";

type ArticleAuditLogRow = typeof articleAuditLogs.$inferSelect;

function mapRowToEntry(row: ArticleAuditLogRow): ArticleAuditLogEntry {
  return {
    id: row.id,
    action: row.action as ArticleAuditLogEntry["action"],
    articleId: row.articleId,
    actorId: row.actorId,
    createdAt: row.createdAt.toISOString(),
    metadata: row.metadata as Record<string, unknown>,
  };
}

/** Data access for `article_audit_logs` — mirrors `CourseAuditLogRepository`
 *  exactly (same optional `DbClient` for a future transactional caller;
 *  see `recordArticleAuditLog`). */
export const ArticleAuditLogRepository = {
  async create(input: NewArticleAuditLogInput, db: DbClient = getDb()): Promise<ArticleAuditLogEntry> {
    const [row] = await db
      .insert(articleAuditLogs)
      .values({
        action: input.action,
        articleId: input.articleId,
        actorId: input.actorId,
        metadata: input.metadata ?? {},
      })
      .returning();
    return mapRowToEntry(row);
  },

  /** Read path for `AuditFeedService` — actor/action/free-text/date-range
   *  filtered, keyset-paginated via `filters.cursor`. */
  async search(filters: AuditLogSearchFilters): Promise<ArticleAuditLogEntry[]> {
    const columns = {
      id: articleAuditLogs.id,
      actorId: articleAuditLogs.actorId,
      action: articleAuditLogs.action,
      createdAt: articleAuditLogs.createdAt,
    };
    const conditions = buildAuditSearchConditions(columns, filters);
    const rows = await getDb()
      .select()
      .from(articleAuditLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(...auditSearchOrderBy(columns))
      .limit(filters.limit);
    return rows.map(mapRowToEntry);
  },
};
