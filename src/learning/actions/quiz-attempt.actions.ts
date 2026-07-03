"use server";

import { QuizAttemptService } from "@/learning/services/quiz-attempt.service";
import { SessionService } from "@/auth/services/session.service";
import { submitQuizAttemptSchema } from "@/learning/validators/quiz-attempt.validator";
import type { QuizAttempt } from "@/learning/types/quiz-attempt";
import type { LearningActionResult } from "@/learning/types/result";

export async function submitQuizAttemptAction(
  rawInput: unknown,
): Promise<LearningActionResult<QuizAttempt>> {
  const actingUser = await SessionService.getCurrentUser();
  if (!actingUser) {
    return { success: false, code: "forbidden", message: "You must be signed in." };
  }
  const parsed = submitQuizAttemptSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      code: "validation_failed",
      message: parsed.error.issues.map((issue) => issue.message).join(" "),
    };
  }
  return QuizAttemptService.submit(actingUser, parsed.data);
}

export async function listMyQuizAttemptsAction(
  studentId: string,
  quizId: string,
): Promise<LearningActionResult<QuizAttempt[]>> {
  const actingUser = await SessionService.getCurrentUser();
  if (!actingUser) {
    return { success: false, code: "forbidden", message: "You must be signed in." };
  }
  return QuizAttemptService.listForStudentAndQuiz(actingUser, studentId, quizId);
}
