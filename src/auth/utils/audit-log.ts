import { logger } from "@/lib/logger";
import { ProfileAuditLogRepository } from "@/auth/repositories/profile-audit-log.repository";
import type { NewProfileAuditLogInput } from "@/auth/types/profile-audit-log";

/** Best-effort audit logging for role/account-status changes — mirrors
 *  `courses/utils/audit-log.ts`'s `recordCourseAuditLog` exactly: the
 *  mutation itself has already succeeded by the time this runs, so a
 *  logging failure must never turn a successful change into a reported
 *  error. */
export async function recordProfileAuditLog(input: NewProfileAuditLogInput): Promise<void> {
  try {
    await ProfileAuditLogRepository.create(input);
  } catch (error) {
    logger.error("[auth:profile-audit]", error);
  }
}
