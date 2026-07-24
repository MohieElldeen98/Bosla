import { logger } from "@/lib/logger";
import { NavigationAuditLogRepository } from "@/cms/repositories/navigation-audit-log.repository";
import type { NewNavigationAuditLogInput } from "@/cms/types/navigation-audit-log";

/** Best-effort audit logging for header/footer nav-link create/update/
 *  delete — mirrors `cms/utils/audit-log.ts`'s `recordAuditLog` exactly:
 *  the mutation itself has already succeeded by the time this runs, so a
 *  logging failure must never turn a successful save into a reported
 *  error. */
export async function recordNavigationAuditLog(input: NewNavigationAuditLogInput): Promise<void> {
  try {
    await NavigationAuditLogRepository.create(input);
  } catch (error) {
    logger.error("[cms:navigation:audit]", error);
  }
}
