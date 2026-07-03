import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { lessonProgress } from "@/db/schema/learning";
import type { LessonProgress } from "@/learning/types/lesson-progress";

type LessonProgressRow = typeof lessonProgress.$inferSelect;

function mapRowToLessonProgress(row: LessonProgressRow): LessonProgress {
  return {
    id: row.id,
    studentId: row.studentId,
    lessonId: row.lessonId,
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Data access for `lesson_progress`. `LessonProgressService` is the
 *  only caller. `setCompleted` is a real upsert (`onConflictDoUpdate`
 *  against the `(studentId, lessonId)` unique index) — a student marking
 *  the same lesson complete/incomplete repeatedly should update one row,
 *  not error on a duplicate key or require a separate find-then-branch
 *  in the service layer. */
export const LessonProgressRepository = {
  async setCompleted(studentId: string, lessonId: string, completed: boolean): Promise<LessonProgress> {
    const [row] = await getDb()
      .insert(lessonProgress)
      .values({
        studentId,
        lessonId,
        completedAt: completed ? new Date() : null,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [lessonProgress.studentId, lessonProgress.lessonId],
        set: { completedAt: completed ? new Date() : null, updatedAt: new Date() },
      })
      .returning();
    return mapRowToLessonProgress(row);
  },

  /** Upserts `updatedAt` — the "last activity" timestamp the Course
   *  Player (Step 4.4) records the moment a lesson is opened — without
   *  ever touching `completedAt` on an existing row. Deliberately
   *  separate from `setCompleted`: calling that with `completed: false`
   *  to record "opened" would silently un-complete an already-finished
   *  lesson just because the student revisited it to review. On a brand
   *  new row `completedAt` is `null` (opening a lesson never completes
   *  it); on conflict only `updatedAt` moves. */
  async recordOpened(studentId: string, lessonId: string): Promise<LessonProgress> {
    const [row] = await getDb()
      .insert(lessonProgress)
      .values({ studentId, lessonId, completedAt: null, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: [lessonProgress.studentId, lessonProgress.lessonId],
        set: { updatedAt: new Date() },
      })
      .returning();
    return mapRowToLessonProgress(row);
  },

  async findByStudentAndLesson(studentId: string, lessonId: string): Promise<LessonProgress | null> {
    const [row] = await getDb()
      .select()
      .from(lessonProgress)
      .where(and(eq(lessonProgress.studentId, studentId), eq(lessonProgress.lessonId, lessonId)))
      .limit(1);
    return row ? mapRowToLessonProgress(row) : null;
  },

  /** Batch lookup, scoped to a specific set of lessons (typically "every
   *  lesson in one course") — the Course Player's (Step 4.4) own data
   *  need, distinct from `findByStudentId`'s "everything this student
   *  has ever touched, across every course" (what the Student Dashboard,
   *  Step 4.3, needs instead). */
  async findByStudentAndLessonIds(studentId: string, lessonIds: string[]): Promise<LessonProgress[]> {
    if (lessonIds.length === 0) return [];
    const rows = await getDb()
      .select()
      .from(lessonProgress)
      .where(and(eq(lessonProgress.studentId, studentId), inArray(lessonProgress.lessonId, lessonIds)));
    return rows.map(mapRowToLessonProgress);
  },

  async findByStudentId(studentId: string): Promise<LessonProgress[]> {
    const rows = await getDb()
      .select()
      .from(lessonProgress)
      .where(eq(lessonProgress.studentId, studentId))
      .orderBy(desc(lessonProgress.updatedAt));
    return rows.map(mapRowToLessonProgress);
  },
};
