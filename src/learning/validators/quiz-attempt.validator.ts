import { z } from "zod";

const quizAnswerSchema = z.object({
  questionId: z.string().uuid(),
  selectedChoiceIndex: z.number().int().min(0),
});

/**
 * The Quiz Player's (Step 4.5) submission shape — raw answers, not a
 * pre-computed score. `NewQuizAttemptInput`'s original doc comment (Step
 * 4.1) explained why `scorePercent`/`passed` used to arrive pre-computed
 * ("grading is a later step's concern") and explicitly deferred grading
 * to the real quiz-taking UI; trusting a client-submitted score/pass
 * flag would let a student fabricate a passing result, so
 * `QuizAttemptService.submit` now grades server-side against the real
 * `QuizQuestion.correctChoiceIndex` values, which never reach the
 * client.
 */
export const submitQuizAttemptSchema = z.object({
  quizId: z.string().uuid(),
  studentId: z.string().uuid(),
  answers: z.array(quizAnswerSchema),
});
export type SubmitQuizAttemptInput = z.infer<typeof submitQuizAttemptSchema>;
