"use server";

import { CoursePlayerService } from "@/learning/services/course-player.service";
import { LessonProgressService } from "@/learning/services/lesson-progress.service";
import { SessionService } from "@/auth/services/session.service";
import type { Locale } from "@/i18n/routing";
import type { CoursePlayerData } from "@/learning/types/course-player";
import type { LessonProgress } from "@/learning/types/lesson-progress";
import type { LearningActionResult } from "@/learning/types/result";

/** Resolves the current session as the trust boundary, same reasoning as
 *  `getMyDashboardAction` — always passes the caller's *own* id as
 *  `studentId`; `courseSlug`/`lessonId` are the only user-controlled
 *  route params, and `CoursePlayerService` re-validates enrollment (and
 *  that `lessonId` actually belongs to that course) on every call, so a
 *  direct URL to someone else's course/lesson still resolves to
 *  forbidden/not_found here, not just in the UI. */
export async function getResumeLessonIdAction(
  courseSlug: string,
): Promise<LearningActionResult<{ lessonId: string } | null>> {
  const actingUser = await SessionService.getCurrentUser();
  if (!actingUser) {
    return { success: false, code: "forbidden", message: "You must be signed in." };
  }
  return CoursePlayerService.getResumeLessonId(actingUser, actingUser.id, courseSlug);
}

export async function getLessonPlayerDataAction(
  courseSlug: string,
  lessonId: string,
  locale: Locale,
): Promise<LearningActionResult<CoursePlayerData>> {
  const actingUser = await SessionService.getCurrentUser();
  if (!actingUser) {
    return { success: false, code: "forbidden", message: "You must be signed in." };
  }
  return CoursePlayerService.getLessonPlayerData(actingUser, actingUser.id, courseSlug, lessonId, locale);
}

/** Called once per lesson view, on the page's own render — "opening a
 *  lesson updates last activity." */
export async function recordLessonOpenedAction(lessonId: string): Promise<LearningActionResult<LessonProgress>> {
  const actingUser = await SessionService.getCurrentUser();
  if (!actingUser) {
    return { success: false, code: "forbidden", message: "You must be signed in." };
  }
  return LessonProgressService.recordOpened(actingUser, actingUser.id, lessonId);
}
