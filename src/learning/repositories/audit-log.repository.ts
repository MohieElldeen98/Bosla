import { and, desc, eq } from "drizzle-orm";
import { getDb, type DbClient } from "@/db";
import { learningAuditLogs } from "@/db/schema/learning";
import { auditSearchOrderBy, buildAuditSearchConditions, type AuditLogSearchFilters } from "@/db/audit-search";
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

  /** Read path for the admin User Details page's Activity tab (Phase 7)
   *  — "actions this user performed as an admin," newest first. The
   *  only reader; every other call site stays write-only. */
  async findByActorId(actorId: string, limit = 20): Promise<LearningAuditLogEntry[]> {
    const rows = await getDb()
      .select()
      .from(learningAuditLogs)
      .where(eq(learningAuditLogs.actorId, actorId))
      .orderBy(desc(learningAuditLogs.createdAt))
      .limit(limit);
    return rows.map(mapRowToEntry);
  },

  /** Read path for `AuditFeedService` — actor/action/free-text/date-range
   *  filtered, keyset-paginated via `filters.cursor`. */
  async search(filters: AuditLogSearchFilters): Promise<LearningAuditLogEntry[]> {
    const columns = {
      id: learningAuditLogs.id,
      actorId: learningAuditLogs.actorId,
      action: learningAuditLogs.action,
      createdAt: learningAuditLogs.createdAt,
    };
    const conditions = buildAuditSearchConditions(columns, filters);
    const rows = await getDb()
      .select()
      .from(learningAuditLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(...auditSearchOrderBy(columns))
      .limit(filters.limit);
    return rows.map(mapRowToEntry);
  },
};
