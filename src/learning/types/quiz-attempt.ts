/** Mirrors `db/schema/learning.ts`'s `quiz_attempts` table. Multiple
 *  attempts per student per quiz are allowed (retakes). */
export interface QuizAttempt {
  id: string;
  quizId: string;
  studentId: string;
  scorePercent: number;
  passed: boolean;
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
}

/** Repository-level shape — `scorePercent`/`passed` arrive already
 *  computed, because grading happens one layer up
 *  (`QuizAttemptService.submit`, Step 4.5, against the real
 *  `quiz_questions.correctChoiceIndex` values) before this ever gets
 *  called. The repository stores the result; it doesn't grade. */
export interface NewQuizAttemptInput {
  quizId: string;
  studentId: string;
  scorePercent: number;
  passed: boolean;
}
