"use server";

import { SessionService } from "@/auth/services/session.service";
import { EnrollmentService } from "@/learning/services/enrollment.service";

export async function getPublicEnrollmentStateAction(courseId: string) {
  const user = await SessionService.getCurrentUser();
  if (!user) return { enrolled: false, completed: 0, total: 0 };
  return EnrollmentService.getPublicProgress(user.id, courseId);
}
