import { logger } from "@/lib/logger";
import { CmsAuditLogRepository } from "@/cms/repositories/audit-log.repository";
import type { NewCmsAuditLogInput } from "@/cms/types/audit-log";

/**
 * Best-effort audit logging for section/SEO saves, toggles, and reorders —
 * the mutation itself has already succeeded by the time this is called, so
 * a logging failure must never turn a successful save into a reported
 * error.
 */
export async function recordAuditLog(input: NewCmsAuditLogInput): Promise<void> {
  try {
    await CmsAuditLogRepository.create(input);
  } catch (error) {
    logger.error("[cms:audit]", error);
  }
}
