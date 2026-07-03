"use server";

import { SessionService } from "@/auth/services/session.service";
import { QuizQuestionService } from "@/learning/services/quiz-question.service";
import {
  createQuizQuestionSchema,
  updateQuizQuestionSchema,
  reorderQuizQuestionsSchema,
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

/** The Quiz Editor's own Server Actions (Phase 6, Step 6.5) — each
 *  resolves the session itself, same reasoning as Step 6.4's
 *  `createOwnModuleAction`/`createOwnLessonAction`. */
export async function createOwnQuizQuestionAction(
  rawInput: unknown,
): Promise<LearningActionResult<QuizQuestion>> {
  const actingUser = await SessionService.getCurrentUser();
  if (!actingUser) {
    return { success: false, code: "forbidden", message: "You must be signed in." };
  }
  const parsed = createQuizQuestionSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      code: "validation_failed",
      message: parsed.error.issues.map((issue) => issue.message).join(" "),
    };
  }
  return QuizQuestionService.createOwn(actingUser, parsed.data);
}

export async function updateOwnQuizQuestionAction(
  id: string,
  rawInput: unknown,
  expectedUpdatedAt?: string,
): Promise<LearningActionResult<QuizQuestion>> {
  const actingUser = await SessionService.getCurrentUser();
  if (!actingUser) {
    return { success: false, code: "forbidden", message: "You must be signed in." };
  }
  const parsed = updateQuizQuestionSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      code: "validation_failed",
      message: parsed.error.issues.map((issue) => issue.message).join(" "),
    };
  }
  return QuizQuestionService.updateOwn(actingUser, id, parsed.data, expectedUpdatedAt);
}

export async function deleteOwnQuizQuestionAction(id: string): Promise<LearningActionResult> {
  const actingUser = await SessionService.getCurrentUser();
  if (!actingUser) {
    return { success: false, code: "forbidden", message: "You must be signed in." };
  }
  return QuizQuestionService.deleteOwn(actingUser, id);
}

export async function reorderOwnQuizQuestionsAction(rawInput: unknown): Promise<LearningActionResult> {
  const actingUser = await SessionService.getCurrentUser();
  if (!actingUser) {
    return { success: false, code: "forbidden", message: "You must be signed in." };
  }
  const parsed = reorderQuizQuestionsSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      code: "validation_failed",
      message: parsed.error.issues.map((issue) => issue.message).join(" "),
    };
  }
  return QuizQuestionService.reorderOwn(actingUser, parsed.data.quizId, parsed.data.questionIds);
}
