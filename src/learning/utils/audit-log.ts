import { logger } from "@/lib/logger";
import { LearningAuditLogRepository } from "@/learning/repositories/audit-log.repository";
import type { NewLearningAuditLogInput } from "@/learning/types/audit-log";

/**
 * Best-effort audit logging for Module/Lesson/Quiz create/update/delete
 * and Enrollment grants — mirrors `courses/utils/audit-log.ts`'s
 * `recordCourseAuditLog` exactly: the mutation itself has already
 * succeeded by the time this runs, so a logging failure must never turn
 * a successful save into a reported error.
 */
export async function recordLearningAuditLog(input: NewLearningAuditLogInput): Promise<void> {
  try {
    await LearningAuditLogRepository.create(input);
  } catch (error) {
    logger.error("[learning:audit]", error);
  }
}
