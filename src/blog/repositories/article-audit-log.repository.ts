import { getDb, type DbClient } from "@/db";
import { articleAuditLogs } from "@/db/schema/articles";
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

/** Data access for `article_audit_logs` — write-only, mirrors
 *  `CourseAuditLogRepository` exactly (same optional `DbClient` for a
 *  future transactional caller; see `recordArticleAuditLog`). */
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
};
