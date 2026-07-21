import { LessonProgressRepository } from "@/learning/repositories/lesson-progress.repository";
import { LessonRepository } from "@/learning/repositories/lesson.repository";
import { ModuleRepository } from "@/learning/repositories/module.repository";
import { canAccessStudentData } from "@/learning/utils/require-student-access";
import { safeMutation, safeRead } from "@/learning/utils/safe-operation";
import { CertificateService } from "@/certificates/services/certificate.service";
import type { AuthUser } from "@/auth/types/session";
import type { LessonProgress } from "@/learning/types/lesson-progress";
import type { LearningActionResult } from "@/learning/types/result";
import type { SetLessonProgressInput } from "@/learning/validators/lesson-progress.validator";

/**
 * Orchestration for `lesson_progress` — entirely student-owned data, so
 * every method takes an explicit `actingUser` and checks
 * `canAccessStudentData`, same convention as `EnrollmentService`'s
 * student-facing half. Not audit-logged — see
 * `learningAuditLogs`'s doc comment: this is routine self-service
 * activity, not an admin action.
 */
export const LessonProgressService = {
  async getForStudentAndLesson(
    actingUser: AuthUser,
    studentId: string,
    lessonId: string,
  ): Promise<LearningActionResult<LessonProgress | null>> {
    if (!canAccessStudentData(actingUser, studentId)) {
      return { success: false, code: "forbidden", message: "You cannot view this student's progress." };
    }
    const progress = await safeRead(
      () => LessonProgressRepository.findByStudentAndLesson(studentId, lessonId),
      null,
    );
    return { success: true, data: progress };
  },

  async listForStudent(
    actingUser: AuthUser,
    studentId: string,
  ): Promise<LearningActionResult<LessonProgress[]>> {
    if (!canAccessStudentData(actingUser, studentId)) {
      return { success: false, code: "forbidden", message: "You cannot view this student's progress." };
    }
    const list = await safeRead(() => LessonProgressRepository.findByStudentId(studentId), []);
    return { success: true, data: list };
  },

  /** Called by the Course Player (Step 4.4) whenever a lesson is opened —
   *  records "last activity" without ever touching completion state (see
   *  `LessonProgressRepository.recordOpened`'s doc comment). */
  async recordOpened(
    actingUser: AuthUser,
    studentId: string,
    lessonId: string,
  ): Promise<LearningActionResult<LessonProgress>> {
    if (!canAccessStudentData(actingUser, studentId)) {
      return { success: false, code: "forbidden", message: "You cannot update this student's progress." };
    }
    return safeMutation(async () => {
      const updated = await LessonProgressRepository.recordOpened(studentId, lessonId);
      return { success: true, data: updated };
    });
  },

  /** A student marking their own lesson complete/incomplete is the
   *  primary case; an Admin can also set it on a student's behalf
   *  (`canAccessStudentData` allows both). */
  async setCompleted(
    actingUser: AuthUser,
    input: SetLessonProgressInput,
  ): Promise<LearningActionResult<LessonProgress>> {
    if (!canAccessStudentData(actingUser, input.studentId)) {
      return { success: false, code: "forbidden", message: "You cannot update this student's progress." };
    }
    return safeMutation(async () => {
      const updated = await LessonProgressRepository.setCompleted(
        input.studentId,
        input.lessonId,
        input.completed,
      );
      if (input.completed) {
        // Best-effort: a certificate is a bonus on top of a successful
        // completion write, never a condition of it. Resolves the
        // lesson's course via its module, then checks whether the
        // *whole course* just became complete (`issueIfEligible` does
        // its own idempotency/eligibility checks).
        const lesson = await LessonRepository.findById(input.lessonId);
        const courseModule = lesson ? await ModuleRepository.findById(lesson.moduleId) : null;
        if (courseModule) {
          await CertificateService.issueIfEligible(input.studentId, courseModule.courseId);
        }
      }
      return { success: true, data: updated };
    });
  },

  async updatePosition(
    actingUser: AuthUser,
    studentId: string,
    lessonId: string,
    positionSeconds: number,
  ): Promise<LearningActionResult<LessonProgress>> {
    if (!canAccessStudentData(actingUser, studentId)) {
      return { success: false, code: "forbidden", message: "You cannot update this student's progress." };
    }
    return safeMutation(async () => ({
      success: true,
      data: await LessonProgressRepository.updatePosition(studentId, lessonId, positionSeconds),
    }));
  },
};
