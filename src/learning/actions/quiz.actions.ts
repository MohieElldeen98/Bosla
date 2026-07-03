"use server";

import { SessionService } from "@/auth/services/session.service";
import { QuizService } from "@/learning/services/quiz.service";
import { createQuizSchema, updateQuizSchema } from "@/learning/validators/quiz.validator";
import type { Quiz } from "@/learning/types/quiz";
import type { LearningActionResult } from "@/learning/types/result";

export async function createQuizAction(rawInput: unknown): Promise<LearningActionResult<Quiz>> {
  const parsed = createQuizSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      code: "validation_failed",
      message: parsed.error.issues.map((issue) => issue.message).join(" "),
    };
  }
  return QuizService.create(parsed.data);
}

export async function updateQuizAction(
  id: string,
  rawInput: unknown,
  expectedUpdatedAt?: string,
): Promise<LearningActionResult<Quiz>> {
  const parsed = updateQuizSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      code: "validation_failed",
      message: parsed.error.issues.map((issue) => issue.message).join(" "),
    };
  }
  return QuizService.update(id, parsed.data, expectedUpdatedAt);
}

export async function deleteQuizAction(id: string): Promise<LearningActionResult> {
  return QuizService.delete(id);
}

/** The Quiz Editor's own Server Action (Phase 6, Step 6.5) — same
 *  "resolve the session here, `QuizService.updateOwn` needs an explicit
 *  `actingUser`" reasoning as Step 6.4's `updateOwnModuleAction`. */
export async function updateOwnQuizAction(
  id: string,
  rawInput: unknown,
  expectedUpdatedAt?: string,
): Promise<LearningActionResult<Quiz>> {
  const actingUser = await SessionService.getCurrentUser();
  if (!actingUser) {
    return { success: false, code: "forbidden", message: "You must be signed in." };
  }
  const parsed = updateQuizSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      code: "validation_failed",
      message: parsed.error.issues.map((issue) => issue.message).join(" "),
    };
  }
  return QuizService.updateOwn(actingUser, id, parsed.data, expectedUpdatedAt);
}
