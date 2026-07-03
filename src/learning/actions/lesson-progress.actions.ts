"use server";

import { LessonProgressService } from "@/learning/services/lesson-progress.service";
import { SessionService } from "@/auth/services/session.service";
import { setLessonProgressSchema } from "@/learning/validators/lesson-progress.validator";
import type { LessonProgress } from "@/learning/types/lesson-progress";
import type { LearningActionResult } from "@/learning/types/result";

export async function setLessonProgressAction(
  rawInput: unknown,
): Promise<LearningActionResult<LessonProgress>> {
  const actingUser = await SessionService.getCurrentUser();
  if (!actingUser) {
    return { success: false, code: "forbidden", message: "You must be signed in." };
  }
  const parsed = setLessonProgressSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      code: "validation_failed",
      message: parsed.error.issues.map((issue) => issue.message).join(" "),
    };
  }
  return LessonProgressService.setCompleted(actingUser, parsed.data);
}

export async function listMyLessonProgressAction(
  studentId: string,
): Promise<LearningActionResult<LessonProgress[]>> {
  const actingUser = await SessionService.getCurrentUser();
  if (!actingUser) {
    return { success: false, code: "forbidden", message: "You must be signed in." };
  }
  return LessonProgressService.listForStudent(actingUser, studentId);
}
