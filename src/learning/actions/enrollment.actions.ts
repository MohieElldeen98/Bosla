"use server";

import { EnrollmentService } from "@/learning/services/enrollment.service";
import { SessionService } from "@/auth/services/session.service";
import { createEnrollmentSchema } from "@/learning/validators/enrollment.validator";
import type { Enrollment } from "@/learning/types/enrollment";
import type { LearningActionResult } from "@/learning/types/result";

export async function grantEnrollmentAction(rawInput: unknown): Promise<LearningActionResult<Enrollment>> {
  const parsed = createEnrollmentSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      code: "validation_failed",
      message: parsed.error.issues.map((issue) => issue.message).join(" "),
    };
  }
  return EnrollmentService.grant(parsed.data);
}

export async function revokeEnrollmentAction(id: string): Promise<LearningActionResult> {
  return EnrollmentService.revoke(id);
}

/** Resolves the current session itself (rather than taking `actingUser`
 *  as a parameter) since a Server Action is the trust boundary — the
 *  caller can't be handed an `actingUser` to pass in without defeating
 *  the point. Mirrors how every other action in this codebase that needs
 *  "who's calling this" resolves it the same way, just internally inside
 *  the *service* for admin-only domains (Course/CMS) versus here, where
 *  `EnrollmentService.listForStudent` needs the *action* to resolve it
 *  once and pass it through, since the same method also needs to accept
 *  a caller acting on someone else's behalf (an Admin). */
export async function listMyEnrollmentsAction(
  studentId: string,
): Promise<LearningActionResult<Enrollment[]>> {
  const actingUser = await SessionService.getCurrentUser();
  if (!actingUser) {
    return { success: false, code: "forbidden", message: "You must be signed in." };
  }
  return EnrollmentService.listForStudent(actingUser, studentId);
}

export async function listCourseEnrollmentsAction(
  courseId: string,
): Promise<LearningActionResult<Enrollment[]>> {
  return EnrollmentService.listForCourse(courseId);
}
