import { logger } from "@/lib/logger";
import { CourseAuditLogRepository } from "@/courses/repositories/course-audit-log.repository";
import { CategoryAuditLogRepository } from "@/courses/repositories/category-audit-log.repository";
import type { NewCourseAuditLogInput } from "@/courses/types/course-audit-log";
import type { NewCategoryAuditLogInput } from "@/courses/types/category-audit-log";

/**
 * Best-effort audit logging for course create/update/archive/restore/
 * delete (Step 3.3) — mirrors `cms/utils/audit-log.ts`'s `recordAuditLog`
 * exactly: the mutation itself has already succeeded by the time this
 * runs, so a logging failure must never turn a successful save into a
 * reported error.
 */
export async function recordCourseAuditLog(input: NewCourseAuditLogInput): Promise<void> {
  try {
    await CourseAuditLogRepository.create(input);
  } catch (error) {
    logger.error("[courses:audit]", error);
  }
}

/** Best-effort audit logging for category create/update/delete — mirrors
 *  `recordCourseAuditLog` exactly, same file since both are Course Domain
 *  audit trails (matches `commerce/utils/audit-log.ts`'s
 *  `recordOrderAuditLog`/`recordCouponAuditLog` grouping precedent). */
export async function recordCategoryAuditLog(input: NewCategoryAuditLogInput): Promise<void> {
  try {
    await CategoryAuditLogRepository.create(input);
  } catch (error) {
    logger.error("[courses:category-audit]", error);
  }
}
