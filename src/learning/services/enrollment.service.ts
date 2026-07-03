import { EnrollmentRepository } from "@/learning/repositories/enrollment.repository";
import { ModuleRepository } from "@/learning/repositories/module.repository";
import { LessonRepository } from "@/learning/repositories/lesson.repository";
import { LessonProgressRepository } from "@/learning/repositories/lesson-progress.repository";
import { CourseRepository } from "@/courses/repositories/course.repository";
import { CourseService } from "@/courses/services/course.service";
import { ProfileService } from "@/auth/services/profile.service";
import { requireCourseManagementAccess } from "@/courses/utils/require-course-access";
import { canAccessStudentData } from "@/learning/utils/require-student-access";
import { recordLearningAuditLog } from "@/learning/utils/audit-log";
import { resolveLocalizedText } from "@/cms/utils/resolve-localized";
import { isRoleAllowed } from "@/auth/utils/role.utils";
import { computeProgressPercentage } from "@/learning/types/course-completion-status";
import { safeMutation, safeRead } from "@/learning/utils/safe-operation";
import type { Locale } from "@/i18n/routing";
import type { AuthUser } from "@/auth/types/session";
import type { Enrollment } from "@/learning/types/enrollment";
import type { LearningActionResult } from "@/learning/types/result";
import type { EnrollmentListItem, EnrollmentSearchFilters, EnrollmentSearchResult } from "@/learning/types/enrollment-search";
import type { InstructorStudentListItem } from "@/learning/types/instructor-student";
import type { CreateEnrollmentInput } from "@/learning/validators/enrollment.validator";

/** Shared by `searchResolved` and `getResolvedById` — batches student/
 *  granted-by/course name resolution for any list of enrollments, one
 *  query per referenced entity type, not one per row. */
async function resolveEnrollments(rows: Enrollment[], locale: Locale): Promise<EnrollmentListItem[]> {
  const userIds = [
    ...new Set([
      ...rows.map((e) => e.studentId),
      ...rows.map((e) => e.grantedByUserId).filter((id): id is string => id !== null),
    ]),
  ];
  const courseIds = [...new Set(rows.map((e) => e.courseId))];

  const [profiles, courseRows] = await Promise.all([
    ProfileService.getByUserIds(userIds),
    safeRead(() => CourseRepository.findByIds(courseIds), []),
  ]);

  const profileByUserId = new Map(profiles.map((profile) => [profile.userId, profile]));
  const courseById = new Map(courseRows.map((course) => [course.id, course]));

  return rows.map((enrollment) => {
    const student = profileByUserId.get(enrollment.studentId);
    const grantedBy = enrollment.grantedByUserId ? profileByUserId.get(enrollment.grantedByUserId) : undefined;
    const course = courseById.get(enrollment.courseId);

    return {
      id: enrollment.id,
      studentId: enrollment.studentId,
      studentName: student?.displayName ?? student?.fullName ?? student?.email ?? enrollment.studentId,
      studentEmail: student?.email ?? "",
      courseId: enrollment.courseId,
      courseTitle: course ? resolveLocalizedText(course.title, locale) : enrollment.courseId,
      courseSlug: course?.slug ?? "",
      source: enrollment.source,
      status: enrollment.status,
      grantedByUserId: enrollment.grantedByUserId,
      grantedByName: grantedBy ? (grantedBy.displayName ?? grantedBy.fullName ?? grantedBy.email) : null,
      createdAt: enrollment.createdAt,
      updatedAt: enrollment.updatedAt,
    };
  });
}

/**
 * Orchestration for `enrollments`. Two different authorization shapes on
 * purpose, matching who each method is really for:
 *  - `grant`/`revoke`/`restore`/`listForCourse`/`searchResolved` are
 *    Admin actions (Step 4.2's `/admin/enrollments`) — reuse
 *    `requireCourseManagementAccess` as-is, same boundary as course
 *    content authoring.
 *  - `listForStudent`/`isEnrolled` are about *a specific student's own
 *    data* — take an explicit `actingUser` and check
 *    `canAccessStudentData`, the same explicit-`actingUser` convention
 *    `ProfileService` already established (not the CMS/Course domain's
 *    internal-session-lookup convention, since this isn't admin-only).
 */
export const EnrollmentService = {
  async getById(id: string): Promise<Enrollment | null> {
    return safeRead(() => EnrollmentRepository.findById(id), null);
  },

  async isEnrolled(studentId: string, courseId: string): Promise<boolean> {
    const enrollment = await safeRead(
      () => EnrollmentRepository.findByStudentAndCourse(studentId, courseId),
      null,
    );
    return enrollment !== null && enrollment.status === "active";
  },

  async listForStudent(
    actingUser: AuthUser,
    studentId: string,
  ): Promise<LearningActionResult<Enrollment[]>> {
    if (!canAccessStudentData(actingUser, studentId)) {
      return { success: false, code: "forbidden", message: "You cannot view this student's enrollments." };
    }
    const list = await safeRead(() => EnrollmentRepository.findByStudentId(studentId), []);
    return { success: true, data: list };
  },

  /** Admin-only — "who is enrolled in this course," not a specific
   *  student's own data. */
  async listForCourse(courseId: string): Promise<LearningActionResult<Enrollment[]>> {
    return safeMutation(async () => {
      const user = await requireCourseManagementAccess();
      if (!user) {
        return { success: false, code: "forbidden", message: "You cannot view course enrollments." };
      }
      const list = await safeRead(() => EnrollmentRepository.findByCourseId(courseId), []);
      return { success: true, data: list };
    });
  },

  /**
   * The admin Enrollment Management listing's (Step 4.2, `/admin/enrollments`)
   * data source — paginated/filtered/sorted enrollments with student/
   * course/granted-by names resolved, composed from parallel repository
   * reads rather than a cross-domain SQL join (the same pattern
   * `CourseService.searchResolved` already established). Reads are
   * unrestricted here by the same convention Course/CMS reads use
   * ("who can *see* this list" is the page/route guard's job —
   * `(admin)/layout.tsx` already gates every `/admin/*` route — not
   * every read method's); mutations below are the ones that check
   * authorization.
   */
  async searchResolved(
    filters: EnrollmentSearchFilters,
    locale: Locale,
  ): Promise<EnrollmentSearchResult<EnrollmentListItem>> {
    const result = await safeRead(() => EnrollmentRepository.search(filters), {
      items: [] as Enrollment[],
      total: 0,
      page: filters.page ?? 1,
      pageSize: filters.pageSize ?? 20,
      totalPages: 1,
    });

    const items = await resolveEnrollments(result.items, locale);
    return { ...result, items };
  },

  /** The admin enrollment detail view's (`/admin/enrollments/[id]`, Step
   *  4.2) data source — same name resolution as `searchResolved`, for a
   *  single enrollment. */
  async getResolvedById(id: string, locale: Locale): Promise<EnrollmentListItem | null> {
    const enrollment = await safeRead(() => EnrollmentRepository.findById(id), null);
    if (!enrollment) return null;
    const [resolved] = await resolveEnrollments([enrollment], locale);
    return resolved;
  },

  /** `source: "manual_grant"` only today — an Admin granting access
   *  directly, no self-serve or payment flow (Phase 5). The uniqueness
   *  check (`enrollments_student_course_key`) fires regardless of
   *  `status` — a revoked enrollment still occupies the `(student,
   *  course)` slot, so re-granting means `restore`, not a second
   *  `create`; the conflict message says so. */
  async grant(input: CreateEnrollmentInput): Promise<LearningActionResult<Enrollment>> {
    return safeMutation(async () => {
      const user = await requireCourseManagementAccess();
      if (!user) {
        return { success: false, code: "forbidden", message: "You cannot grant course access." };
      }
      const existing = await EnrollmentRepository.findByStudentAndCourse(
        input.studentId,
        input.courseId,
      );
      if (existing) {
        return {
          success: false,
          code: "conflict",
          message:
            existing.status === "active"
              ? "This student is already enrolled."
              : "This student was previously enrolled and revoked — restore that enrollment instead of creating a new one.",
        };
      }
      const created = await EnrollmentRepository.create({
        studentId: input.studentId,
        courseId: input.courseId,
        source: input.source,
        grantedByUserId: user.id,
      });
      await recordLearningAuditLog({
        action: "enrollment_created",
        courseId: created.courseId,
        actorId: user.id,
        metadata: { studentId: created.studentId, source: created.source },
      });
      return { success: true, data: created };
    });
  },

  /**
   * Sets `status: "revoked"` — a soft flip, not a delete, so learning
   * history (and the grant's own record: who, when, by whom) is never
   * permanently lost (Step 4.2's explicit requirement). `expectedUpdatedAt`,
   * when given, enforces the same optimistic concurrency as the Course
   * Editor. Admin-only, matching `grant` — a student can't self-enroll,
   * so they don't self-revoke either.
   */
  async revoke(id: string, expectedUpdatedAt?: string): Promise<LearningActionResult<Enrollment>> {
    return setStatus(id, "revoked", "enrollment_revoked", expectedUpdatedAt);
  },

  /** The inverse of `revoke` — sets `status: "active"` again. Admin-only. */
  async restore(id: string, expectedUpdatedAt?: string): Promise<LearningActionResult<Enrollment>> {
    return setStatus(id, "active", "enrollment_restored", expectedUpdatedAt);
  },

  /**
   * The Instructor Students page (`/instructor/students`, Phase 6, Step
   * 6.6) — every enrollment across the signed-in Instructor's own
   * courses, never another Instructor's. Course ownership is resolved
   * the same way `CourseService.searchResolvedForInstructor` already
   * does (profile -> own `instructors` row -> `courses` by
   * `instructorId`), so a tampered request can never surface someone
   * else's students — there's no `courseId`/`instructorId` parameter
   * here to tamper with in the first place, only `actingUser`.
   *
   * Progress per enrollment reuses the exact same `lesson_progress`
   * completion math `CoursePlayerService` already uses
   * (`computeProgressPercentage`), computed once per course (not once
   * per student) to avoid re-fetching a course's lesson list for every
   * one of its students.
   */
  async listForInstructor(actingUser: AuthUser, locale: Locale): Promise<InstructorStudentListItem[]> {
    if (!isRoleAllowed(actingUser.role, ["instructor"])) return [];
    const ownInstructor = await CourseService.getOwnInstructor(actingUser);
    if (!ownInstructor) return [];
    const ownCourses = await safeRead(() => CourseRepository.findByInstructorId(ownInstructor.id), []);
    if (ownCourses.length === 0) return [];

    const enrollmentsByCourse = await Promise.all(
      ownCourses.map((course) => safeRead(() => EnrollmentRepository.findByCourseId(course.id), [])),
    );
    const allEnrollments = enrollmentsByCourse.flat();
    if (allEnrollments.length === 0) return [];

    const lessonIdsByCourse = new Map<string, string[]>();
    await Promise.all(
      ownCourses.map(async (course) => {
        const modules = await safeRead(() => ModuleRepository.findByCourseId(course.id), []);
        const lessons = await safeRead(
          () => LessonRepository.findByModuleIds(modules.map((m) => m.id)),
          [],
        );
        lessonIdsByCourse.set(
          course.id,
          lessons.map((lesson) => lesson.id),
        );
      }),
    );

    const studentIds = [...new Set(allEnrollments.map((enrollment) => enrollment.studentId))];
    const profiles = await ProfileService.getByUserIds(studentIds);
    const profileByUserId = new Map(profiles.map((profile) => [profile.userId, profile]));
    const courseById = new Map(ownCourses.map((course) => [course.id, course]));

    const items = await Promise.all(
      allEnrollments.map(async (enrollment) => {
        const lessonIds = lessonIdsByCourse.get(enrollment.courseId) ?? [];
        const progress = await safeRead(
          () => LessonProgressRepository.findByStudentAndLessonIds(enrollment.studentId, lessonIds),
          [],
        );
        const completed = progress.filter((entry) => entry.completedAt !== null).length;
        const student = profileByUserId.get(enrollment.studentId);
        const course = courseById.get(enrollment.courseId);

        return {
          enrollmentId: enrollment.id,
          studentId: enrollment.studentId,
          studentName: student?.displayName ?? student?.fullName ?? student?.email ?? enrollment.studentId,
          studentEmail: student?.email ?? "",
          courseId: enrollment.courseId,
          courseTitle: course ? resolveLocalizedText(course.title, locale) : enrollment.courseId,
          status: enrollment.status,
          progressPercentage: computeProgressPercentage(completed, lessonIds.length),
          enrolledAt: enrollment.createdAt,
        };
      }),
    );

    return items.sort((a, b) => b.enrolledAt.localeCompare(a.enrolledAt));
  },
};

async function setStatus(
  id: string,
  status: "active" | "revoked",
  auditAction: "enrollment_revoked" | "enrollment_restored",
  expectedUpdatedAt?: string,
): Promise<LearningActionResult<Enrollment>> {
  return safeMutation(async () => {
    const user = await requireCourseManagementAccess();
    if (!user) {
      return { success: false, code: "forbidden", message: "You cannot manage enrollments." };
    }

    const result = await EnrollmentRepository.updateStatus(id, status, expectedUpdatedAt);
    if (result.status === "not_found") {
      return { success: false, code: "not_found", message: "Enrollment not found." };
    }
    if (result.status === "conflict") {
      return {
        success: false,
        code: "conflict",
        message: "This enrollment was changed by someone else. Reload to see the latest version.",
      };
    }

    await recordLearningAuditLog({
      action: auditAction,
      courseId: result.data.courseId,
      actorId: user.id,
      metadata: { studentId: result.data.studentId },
    });
    return { success: true, data: result.data };
  });
}
