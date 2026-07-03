"use server";

import { StudentDashboardService } from "@/learning/services/student-dashboard.service";
import { SessionService } from "@/auth/services/session.service";
import type { Locale } from "@/i18n/routing";
import type { StudentDashboardData } from "@/learning/types/student-dashboard";
import type { LearningActionResult } from "@/learning/types/result";

/** Resolves the current session itself, same reasoning as
 *  `listMyEnrollmentsAction`/`listMyLessonProgressAction` — a Server
 *  Action is the trust boundary, and `StudentDashboardService.getDashboard`
 *  needs an explicit `actingUser` (it also has to accept an Admin acting
 *  on a student's behalf, a case a purely-internal session lookup
 *  couldn't support). Always passes the caller's *own* id as
 *  `studentId` — `/dashboard` has no route param for "whose dashboard,"
 *  so there is no user-controlled input that could ever select someone
 *  else's data. */
export async function getMyDashboardAction(locale: Locale): Promise<LearningActionResult<StudentDashboardData>> {
  const actingUser = await SessionService.getCurrentUser();
  if (!actingUser) {
    return { success: false, code: "forbidden", message: "You must be signed in." };
  }
  return StudentDashboardService.getDashboard(actingUser, actingUser.id, locale);
}
