"use server";

import { QuizQuestionService } from "@/learning/services/quiz-question.service";
import {
  createQuizQuestionSchema,
  updateQuizQuestionSchema,
} from "@/learning/validators/quiz-question.validator";
import type { QuizQuestion } from "@/learning/types/quiz-question";
import type { LearningActionResult } from "@/learning/types/result";

export async function createQuizQuestionAction(
  rawInput: unknown,
): Promise<LearningActionResult<QuizQuestion>> {
  const parsed = createQuizQuestionSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      code: "validation_failed",
      message: parsed.error.issues.map((issue) => issue.message).join(" "),
    };
  }
  return QuizQuestionService.create(parsed.data);
}

export async function updateQuizQuestionAction(
  id: string,
  rawInput: unknown,
  expectedUpdatedAt?: string,
): Promise<LearningActionResult<QuizQuestion>> {
  const parsed = updateQuizQuestionSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      code: "validation_failed",
      message: parsed.error.issues.map((issue) => issue.message).join(" "),
    };
  }
  return QuizQuestionService.update(id, parsed.data, expectedUpdatedAt);
}

export async function deleteQuizQuestionAction(id: string): Promise<LearningActionResult> {
  return QuizQuestionService.delete(id);
}
