import { and, desc, eq } from "drizzle-orm";
import { getDb, type DbClient } from "@/db";
import { courseAuditLogs } from "@/db/schema/course";
import { auditSearchOrderBy, buildAuditSearchConditions, type AuditLogSearchFilters } from "@/db/audit-search";
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

  /** Read path for the admin User Details page's Activity tab (Phase 7)
   *  — "actions this user performed as an admin," newest first. The
   *  only reader; every other call site stays write-only. */
  async findByActorId(actorId: string, limit = 20): Promise<CourseAuditLogEntry[]> {
    const rows = await getDb()
      .select()
      .from(courseAuditLogs)
      .where(eq(courseAuditLogs.actorId, actorId))
      .orderBy(desc(courseAuditLogs.createdAt))
      .limit(limit);
    return rows.map(mapRowToEntry);
  },

  /** Read path for `AuditFeedService` — actor/action/free-text/date-range
   *  filtered, keyset-paginated via `filters.cursor`. */
  async search(filters: AuditLogSearchFilters): Promise<CourseAuditLogEntry[]> {
    const columns = {
      id: courseAuditLogs.id,
      actorId: courseAuditLogs.actorId,
      action: courseAuditLogs.action,
      createdAt: courseAuditLogs.createdAt,
    };
    const conditions = buildAuditSearchConditions(columns, filters);
    const rows = await getDb()
      .select()
      .from(courseAuditLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(...auditSearchOrderBy(columns))
      .limit(filters.limit);
    return rows.map(mapRowToEntry);
  },
};
