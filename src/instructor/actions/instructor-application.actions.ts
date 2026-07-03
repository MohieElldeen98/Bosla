"use server";

import { SessionService } from "@/auth/services/session.service";
import { InstructorApplicationService } from "@/instructor/services/instructor-application.service";
import { applyForInstructorSchema } from "@/instructor/validators/instructor-application.validator";
import type { InstructorProfile } from "@/instructor/types/instructor-profile";
import type { InstructorActionResult } from "@/instructor/types/result";

/** Resolves the current session itself, same reasoning as
 *  `getMyDashboardAction` — a Server Action is the trust boundary, and
 *  both of these are always about the caller's *own* application; there
 *  is no route param for "whose application," so there's no
 *  user-controlled input that could ever select someone else's. */
export async function getMyInstructorApplicationAction(): Promise<InstructorActionResult<InstructorProfile | null>> {
  const actingUser = await SessionService.getCurrentUser();
  if (!actingUser) {
    return { success: false, code: "forbidden", message: "You must be signed in." };
  }
  const application = await InstructorApplicationService.getMyApplication(actingUser);
  return { success: true, data: application };
}

export async function applyForInstructorAction(rawInput: unknown): Promise<InstructorActionResult<InstructorProfile>> {
  const actingUser = await SessionService.getCurrentUser();
  if (!actingUser) {
    return { success: false, code: "forbidden", message: "You must be signed in." };
  }
  const parsed = applyForInstructorSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      code: "validation_failed",
      message: parsed.error.issues.map((issue) => issue.message).join(" "),
    };
  }
  return InstructorApplicationService.apply(actingUser, parsed.data);
}

export async function approveInstructorApplicationAction(
  id: string,
  expectedUpdatedAt?: string,
): Promise<InstructorActionResult<InstructorProfile>> {
  const actingUser = await SessionService.getCurrentUser();
  if (!actingUser) {
    return { success: false, code: "forbidden", message: "You must be signed in." };
  }
  return InstructorApplicationService.approve(actingUser, id, expectedUpdatedAt);
}

export async function rejectInstructorApplicationAction(
  id: string,
  expectedUpdatedAt?: string,
): Promise<InstructorActionResult<InstructorProfile>> {
  const actingUser = await SessionService.getCurrentUser();
  if (!actingUser) {
    return { success: false, code: "forbidden", message: "You must be signed in." };
  }
  return InstructorApplicationService.reject(actingUser, id, expectedUpdatedAt);
}
