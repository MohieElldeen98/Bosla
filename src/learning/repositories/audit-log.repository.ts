import { getDb, type DbClient } from "@/db";
import { learningAuditLogs } from "@/db/schema/learning";
import type { LearningAuditLogEntry, NewLearningAuditLogInput } from "@/learning/types/audit-log";

type LearningAuditLogRow = typeof learningAuditLogs.$inferSelect;

function mapRowToEntry(row: LearningAuditLogRow): LearningAuditLogEntry {
  return {
    id: row.id,
    action: row.action as LearningAuditLogEntry["action"],
    courseId: row.courseId,
    moduleId: row.moduleId,
    lessonId: row.lessonId,
    actorId: row.actorId,
    createdAt: row.createdAt.toISOString(),
    metadata: row.metadata as Record<string, unknown>,
  };
}

/** Data access for `learning_audit_logs` — write-only, mirrors
 *  `CourseAuditLogRepository`/`CmsAuditLogRepository` exactly. Accepts an
 *  optional `DbClient` so a future transactional caller can make the
 *  insert atomic with the write it's auditing; every current call site
 *  is non-transactional and just omits it (see `recordLearningAuditLog`). */
export const LearningAuditLogRepository = {
  async create(input: NewLearningAuditLogInput, db: DbClient = getDb()): Promise<LearningAuditLogEntry> {
    const [row] = await db
      .insert(learningAuditLogs)
      .values({
        action: input.action,
        courseId: input.courseId,
        moduleId: input.moduleId ?? null,
        lessonId: input.lessonId ?? null,
        actorId: input.actorId,
        metadata: input.metadata ?? {},
      })
      .returning();
    return mapRowToEntry(row);
  },
};
