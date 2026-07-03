import { and, desc, eq } from "drizzle-orm";
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

  async findByStudentAndLesson(studentId: string, lessonId: string): Promise<LessonProgress | null> {
    const [row] = await getDb()
      .select()
      .from(lessonProgress)
      .where(and(eq(lessonProgress.studentId, studentId), eq(lessonProgress.lessonId, lessonId)))
      .limit(1);
    return row ? mapRowToLessonProgress(row) : null;
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
