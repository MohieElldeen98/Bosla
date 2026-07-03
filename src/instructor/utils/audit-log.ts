import { logger } from "@/lib/logger";
import { InstructorProfileAuditLogRepository } from "@/instructor/repositories/instructor-profile-audit-log.repository";
import type { NewInstructorProfileAuditLogInput } from "@/instructor/types/instructor-profile-audit-log";

/** Best-effort audit logging for instructor application actions —
 *  mirrors `commerce/utils/audit-log.ts`'s `recordCouponAuditLog`
 *  exactly: the mutation itself has already succeeded by the time this
 *  runs, so a logging failure must never turn a successful save into a
 *  reported error. */
export async function recordInstructorProfileAuditLog(input: NewInstructorProfileAuditLogInput): Promise<void> {
  try {
    await InstructorProfileAuditLogRepository.create(input);
  } catch (error) {
    logger.error("[instructor:application-audit]", error);
  }
}
