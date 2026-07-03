import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { enrollments } from "@/db/schema/learning";
import type { Enrollment, NewEnrollmentInput } from "@/learning/types/enrollment";

type EnrollmentRow = typeof enrollments.$inferSelect;

function mapRowToEnrollment(row: EnrollmentRow): Enrollment {
  return {
    id: row.id,
    studentId: row.studentId,
    courseId: row.courseId,
    source: row.source,
    grantedByUserId: row.grantedByUserId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Data access for `enrollments`. `EnrollmentService` is the only
 *  caller. No `update` method — a grant's `source`/`grantedByUserId`
 *  don't change after the fact; correcting a mistaken grant is a
 *  `delete` + fresh `create`, not an edit. */
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

  /** Newest first — a Student Dashboard (later phase) would show recent
   *  enrollments first. */
  async findByStudentId(studentId: string): Promise<Enrollment[]> {
    const rows = await getDb()
      .select()
      .from(enrollments)
      .where(eq(enrollments.studentId, studentId))
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

  async delete(id: string): Promise<void> {
    await getDb().delete(enrollments).where(eq(enrollments.id, id));
  },
};
