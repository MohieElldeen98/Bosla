import { logger } from "@/lib/logger";
import { SiteSettingsAuditLogRepository } from "@/cms/repositories/site-settings-audit-log.repository";
import type { NewSiteSettingsAuditLogInput } from "@/cms/types/site-settings-audit-log";

/** Best-effort audit logging for Site Settings update/delete — mirrors
 *  `cms/utils/audit-log.ts`'s `recordAuditLog` exactly: the mutation
 *  itself has already succeeded by the time this runs, so a logging
 *  failure must never turn a successful save into a reported error. */
export async function recordSiteSettingsAuditLog(input: NewSiteSettingsAuditLogInput): Promise<void> {
  try {
    await SiteSettingsAuditLogRepository.create(input);
  } catch (error) {
    logger.error("[cms:site-settings:audit]", error);
  }
}
