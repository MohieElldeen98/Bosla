import { CourseAuditLogRepository } from "@/courses/repositories/course-audit-log.repository";
import { LearningAuditLogRepository } from "@/learning/repositories/audit-log.repository";
import { CmsAuditLogRepository } from "@/cms/repositories/audit-log.repository";
import { CourseRepository } from "@/courses/repositories/course.repository";
import { QuizAttemptService } from "@/learning/services/quiz-attempt.service";
import { QuizRepository } from "@/learning/repositories/quiz.repository";
import { LessonRepository } from "@/learning/repositories/lesson.repository";
import { ModuleRepository } from "@/learning/repositories/module.repository";
import { canModifyProfile } from "@/auth/utils/can-modify-profile";
import { resolveLocalizedText } from "@/cms/utils/resolve-localized";
import { logger } from "@/lib/logger";
import type { Locale } from "@/i18n/routing";
import type { AuthUser } from "@/auth/types/session";
import type { ActivityFeedEntry, QuizAttemptSummaryItem, UserAdminActionResult } from "@/auth/types/user-admin";

async function safeRead<T>(operation: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    logger.error("[UserAdminService]", error);
    return fallback;
  }
}

const ACTIVITY_FEED_LIMIT = 20;

/**
 * Cross-domain composition for the admin User Details page (Phase 7) —
 * the Activity and Quiz Attempts tabs need data resolved across Course/
 * Learning/CMS, same "parallel repository reads + compose here, no
 * cross-domain SQL join" pattern `StudentDashboardService` already
 * established. Deliberately in the Auth domain (not Learning or Course):
 * the central entity here is "a user," not a course or an enrollment.
 * Authorization mirrors `ProfileService`'s student-owned-data convention
 * (`canModifyProfile` — self or admin/super_admin) since both tabs are,
 * at bottom, "this user's own history."
 */
export const UserAdminService = {
  /** Merges `course_audit_logs`/`learning_audit_logs`/`cms_audit_logs`
   *  entries where `actorId = targetUserId`, newest first. CMS entries
   *  don't reference a course, so `courseTitle` stays `null` for those —
   *  the UI falls back to the translated action label alone. */
  async getActivityFeed(
    actingUser: AuthUser,
    targetUserId: string,
    locale: Locale,
  ): Promise<UserAdminActionResult<ActivityFeedEntry[]>> {
    if (!canModifyProfile(actingUser, targetUserId)) {
      return { success: false, code: "forbidden", message: "You cannot view this user's activity." };
    }

    const [courseEntries, learningEntries, cmsEntries] = await Promise.all([
      safeRead(() => CourseAuditLogRepository.findByActorId(targetUserId, ACTIVITY_FEED_LIMIT), []),
      safeRead(() => LearningAuditLogRepository.findByActorId(targetUserId, ACTIVITY_FEED_LIMIT), []),
      safeRead(() => CmsAuditLogRepository.findByActorId(targetUserId, ACTIVITY_FEED_LIMIT), []),
    ]);

    const courseIds = [
      ...new Set([...courseEntries.map((e) => e.courseId), ...learningEntries.map((e) => e.courseId)]),
    ];
    const courses = await safeRead(() => CourseRepository.findByIds(courseIds), []);
    const courseTitleById = new Map(courses.map((course) => [course.id, resolveLocalizedText(course.title, locale)]));

    const entries: ActivityFeedEntry[] = [
      ...courseEntries.map((e) => ({
        id: e.id,
        domain: "course" as const,
        action: e.action,
        courseTitle: courseTitleById.get(e.courseId) ?? null,
        createdAt: e.createdAt,
        metadata: e.metadata,
      })),
      ...learningEntries.map((e) => ({
        id: e.id,
        domain: "learning" as const,
        action: e.action,
        courseTitle: courseTitleById.get(e.courseId) ?? null,
        createdAt: e.createdAt,
        metadata: e.metadata,
      })),
      ...cmsEntries.map((e) => ({
        id: e.id,
        domain: "cms" as const,
        action: e.action,
        courseTitle: null,
        createdAt: e.createdAt,
        metadata: e.metadata,
      })),
    ];

    entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return { success: true, data: entries.slice(0, ACTIVITY_FEED_LIMIT) };
  },

  /** Resolves each `QuizAttempt`'s course/lesson title — quiz attempts
   *  are rare today (no Curriculum Editor authoring real quizzes yet), so
   *  a per-attempt lookup (rather than a batch) is the right amount of
   *  complexity for a single user's detail view, not a list page. */
  async getQuizAttemptsSummary(
    actingUser: AuthUser,
    targetUserId: string,
    locale: Locale,
  ): Promise<UserAdminActionResult<QuizAttemptSummaryItem[]>> {
    const result = await QuizAttemptService.listForStudent(actingUser, targetUserId);
    if (!result.success) {
      return { success: false, code: "forbidden", message: result.message };
    }

    const items = await Promise.all(
      result.data.map(async (attempt): Promise<QuizAttemptSummaryItem | null> => {
        const quiz = await safeRead(() => QuizRepository.findById(attempt.quizId), null);
        if (!quiz) return null;
        const lesson = await safeRead(() => LessonRepository.findById(quiz.lessonId), null);
        if (!lesson) return null;
        const courseModule = await safeRead(() => ModuleRepository.findById(lesson.moduleId), null);
        if (!courseModule) return null;
        const course = await safeRead(() => CourseRepository.findById(courseModule.courseId), null);

        return {
          id: attempt.id,
          courseTitle: course ? resolveLocalizedText(course.title, locale) : "",
          lessonTitle: resolveLocalizedText(lesson.title, locale),
          scorePercent: attempt.scorePercent,
          passed: attempt.passed,
          submittedAt: attempt.submittedAt,
        };
      }),
    );

    return { success: true, data: items.filter((item): item is QuizAttemptSummaryItem => item !== null) };
  },
};
