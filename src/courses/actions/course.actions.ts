"use server";

import { SessionService } from "@/auth/services/session.service";
import { CourseService } from "@/courses/services/course.service";
import { createCourseSchema, updateCourseSchema } from "@/courses/validators/course.validator";
import type { Course } from "@/courses/types/course";
import type { CourseActionResult } from "@/courses/types/result";

export async function createCourseAction(rawInput: unknown): Promise<CourseActionResult<Course>> {
  const parsed = createCourseSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      code: "validation_failed",
      message: parsed.error.issues.map((issue) => issue.message).join(" "),
    };
  }
  return CourseService.create(parsed.data);
}

export async function updateCourseAction(
  id: string,
  rawInput: unknown,
  expectedUpdatedAt?: string,
): Promise<CourseActionResult<Course>> {
  const parsed = updateCourseSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      code: "validation_failed",
      message: parsed.error.issues.map((issue) => issue.message).join(" "),
    };
  }
  return CourseService.update(id, parsed.data, expectedUpdatedAt);
}

export async function deleteCourseAction(id: string): Promise<CourseActionResult> {
  return CourseService.delete(id);
}

export async function archiveCourseAction(id: string): Promise<CourseActionResult<Course>> {
  return CourseService.archive(id);
}

export async function restoreCourseAction(id: string): Promise<CourseActionResult<Course>> {
  return CourseService.restore(id);
}

export async function attachSeoMetaAction(id: string): Promise<CourseActionResult<Course>> {
  return CourseService.attachSeoMeta(id);
}

/** The course state machine's Server Actions (Phase 6, Step 6.2) —
 *  `submitForReview` resolves the session itself (same reasoning as
 *  Step 6.1's `applyForInstructorAction`): `CourseService.submitForReview`
 *  needs an explicit `actingUser` to check course ownership, which a
 *  purely internal session lookup inside the service couldn't support. */
export async function submitCourseForReviewAction(
  id: string,
  expectedUpdatedAt?: string,
): Promise<CourseActionResult<Course>> {
  const actingUser = await SessionService.getCurrentUser();
  if (!actingUser) {
    return { success: false, code: "forbidden", message: "You must be signed in." };
  }
  return CourseService.submitForReview(actingUser, id, expectedUpdatedAt);
}

export async function approveCourseAction(
  id: string,
  expectedUpdatedAt?: string,
): Promise<CourseActionResult<Course>> {
  const actingUser = await SessionService.getCurrentUser();
  if (!actingUser) {
    return { success: false, code: "forbidden", message: "You must be signed in." };
  }
  return CourseService.approve(actingUser, id, expectedUpdatedAt);
}

export async function rejectCourseAction(
  id: string,
  expectedUpdatedAt?: string,
): Promise<CourseActionResult<Course>> {
  const actingUser = await SessionService.getCurrentUser();
  if (!actingUser) {
    return { success: false, code: "forbidden", message: "You must be signed in." };
  }
  return CourseService.reject(actingUser, id, expectedUpdatedAt);
}

/** The Instructor Panel's own course management Server Actions (Phase 6,
 *  Step 6.3) — every one resolves the session itself, same reasoning as
 *  the state machine actions above: `CourseService`'s instructor-scoped
 *  methods need an explicit `actingUser` to enforce ownership, which a
 *  purely internal session lookup couldn't support. `searchResolvedForInstructor`
 *  has no Server Action wrapper — `/instructor/courses` is a Server
 *  Component that calls it directly, the same way `/admin/courses`
 *  calls `CourseService.searchResolved` directly, no action needed. */
export async function createOwnCourseAction(rawInput: unknown): Promise<CourseActionResult<Course>> {
  const actingUser = await SessionService.getCurrentUser();
  if (!actingUser) {
    return { success: false, code: "forbidden", message: "You must be signed in." };
  }
  const parsed = createCourseSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      code: "validation_failed",
      message: parsed.error.issues.map((issue) => issue.message).join(" "),
    };
  }
  return CourseService.createOwn(actingUser, parsed.data);
}

export async function updateOwnCourseAction(
  id: string,
  rawInput: unknown,
  expectedUpdatedAt?: string,
): Promise<CourseActionResult<Course>> {
  const actingUser = await SessionService.getCurrentUser();
  if (!actingUser) {
    return { success: false, code: "forbidden", message: "You must be signed in." };
  }
  const parsed = updateCourseSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      code: "validation_failed",
      message: parsed.error.issues.map((issue) => issue.message).join(" "),
    };
  }
  return CourseService.updateOwn(actingUser, id, parsed.data, expectedUpdatedAt);
}
