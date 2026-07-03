"use server";

import { SessionService } from "@/auth/services/session.service";
import { CourseInstructorService } from "@/courses/services/instructor.service";
import {
  createInstructorSchema,
  updateInstructorSchema,
  updateOwnInstructorSchema,
} from "@/courses/validators/instructor.validator";
import type { CourseActionResult } from "@/courses/types/result";
import type { Instructor } from "@/courses/types/instructor";

export async function createInstructorAction(rawInput: unknown): Promise<CourseActionResult<Instructor>> {
  const parsed = createInstructorSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      code: "validation_failed",
      message: parsed.error.issues.map((issue) => issue.message).join(" "),
    };
  }
  return CourseInstructorService.create(parsed.data);
}

export async function updateInstructorAction(
  id: string,
  rawInput: unknown,
): Promise<CourseActionResult<Instructor>> {
  const parsed = updateInstructorSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      code: "validation_failed",
      message: parsed.error.issues.map((issue) => issue.message).join(" "),
    };
  }
  return CourseInstructorService.update(id, parsed.data);
}

export async function deleteInstructorAction(id: string): Promise<CourseActionResult> {
  return CourseInstructorService.delete(id);
}

/** The Instructor Profile editor's own Server Action (Phase 6, Step
 *  6.6) — same "resolve the session here" reasoning as every other
 *  `*Own` action in this codebase. */
export async function updateOwnInstructorAction(
  rawInput: unknown,
  expectedUpdatedAt?: string,
): Promise<CourseActionResult<Instructor>> {
  const actingUser = await SessionService.getCurrentUser();
  if (!actingUser) {
    return { success: false, code: "forbidden", message: "You must be signed in." };
  }
  const parsed = updateOwnInstructorSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      code: "validation_failed",
      message: parsed.error.issues.map((issue) => issue.message).join(" "),
    };
  }
  return CourseInstructorService.updateOwn(actingUser, parsed.data, expectedUpdatedAt);
}
