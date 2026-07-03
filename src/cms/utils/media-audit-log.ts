import { logger } from "@/lib/logger";
import { MediaAuditLogRepository } from "@/cms/repositories/media-audit-log.repository";
import type { NewMediaAuditLogInput } from "@/cms/types/media-audit-log";

/** Best-effort audit logging for Media Library create/update/rename/
 *  delete — mirrors `cms/utils/audit-log.ts`'s `recordAuditLog` exactly:
 *  the mutation itself has already succeeded by the time this runs, so a
 *  logging failure must never turn a successful save into a reported
 *  error. */
export async function recordMediaAuditLog(input: NewMediaAuditLogInput): Promise<void> {
  try {
    await MediaAuditLogRepository.create(input);
  } catch (error) {
    logger.error("[cms:media:audit]", error);
  }
}
