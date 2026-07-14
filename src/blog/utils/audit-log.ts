import { logger } from "@/lib/logger";
import { ArticleAuditLogRepository } from "@/blog/repositories/article-audit-log.repository";
import type { NewArticleAuditLogInput } from "@/blog/types/article-audit-log";

/**
 * Best-effort audit logging for article mutations — mirrors
 * `courses/utils/audit-log.ts`'s `recordCourseAuditLog` exactly: the
 * mutation itself has already succeeded by the time this runs, so a
 * logging failure must never turn a successful save into a reported error.
 */
export async function recordArticleAuditLog(input: NewArticleAuditLogInput): Promise<void> {
  try {
    await ArticleAuditLogRepository.create(input);
  } catch (error) {
    logger.error("[blog:audit]", error);
  }
}
