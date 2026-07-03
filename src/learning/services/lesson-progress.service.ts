import { LessonProgressRepository } from "@/learning/repositories/lesson-progress.repository";
import { canAccessStudentData } from "@/learning/utils/require-student-access";
import { safeMutation, safeRead } from "@/learning/utils/safe-operation";
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
      return { success: true, data: updated };
    });
  },
};
