"use server";

import { SessionService } from "@/auth/services/session.service";
import { LessonAttachmentService } from "@/learning/services/lesson-attachment.service";
import {
  createLessonAttachmentSchema,
  updateLessonAttachmentSchema,
} from "@/learning/validators/lesson-attachment.validator";
import type { LearningActionResult } from "@/learning/types/result";
import type { LessonAttachment } from "@/learning/types/lesson-attachment";

export async function createOwnLessonAttachmentAction(
  rawInput: unknown,
): Promise<LearningActionResult<LessonAttachment>> {
  const actingUser = await SessionService.getCurrentUser();
  if (!actingUser) {
    return { success: false, code: "forbidden", message: "You must be signed in." };
  }
  const parsed = createLessonAttachmentSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      code: "validation_failed",
      message: parsed.error.issues.map((issue) => issue.message).join(" "),
    };
  }
  return LessonAttachmentService.createOwn(actingUser, parsed.data);
}

export async function updateOwnLessonAttachmentAction(
  id: string,
  rawInput: unknown,
): Promise<LearningActionResult<LessonAttachment>> {
  const actingUser = await SessionService.getCurrentUser();
  if (!actingUser) {
    return { success: false, code: "forbidden", message: "You must be signed in." };
  }
  const parsed = updateLessonAttachmentSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      code: "validation_failed",
      message: parsed.error.issues.map((issue) => issue.message).join(" "),
    };
  }
  return LessonAttachmentService.updateOwn(actingUser, id, parsed.data);
}

export async function deleteOwnLessonAttachmentAction(id: string): Promise<LearningActionResult> {
  const actingUser = await SessionService.getCurrentUser();
  if (!actingUser) {
    return { success: false, code: "forbidden", message: "You must be signed in." };
  }
  return LessonAttachmentService.deleteOwn(actingUser, id);
}

/** Admin counterparts — the service itself gates via
 *  `requireCourseManagementAccess`, same as lesson.actions' admin trio. */
export async function createLessonAttachmentAction(
  rawInput: unknown,
): Promise<LearningActionResult<LessonAttachment>> {
  const parsed = createLessonAttachmentSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      code: "validation_failed",
      message: parsed.error.issues.map((issue) => issue.message).join(" "),
    };
  }
  return LessonAttachmentService.create(parsed.data);
}

export async function deleteLessonAttachmentAction(id: string): Promise<LearningActionResult> {
  return LessonAttachmentService.delete(id);
}

/** Authoring read for the lesson form (instructor or admin) — the
 *  PLAYER never calls this; its attachments arrive inside
 *  `getLessonPlayerDataAction`'s already-gated payload. */
export async function listLessonAttachmentsAction(lessonId: string): Promise<LessonAttachment[]> {
  const actingUser = await SessionService.getCurrentUser();
  if (!actingUser) return [];
  return LessonAttachmentService.listByLessonId(lessonId);
}
