"use server";

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
