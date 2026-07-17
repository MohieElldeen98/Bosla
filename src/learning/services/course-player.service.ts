import { ModuleRepository } from "@/learning/repositories/module.repository";
import { LessonRepository } from "@/learning/repositories/lesson.repository";
import { LessonProgressRepository } from "@/learning/repositories/lesson-progress.repository";
import { QuizAttemptRepository } from "@/learning/repositories/quiz-attempt.repository";
import { QuizService } from "@/learning/services/quiz.service";
import { QuizQuestionService } from "@/learning/services/quiz-question.service";
import { CourseService } from "@/courses/services/course.service";
import { CmsMediaService } from "@/cms/services/media.service";
import { EnrollmentService } from "@/learning/services/enrollment.service";
import { LessonAttachmentService } from "@/learning/services/lesson-attachment.service";
import { canAccessStudentData } from "@/learning/utils/require-student-access";
import { resolveLocalizedText } from "@/cms/utils/resolve-localized";
import { safeRead } from "@/learning/utils/safe-operation";
import { computeProgressPercentage } from "@/learning/types/course-completion-status";
import type { Locale } from "@/i18n/routing";
import type { AuthUser } from "@/auth/types/session";
import type { Course } from "@/courses/types/course";
import type { Lesson } from "@/learning/types/lesson";
import type { LessonProgress } from "@/learning/types/lesson-progress";
import type { Module } from "@/learning/types/module";
import type { LearningActionResult } from "@/learning/types/result";
import type { CoursePlayerData, PlayerModuleSummary, PlayerQuizData } from "@/learning/types/course-player";

/** Only populated for `type: "quiz"` lessons that already have a `Quiz`
 *  row with at least one question — reuses `QuizService.getByLessonId`/
 *  `QuizQuestionService.listResolvedByQuizId` as-is (both unrestricted
 *  reads, same convention as every other content read in this domain);
 *  `correctChoiceIndex` is deliberately stripped here, at the boundary
 *  into `PlayerQuizQuestion` — see that type's doc comment for why. */
async function loadQuizData(lessonId: string, studentId: string, locale: Locale): Promise<PlayerQuizData | null> {
  const quiz = await QuizService.getByLessonId(lessonId);
  if (!quiz) return null;

  const questions = await QuizQuestionService.listResolvedByQuizId(quiz.id, locale);
  if (questions.length === 0) return null;

  const attempts = await safeRead(() => QuizAttemptRepository.findByStudentAndQuiz(studentId, quiz.id), []);
  const latest = attempts[0] ?? null;

  return {
    id: quiz.id,
    passThresholdPercent: quiz.passThresholdPercent,
    questions: questions.map((question) => ({
      id: question.id,
      prompt: question.prompt,
      choices: question.choices,
    })),
    latestAttempt: latest
      ? { id: latest.id, scorePercent: latest.scorePercent, passed: latest.passed, submittedAt: latest.submittedAt }
      : null,
  };
}

/** A course's modules+lessons, flattened into one ordered sequence
 *  (module `position`, then lesson `position` within it) — the order the
 *  Course Player presents content in and the basis for Previous/Next
 *  navigation. Shared by both service methods below so the two never
 *  drift out of sync with each other. */
function buildOrderedLessons(modules: Module[], lessons: Lesson[]): Lesson[] {
  const moduleOrder = new Map(
    [...modules].sort((a, b) => a.position - b.position).map((module, index) => [module.id, index]),
  );
  return [...lessons]
    .filter((lesson) => moduleOrder.has(lesson.moduleId))
    .sort((a, b) => {
      const moduleDelta = (moduleOrder.get(a.moduleId) ?? 0) - (moduleOrder.get(b.moduleId) ?? 0);
      if (moduleDelta !== 0) return moduleDelta;
      return a.position - b.position;
    });
}

/** Loads course + enrollment + modules/lessons/progress, shared by both
 *  `getResumeLessonId` and `getLessonPlayerData` — every access to the
 *  player goes through the same authorization + enrollment gate,
 *  including "archived/revoked enrollments cannot access the player"
 *  (`EnrollmentService.isEnrolled` already only returns `true` for
 *  `status: "active"`). Returns `null` (via the result's `data`) callers
 *  translate into their own not_found/forbidden as appropriate. */
type CourseContext =
  | { ok: false; error: LearningActionResult<never> }
  | { ok: true; course: Course; modules: Module[]; orderedLessons: Lesson[]; progress: LessonProgress[] };

async function loadCourseContext(actingUser: AuthUser, studentId: string, courseSlug: string): Promise<CourseContext> {
  if (!canAccessStudentData(actingUser, studentId)) {
    return {
      ok: false,
      error: { success: false, code: "forbidden", message: "You cannot view this student's progress." },
    };
  }

  const course = await CourseService.getBySlug(courseSlug);
  if (!course) {
    return { ok: false, error: { success: false, code: "not_found", message: "Course not found." } };
  }

  const enrolled = await EnrollmentService.isEnrolled(studentId, course.id);
  if (!enrolled) {
    return {
      ok: false,
      error: { success: false, code: "forbidden", message: "You are not enrolled in this course." },
    };
  }

  const modules = await safeRead(() => ModuleRepository.findByCourseId(course.id), []);
  const lessons = await safeRead(
    () => LessonRepository.findByModuleIds(modules.map((module) => module.id)),
    [],
  );

  const orderedLessons = buildOrderedLessons(modules, lessons);
  const progress = await safeRead(
    () => LessonProgressRepository.findByStudentAndLessonIds(studentId, orderedLessons.map((lesson) => lesson.id)),
    [],
  );

  return { ok: true, course, modules, orderedLessons, progress };
}

/**
 * Orchestration for the Student Course Player (Step 4.4) — resolves which
 * lesson to resume into and assembles one lesson's full player view
 * (sidebar tree + current lesson content + neighbors + progress). Same
 * "student-owned data" authorization convention as `LessonProgressService`/
 * `StudentDashboardService`: every method takes an explicit `actingUser`
 * and checks `canAccessStudentData`. Not audit-logged, same reasoning as
 * `LessonProgressService` — viewing/resuming a lesson is routine
 * self-service activity, not an admin action.
 */
export const CoursePlayerService = {
  /** Determines the lesson `/courses/[slug]/learn` should redirect to:
   *  the most-recently-touched lesson (by `lesson_progress.updatedAt`) if
   *  the student has opened anything in this course before, otherwise the
   *  first lesson in the course's ordered sequence. Returns `data: null`
   *  for a course with zero lessons authored yet (an empty state, not an
   *  error). */
  async getResumeLessonId(
    actingUser: AuthUser,
    studentId: string,
    courseSlug: string,
  ): Promise<LearningActionResult<{ lessonId: string } | null>> {
    const context = await loadCourseContext(actingUser, studentId, courseSlug);
    if (!context.ok) return context.error;

    const { orderedLessons, progress } = context;
    if (orderedLessons.length === 0) {
      return { success: true, data: null };
    }

    const mostRecentProgress = [...progress].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
    const lessonId = mostRecentProgress?.lessonId ?? orderedLessons[0].id;
    return { success: true, data: { lessonId } };
  },

  /** Assembles the full player view for one specific lesson. A `lessonId`
   *  that doesn't belong to this course (a foreign or fabricated id typed
   *  directly into the URL) resolves to `not_found` — "Direct URL access
   *  must still enforce authorization." */
  async getLessonPlayerData(
    actingUser: AuthUser,
    studentId: string,
    courseSlug: string,
    lessonId: string,
    locale: Locale,
  ): Promise<LearningActionResult<CoursePlayerData>> {
    const context = await loadCourseContext(actingUser, studentId, courseSlug);
    if (!context.ok) return context.error;

    const { course, modules, orderedLessons, progress } = context;
    const currentIndex = orderedLessons.findIndex((lesson) => lesson.id === lessonId);
    if (currentIndex === -1) {
      return { success: false, code: "not_found", message: "Lesson not found in this course." };
    }
    const currentLesson = orderedLessons[currentIndex];
    const currentProgress = progress.find((entry) => entry.lessonId === currentLesson.id);
    // TODO: replace the public asset URL with a signed URL when private media is enabled.
    const videoUrl = currentLesson.videoAssetId
      ? (await CmsMediaService.getResolvedById(currentLesson.videoAssetId, locale))?.url ?? null
      : null;

    const completedLessonIds = new Set(
      progress.filter((entry) => entry.completedAt !== null).map((entry) => entry.lessonId),
    );

    const lessonsByModuleId = new Map<string, typeof orderedLessons>();
    for (const lesson of orderedLessons) {
      const bucket = lessonsByModuleId.get(lesson.moduleId);
      if (bucket) bucket.push(lesson);
      else lessonsByModuleId.set(lesson.moduleId, [lesson]);
    }

    const moduleSummaries: PlayerModuleSummary[] = [...modules]
      .sort((a, b) => a.position - b.position)
      .map((courseModule) => ({
        id: courseModule.id,
        title: resolveLocalizedText(courseModule.title, locale),
        position: courseModule.position,
        lessons: (lessonsByModuleId.get(courseModule.id) ?? []).map((lesson) => ({
          id: lesson.id,
          title: resolveLocalizedText(lesson.title, locale),
          position: lesson.position,
          type: lesson.type,
          isPreview: lesson.isPreview,
          completed: completedLessonIds.has(lesson.id),
          durationSeconds: lesson.durationSeconds,
        })),
      }));

    const previous = currentIndex > 0 ? orderedLessons[currentIndex - 1] : null;
    const next = currentIndex < orderedLessons.length - 1 ? orderedLessons[currentIndex + 1] : null;

    const totalLessons = orderedLessons.length;
    const completedLessons = completedLessonIds.size;
    const [quiz, attachments] = await Promise.all([
      currentLesson.type === "quiz" ? loadQuizData(currentLesson.id, studentId, locale) : Promise.resolve(null),
      LessonAttachmentService.listResolvedByLessonId(currentLesson.id, locale),
    ]);

    return {
      success: true,
      data: {
        courseId: course.id,
        courseSlug: course.slug,
        courseTitle: resolveLocalizedText(course.title, locale),
        certificateAvailable: course.certificateAvailable,
        specialtyId: course.specialtyId,
        modules: moduleSummaries,
        currentLesson: {
          id: currentLesson.id,
          moduleId: currentLesson.moduleId,
          title: resolveLocalizedText(currentLesson.title, locale),
          type: currentLesson.type,
          body: resolveLocalizedText(currentLesson.body, locale),
          videoAssetId: currentLesson.videoAssetId,
          videoUrl,
          durationSeconds: currentLesson.durationSeconds,
          isPreview: currentLesson.isPreview,
          completed: completedLessonIds.has(currentLesson.id),
          positionSeconds: currentProgress?.positionSeconds ?? 0,
          quiz,
          attachments,
        },
        previousLesson: previous ? { id: previous.id, title: resolveLocalizedText(previous.title, locale) } : null,
        nextLesson: next ? { id: next.id, title: resolveLocalizedText(next.title, locale) } : null,
        totalLessons,
        completedLessons,
        progressPercentage: computeProgressPercentage(completedLessons, totalLessons),
      },
    };
  },
};
