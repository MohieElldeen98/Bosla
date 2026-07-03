"use server";

import { LessonService } from "@/learning/services/lesson.service";
import { createLessonSchema, updateLessonSchema } from "@/learning/validators/lesson.validator";
import type { Lesson } from "@/learning/types/lesson";
import type { LearningActionResult } from "@/learning/types/result";

export async function createLessonAction(rawInput: unknown): Promise<LearningActionResult<Lesson>> {
  const parsed = createLessonSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      code: "validation_failed",
      message: parsed.error.issues.map((issue) => issue.message).join(" "),
    };
  }
  return LessonService.create(parsed.data);
}

export async function updateLessonAction(
  id: string,
  rawInput: unknown,
  expectedUpdatedAt?: string,
): Promise<LearningActionResult<Lesson>> {
  const parsed = updateLessonSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      code: "validation_failed",
      message: parsed.error.issues.map((issue) => issue.message).join(" "),
    };
  }
  return LessonService.update(id, parsed.data, expectedUpdatedAt);
}

export async function deleteLessonAction(id: string): Promise<LearningActionResult> {
  return LessonService.delete(id);
}
