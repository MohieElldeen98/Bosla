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

/** `scorePercent`/`passed` are accepted as already-computed — grading a
 *  student's raw answers against `quiz_questions.correctChoiceIndex` is
 *  a Course Player concern (explicitly out of scope for this backend-only
 *  step), not something `QuizAttemptService.submit` does itself. */
export interface NewQuizAttemptInput {
  quizId: string;
  studentId: string;
  scorePercent: number;
  passed: boolean;
}
