"use server";

import { SessionService } from "@/auth/services/session.service";
import { LessonService } from "@/learning/services/lesson.service";
import {
  createLessonSchema,
  updateLessonSchema,
  reorderLessonsSchema,
} from "@/learning/validators/lesson.validator";
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

/** The Curriculum Builder's own Server Actions (Phase 6, Step 6.4) —
 *  see `module.actions.ts`'s equivalents for the same reasoning. */
export async function createOwnLessonAction(rawInput: unknown): Promise<LearningActionResult<Lesson>> {
  const actingUser = await SessionService.getCurrentUser();
  if (!actingUser) {
    return { success: false, code: "forbidden", message: "You must be signed in." };
  }
  const parsed = createLessonSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      code: "validation_failed",
      message: parsed.error.issues.map((issue) => issue.message).join(" "),
    };
  }
  return LessonService.createOwn(actingUser, parsed.data);
}

export async function updateOwnLessonAction(
  id: string,
  rawInput: unknown,
  expectedUpdatedAt?: string,
): Promise<LearningActionResult<Lesson>> {
  const actingUser = await SessionService.getCurrentUser();
  if (!actingUser) {
    return { success: false, code: "forbidden", message: "You must be signed in." };
  }
  const parsed = updateLessonSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      code: "validation_failed",
      message: parsed.error.issues.map((issue) => issue.message).join(" "),
    };
  }
  return LessonService.updateOwn(actingUser, id, parsed.data, expectedUpdatedAt);
}

export async function deleteOwnLessonAction(id: string): Promise<LearningActionResult> {
  const actingUser = await SessionService.getCurrentUser();
  if (!actingUser) {
    return { success: false, code: "forbidden", message: "You must be signed in." };
  }
  return LessonService.deleteOwn(actingUser, id);
}

export async function reorderOwnLessonsAction(rawInput: unknown): Promise<LearningActionResult> {
  const actingUser = await SessionService.getCurrentUser();
  if (!actingUser) {
    return { success: false, code: "forbidden", message: "You must be signed in." };
  }
  const parsed = reorderLessonsSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      code: "validation_failed",
      message: parsed.error.issues.map((issue) => issue.message).join(" "),
    };
  }
  return LessonService.reorderOwn(actingUser, parsed.data.moduleId, parsed.data.lessonIds);
}
