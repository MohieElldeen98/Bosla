import { EnrollmentRepository } from "@/learning/repositories/enrollment.repository";
import { requireCourseManagementAccess } from "@/courses/utils/require-course-access";
import { canAccessStudentData } from "@/learning/utils/require-student-access";
import { recordLearningAuditLog } from "@/learning/utils/audit-log";
import { safeMutation, safeRead } from "@/learning/utils/safe-operation";
import type { AuthUser } from "@/auth/types/session";
import type { Enrollment } from "@/learning/types/enrollment";
import type { LearningActionResult } from "@/learning/types/result";
import type { CreateEnrollmentInput } from "@/learning/validators/enrollment.validator";

/**
 * Orchestration for `enrollments`. Two different authorization shapes on
 * purpose, matching who each method is really for:
 *  - `grant`/`revoke`/`listForCourse` are Admin actions — reuse
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
    return enrollment !== null;
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

  /** `source: "manual_grant"` only today — an Admin granting access
   *  directly, no self-serve or payment flow (Phase 5). */
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
        return { success: false, code: "conflict", message: "This student is already enrolled." };
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

  /** Admin-only, matching `grant` — a student can't self-enroll, so they
   *  don't self-unenroll either; that symmetry may change once Phase 5
   *  adds a real purchase/cancellation flow. */
  async revoke(id: string): Promise<LearningActionResult> {
    return safeMutation(async () => {
      const user = await requireCourseManagementAccess();
      if (!user) {
        return { success: false, code: "forbidden", message: "You cannot revoke course access." };
      }
      const existing = await EnrollmentRepository.findById(id);
      if (!existing) {
        return { success: false, code: "not_found", message: "Enrollment not found." };
      }
      await EnrollmentRepository.delete(id);
      return { success: true, data: undefined };
    });
  },
};
