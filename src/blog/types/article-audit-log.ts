/**
 * The Blog domain's own audit trail, mirroring
 * `courses/types/course-audit-log.ts`'s shape/rationale exactly but scoped
 * to `articles`. A plain union, not a Postgres enum
 * (`article_audit_logs.action` is `text`) — new actions shouldn't need a
 * migration.
 */
export type ArticleAuditAction = "create" | "update" | "publish" | "unpublish" | "delete";

/** Mirrors `db/schema/articles.ts`'s `article_audit_logs`. Write-only —
 *  no read/list method exists yet, matching the other domains' audit
 *  tables. */
export interface ArticleAuditLogEntry {
  id: string;
  action: ArticleAuditAction;
  articleId: string;
  actorId: string | null;
  createdAt: string;
  metadata: Record<string, unknown>;
}

export interface NewArticleAuditLogInput {
  action: ArticleAuditAction;
  articleId: string;
  actorId: string | null;
  metadata?: Record<string, unknown>;
}
