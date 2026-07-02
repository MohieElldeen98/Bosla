import { logger } from "@/lib/logger";
import { CmsAuditLogRepository } from "@/cms/repositories/audit-log.repository";
import type { NewCmsAuditLogInput } from "@/cms/types/audit-log";

/**
 * Best-effort audit logging for section/SEO saves, toggles, and reorders —
 * the mutation itself has already succeeded by the time this is called, so
 * a logging failure must never turn a successful save into a reported
 * error. Publish/revert instead write their audit row inside their own DB
 * transaction directly via `CmsAuditLogRepository.create(input, tx)` — for
 * those two, "never partially publish" means a failed audit insert SHOULD
 * roll back the whole action, so they deliberately don't go through this
 * best-effort path.
 */
export async function recordAuditLog(input: NewCmsAuditLogInput): Promise<void> {
  try {
    await CmsAuditLogRepository.create(input);
  } catch (error) {
    logger.error("[cms:audit]", error);
  }
}
