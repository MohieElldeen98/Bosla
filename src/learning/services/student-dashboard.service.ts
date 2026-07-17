import { EnrollmentRepository } from "@/learning/repositories/enrollment.repository";
import { ModuleRepository } from "@/learning/repositories/module.repository";
import { LessonRepository } from "@/learning/repositories/lesson.repository";
import { LessonProgressRepository } from "@/learning/repositories/lesson-progress.repository";
import { CourseRepository } from "@/courses/repositories/course.repository";
import { CourseInstructorRepository } from "@/courses/repositories/instructor.repository";
import { CmsMediaService } from "@/cms/services/media.service";
import { canAccessStudentData } from "@/learning/utils/require-student-access";
import { resolveLocalizedText } from "@/cms/utils/resolve-localized";
import { safeRead } from "@/learning/utils/safe-operation";
import { computeProgressPercentage, getCourseCompletionStatus } from "@/learning/types/course-completion-status";
import type { Locale } from "@/i18n/routing";
import type { AuthUser } from "@/auth/types/session";
import type { LearningActionResult } from "@/learning/types/result";
import type { DashboardCourseItem, StudentDashboardData } from "@/learning/types/student-dashboard";

const MAX_CONTINUE_LEARNING = 3;

/**
 * Orchestration for the Student Dashboard (Step 4.3) — composes across
 * Enrollment, Module, Lesson, Lesson Progress (this domain), and Course/
 * Instructor/Media (Course Domain/CMS), the same "parallel repository
 * reads, no cross-domain SQL join" pattern every other resolved view in
 * this codebase already uses (`CourseService.searchResolved`,
 * `EnrollmentService.searchResolved`). Self-or-admin gated via
 * `canAccessStudentData` — the same check `EnrollmentService.listForStudent`/
 * `LessonProgressService` already use for student-owned data, reused
 * as-is, not duplicated.
 *
 * Progress is computed here, not stored: `totalLessons`/`completedLessons`
 * are derived from `lessons` and `lesson_progress` every call. There's no
 * optimistic-concurrency angle to this — it's a read composed from
 * several other tables' current state, not a row this service itself
 * writes to.
 */
export const StudentDashboardService = {
  async getDashboard(
    actingUser: AuthUser,
    studentId: string,
    locale: Locale,
  ): Promise<LearningActionResult<StudentDashboardData>> {
    if (!canAccessStudentData(actingUser, studentId)) {
      return { success: false, code: "forbidden", message: "You cannot view this student's dashboard." };
    }

    const enrollments = await safeRead(() => EnrollmentRepository.findByStudentId(studentId, "active"), []);
    if (enrollments.length === 0) {
      return { success: true, data: { courses: [], continueLearning: [] } };
    }

    const courseIds = [...new Set(enrollments.map((enrollment) => enrollment.courseId))];

    const [courses, modules, allProgress] = await Promise.all([
      safeRead(() => CourseRepository.findByIds(courseIds), []),
      safeRead(() => ModuleRepository.findByCourseIds(courseIds), []),
      safeRead(() => LessonProgressRepository.findByStudentId(studentId), []),
    ]);

    const instructorIds = [...new Set(courses.map((course) => course.instructorId))];
    const coverImageIds = [
      ...new Set(courses.map((course) => course.coverImageId).filter((id): id is string => id !== null)),
    ];
    const moduleIds = modules.map((module) => module.id);

    const [instructors, coverImages, lessons] = await Promise.all([
      safeRead(() => CourseInstructorRepository.findByIds(instructorIds), []),
      Promise.all(coverImageIds.map((id) => CmsMediaService.getResolvedById(id, locale))),
      safeRead(() => LessonRepository.findByModuleIds(moduleIds), []),
    ]);

    // Instructor avatars resolve through the same media path covers use —
    // a second small batch because avatar ids only become known once the
    // instructors themselves have loaded.
    const instructorAvatarIds = [
      ...new Set(instructors.map((instructor) => instructor.avatarImageId).filter((id): id is string => id !== null)),
    ];
    const instructorAvatars = await Promise.all(
      instructorAvatarIds.map((id) => CmsMediaService.getResolvedById(id, locale)),
    );
    const instructorAvatarById = new Map(
      instructorAvatarIds
        .map((id, index) => [id, instructorAvatars[index]] as const)
        .filter((entry): entry is [string, NonNullable<(typeof instructorAvatars)[number]>] => entry[1] !== null),
    );

    const courseById = new Map(courses.map((course) => [course.id, course]));
    const instructorById = new Map(instructors.map((instructor) => [instructor.id, instructor]));
    const coverImageById = new Map(
      coverImageIds
        .map((id, index) => [id, coverImages[index]] as const)
        .filter((entry): entry is [string, NonNullable<(typeof coverImages)[number]>] => entry[1] !== null),
    );
    const moduleById = new Map(modules.map((module) => [module.id, module]));
    const lessonById = new Map(lessons.map((lesson) => [lesson.id, lesson]));

    // Total lesson count per course.
    const totalLessonsByCourseId = new Map<string, number>();
    for (const lesson of lessons) {
      const owningModule = moduleById.get(lesson.moduleId);
      if (!owningModule) continue;
      totalLessonsByCourseId.set(owningModule.courseId, (totalLessonsByCourseId.get(owningModule.courseId) ?? 0) + 1);
    }

    // Completed count + last activity per course, from this student's
    // progress rows restricted to lessons that actually belong to one of
    // their enrolled courses.
    const completedLessonsByCourseId = new Map<string, number>();
    const lastActivityByCourseId = new Map<string, string>();
    for (const progress of allProgress) {
      const lesson = lessonById.get(progress.lessonId);
      if (!lesson) continue;
      const owningModule = moduleById.get(lesson.moduleId);
      if (!owningModule) continue;
      const courseId = owningModule.courseId;

      if (progress.completedAt) {
        completedLessonsByCourseId.set(courseId, (completedLessonsByCourseId.get(courseId) ?? 0) + 1);
      }
      const existingLatest = lastActivityByCourseId.get(courseId);
      if (!existingLatest || progress.updatedAt > existingLatest) {
        lastActivityByCourseId.set(courseId, progress.updatedAt);
      }
    }

    // Resume lesson per course: lessons already loaded and owned by this
    // student's enrolled courses, so this is pure in-memory ordering —
    // module position, then lesson position — against the student's
    // completed-lesson set. No extra queries.
    const completedLessonIds = new Set(
      allProgress.filter((progress) => progress.completedAt !== null).map((progress) => progress.lessonId),
    );
    const modulePositionById = new Map(modules.map((module) => [module.id, module.position]));
    const orderedLessonsByCourseId = new Map<string, typeof lessons>();
    for (const lesson of lessons) {
      const owningModule = moduleById.get(lesson.moduleId);
      if (!owningModule) continue;
      const list = orderedLessonsByCourseId.get(owningModule.courseId) ?? [];
      list.push(lesson);
      orderedLessonsByCourseId.set(owningModule.courseId, list);
    }
    for (const list of orderedLessonsByCourseId.values()) {
      list.sort((a, b) => {
        const moduleOrder = (modulePositionById.get(a.moduleId) ?? 0) - (modulePositionById.get(b.moduleId) ?? 0);
        return moduleOrder !== 0 ? moduleOrder : a.position - b.position;
      });
    }

    const items: DashboardCourseItem[] = enrollments.map((enrollment) => {
      const course = courseById.get(enrollment.courseId);
      const instructor = course ? instructorById.get(course.instructorId) : undefined;
      const coverImage = course?.coverImageId ? coverImageById.get(course.coverImageId) : undefined;
      const totalLessons = totalLessonsByCourseId.get(enrollment.courseId) ?? 0;
      const completedLessons = completedLessonsByCourseId.get(enrollment.courseId) ?? 0;
      const progressPercentage = computeProgressPercentage(completedLessons, totalLessons);
      const resumeLesson = (orderedLessonsByCourseId.get(enrollment.courseId) ?? []).find(
        (lesson) => !completedLessonIds.has(lesson.id),
      );

      return {
        enrollmentId: enrollment.id,
        courseId: enrollment.courseId,
        courseSlug: course?.slug ?? "",
        courseTitle: course ? resolveLocalizedText(course.title, locale) : enrollment.courseId,
        courseSubtitle: course ? resolveLocalizedText(course.subtitle, locale) : null,
        instructorName: instructor ? resolveLocalizedText(instructor.name, locale) : "",
        coverImageUrl: coverImage?.url ?? null,
        totalLessons,
        completedLessons,
        progressPercentage,
        completionStatus: getCourseCompletionStatus(completedLessons, totalLessons),
        lastActivityAt: lastActivityByCourseId.get(enrollment.courseId) ?? null,
        enrolledAt: enrollment.createdAt,
        resumeLessonId: resumeLesson?.id ?? null,
        resumeLessonTitle: resumeLesson ? resolveLocalizedText(resumeLesson.title, locale) : null,
        card: {
          slug: course?.slug ?? "",
          title: course ? resolveLocalizedText(course.title, locale) : enrollment.courseId,
          // Specialty/category names aren't loaded here (two more
          // cross-domain reads for an eyebrow the enrolled card doesn't
          // need) — null hides the eyebrow.
          specialtyName: null,
          categoryName: null,
          instructorName: instructor ? resolveLocalizedText(instructor.name, locale) : "",
          instructorQualification: instructor?.qualification
            ? resolveLocalizedText(instructor.qualification, locale)
            : null,
          instructorAvatarUrl: instructor?.avatarImageId
            ? instructorAvatarById.get(instructor.avatarImageId)?.url ?? null
            : null,
          level: course?.level ?? "beginner",
          price: course?.price ?? "0",
          originalPrice: course?.originalPrice ?? null,
          currency: course?.currency ?? "EGP",
          isFree: course?.isFree ?? false,
          featured: false,
          certificateAvailable: course?.certificateAvailable ?? false,
          lessonCount: totalLessons,
          estimatedDurationMinutes: course?.estimatedDurationMinutes ?? null,
          coverImageUrl: coverImage?.url ?? null,
        },
      };
    });

    const continueLearning = items
      .filter((item) => item.completionStatus === "in_progress")
      .sort((a, b) => (b.lastActivityAt ?? "").localeCompare(a.lastActivityAt ?? ""))
      .slice(0, MAX_CONTINUE_LEARNING);

    return { success: true, data: { courses: items, continueLearning } };
  },
};
