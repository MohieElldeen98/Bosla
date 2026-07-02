import { getDb, type DbClient } from "@/db";
import { courseAuditLogs } from "@/db/schema/course";
import type { CourseAuditLogEntry, NewCourseAuditLogInput } from "@/courses/types/course-audit-log";

type CourseAuditLogRow = typeof courseAuditLogs.$inferSelect;

function mapRowToEntry(row: CourseAuditLogRow): CourseAuditLogEntry {
  return {
    id: row.id,
    action: row.action as CourseAuditLogEntry["action"],
    courseId: row.courseId,
    actorId: row.actorId,
    createdAt: row.createdAt.toISOString(),
    metadata: row.metadata as Record<string, unknown>,
  };
}

/** Data access for `course_audit_logs` — write-only, mirrors
 *  `CmsAuditLogRepository` exactly. Accepts an optional `DbClient` so a
 *  future transactional caller can make the insert atomic with the write
 *  it's auditing; every current call site is non-transactional and just
 *  omits it (see `recordCourseAuditLog`). */
export const CourseAuditLogRepository = {
  async create(input: NewCourseAuditLogInput, db: DbClient = getDb()): Promise<CourseAuditLogEntry> {
    const [row] = await db
      .insert(courseAuditLogs)
      .values({
        action: input.action,
        courseId: input.courseId,
        actorId: input.actorId,
        metadata: input.metadata ?? {},
      })
      .returning();
    return mapRowToEntry(row);
  },
};
