/** Mirrors `db/schema/learning.ts`'s `quizzes` table. One-to-one with a
 *  `lessons` row (`type = "quiz"`). */
export interface Quiz {
  id: string;
  lessonId: string;
  passThresholdPercent: number;
  createdAt: string;
  updatedAt: string;
}

export interface NewQuizInput {
  lessonId: string;
  passThresholdPercent?: number;
}
