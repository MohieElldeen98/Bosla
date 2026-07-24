import { and, asc, desc, eq, exists, ilike, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { timestampMatches } from "@/db/optimistic-concurrency";
import { enrollments } from "@/db/schema/learning";
import { courses } from "@/db/schema/course";
import { profiles } from "@/db/schema/profiles";
import type { Enrollment, NewEnrollmentInput } from "@/learning/types/enrollment";
import type { EnrollmentStatus } from "@/learning/types/enrollment-status";
import type { OptimisticUpdateResult } from "@/learning/types/repository-result";
import {
  DEFAULT_ENROLLMENT_PAGE_SIZE,
  DEFAULT_ENROLLMENT_SORT_DIRECTION,
  DEFAULT_ENROLLMENT_SORT_FIELD,
  type EnrollmentSearchFilters,
  type EnrollmentSearchResult,
} from "@/learning/types/enrollment-search";

type EnrollmentRow = typeof enrollments.$inferSelect;

const SORT_COLUMNS = {
  createdAt: enrollments.createdAt,
  updatedAt: enrollments.updatedAt,
} as const;

function mapRowToEnrollment(row: EnrollmentRow): Enrollment {
  return {
    id: row.id,
    studentId: row.studentId,
    courseId: row.courseId,
    source: row.source,
    status: row.status,
    grantedByUserId: row.grantedByUserId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Data access for `enrollments`. `EnrollmentService` is the only
 *  caller. No `update` for `source`/`grantedByUserId` — those don't
 *  change after the fact; correcting a mistaken grant is `delete` + a
 *  fresh `create`, not an edit. `status`, added Step 4.2, is the one
 *  mutable field, changed only via `updateStatus` (Revoke/Restore). */
export const EnrollmentRepository = {
  async create(input: NewEnrollmentInput): Promise<Enrollment> {
    const [row] = await getDb()
      .insert(enrollments)
      .values({
        studentId: input.studentId,
        courseId: input.courseId,
        source: input.source,
        grantedByUserId: input.grantedByUserId ?? null,
        updatedAt: new Date(),
      })
      .returning();
    return mapRowToEnrollment(row);
  },

  async findById(id: string): Promise<Enrollment | null> {
    const [row] = await getDb().select().from(enrollments).where(eq(enrollments.id, id)).limit(1);
    return row ? mapRowToEnrollment(row) : null;
  },

  async findByStudentAndCourse(studentId: string, courseId: string): Promise<Enrollment | null> {
    const [row] = await getDb()
      .select()
      .from(enrollments)
      .where(and(eq(enrollments.studentId, studentId), eq(enrollments.courseId, courseId)))
      .limit(1);
    return row ? mapRowToEnrollment(row) : null;
  },

  /** Newest first — the Student Dashboard (Step 4.3) shows recent
   *  enrollments first. `status`, when given, narrows to just
   *  `"active"` — the Dashboard's own requirement ("only active
   *  enrollments are visible"), applied server-side so a revoked
   *  enrollment is never even fetched, not just filtered out in the UI. */
  async findByStudentId(studentId: string, status?: EnrollmentStatus): Promise<Enrollment[]> {
    const conditions = [eq(enrollments.studentId, studentId)];
    if (status) conditions.push(eq(enrollments.status, status));
    const rows = await getDb()
      .select()
      .from(enrollments)
      .where(and(...conditions))
      .orderBy(desc(enrollments.createdAt));
    return rows.map(mapRowToEnrollment);
  },

  async findByCourseId(courseId: string): Promise<Enrollment[]> {
    const rows = await getDb()
      .select()
      .from(enrollments)
      .where(eq(enrollments.courseId, courseId))
      .orderBy(desc(enrollments.createdAt));
    return rows.map(mapRowToEnrollment);
  },

  /** Server-side pagination/search/filter/sort for the admin Enrollment
   *  Management listing (Step 4.2) — mirrors `CourseRepository.search`'s
   *  shape exactly. `query` matches student name/email or course title
   *  via `EXISTS` subqueries against `profiles`/`courses` (no
   *  cross-domain SQL join — the same composed-in-the-repository
   *  technique `CourseRepository.search`'s `onlyActive` filter already
   *  established, just for free text instead of an active-flag check).
   *  Runs the page query and the total count in parallel against the
   *  same `WHERE` clause. */
  async search(filters: EnrollmentSearchFilters): Promise<EnrollmentSearchResult<Enrollment>> {
    const conditions: SQL[] = [];

    if (filters.query) {
      const pattern = `%${filters.query}%`;
      conditions.push(
        or(
          exists(
            getDb()
              .select({ one: sql`1` })
              .from(profiles)
              .where(
                and(
                  eq(profiles.userId, enrollments.studentId),
                  or(
                    ilike(profiles.fullName, pattern),
                    ilike(profiles.displayName, pattern),
                    ilike(profiles.email, pattern),
                  ),
                ),
              ),
          ),
          exists(
            getDb()
              .select({ one: sql`1` })
              .from(courses)
              .where(
                and(
                  eq(courses.id, enrollments.courseId),
                  or(
                    ilike(sql`${courses.title}->>'en'`, pattern),
                    ilike(sql`${courses.title}->>'ar'`, pattern),
                  ),
                ),
              ),
          ),
        ) as SQL,
      );
    }
    if (filters.studentId) conditions.push(eq(enrollments.studentId, filters.studentId));
    if (filters.courseId) conditions.push(eq(enrollments.courseId, filters.courseId));
    if (filters.status) conditions.push(eq(enrollments.status, filters.status));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const sortColumn = SORT_COLUMNS[filters.sortBy ?? DEFAULT_ENROLLMENT_SORT_FIELD];
    const orderFn = (filters.sortDirection ?? DEFAULT_ENROLLMENT_SORT_DIRECTION) === "asc" ? asc : desc;
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = filters.pageSize ?? DEFAULT_ENROLLMENT_PAGE_SIZE;

    const [rows, countRows] = await Promise.all([
      getDb()
        .select()
        .from(enrollments)
        .where(whereClause)
        .orderBy(orderFn(sortColumn))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      getDb()
        .select({ count: sql<number>`count(*)::int` })
        .from(enrollments)
        .where(whereClause),
    ]);
    const total = countRows[0]?.count ?? 0;

    return {
      items: rows.map(mapRowToEnrollment),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  },

  /** `expectedUpdatedAt`, when given, enforces optimistic concurrency via
   *  `timestampMatches` — see its doc comment for why a plain equality
   *  check on `updatedAt` isn't safe. Only `status` is mutable here
   *  (Revoke ⇄ Restore). */
  async updateStatus(
    id: string,
    status: EnrollmentStatus,
    expectedUpdatedAt?: string,
  ): Promise<OptimisticUpdateResult<Enrollment>> {
    const conditions = [eq(enrollments.id, id)];
    if (expectedUpdatedAt) conditions.push(timestampMatches(enrollments.updatedAt, expectedUpdatedAt));

    const [row] = await getDb()
      .update(enrollments)
      .set({ status, updatedAt: new Date() })
      .where(and(...conditions))
      .returning();

    if (row) return { status: "ok", data: mapRowToEnrollment(row) };
    if (!expectedUpdatedAt) return { status: "not_found" };

    const stillExists = await EnrollmentRepository.findById(id);
    return stillExists ? { status: "conflict" } : { status: "not_found" };
  },

  /** Hard delete — not used by `EnrollmentService.revoke` (Step 4.2 made
   *  that a soft `status` flip, see `updateStatus`); kept as a low-level
   *  primitive for a future data-retention/cleanup need, not exposed to
   *  any admin action today. */
  async delete(id: string): Promise<void> {
    await getDb().delete(enrollments).where(eq(enrollments.id, id));
  },
};
