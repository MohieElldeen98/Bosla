import { z } from "zod";

/** `scorePercent`/`passed` arrive pre-computed — see
 *  `NewQuizAttemptInput`'s doc comment for why grading isn't this
 *  step's concern. */
export const submitQuizAttemptSchema = z.object({
  quizId: z.string().uuid(),
  studentId: z.string().uuid(),
  scorePercent: z.number().int().min(0).max(100),
  passed: z.boolean(),
});
export type SubmitQuizAttemptInput = z.infer<typeof submitQuizAttemptSchema>;
