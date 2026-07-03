/** Mirrors `db/schema/learning.ts`'s `lesson_progress` table. */
export interface LessonProgress {
  id: string;
  studentId: string;
  lessonId: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewLessonProgressInput {
  studentId: string;
  lessonId: string;
  completedAt?: string | null;
}
