import { QuizRepository, type UpdateQuizRow } from "@/learning/repositories/quiz.repository";
import { requireCourseManagementAccess } from "@/courses/utils/require-course-access";
import { recordLearningAuditLog } from "@/learning/utils/audit-log";
import { resolveLessonCourse } from "@/learning/utils/resolve-lesson-course";
import { safeMutation, safeRead } from "@/learning/utils/safe-operation";
import type { Quiz } from "@/learning/types/quiz";
import type { LearningActionResult } from "@/learning/types/result";
import type { CreateQuizInput, UpdateQuizInput } from "@/learning/validators/quiz.validator";

/**
 * Orchestration for `quizzes` — same authorization boundary as
 * `ModuleService`/`LessonService` (reuses `requireCourseManagementAccess`
 * as-is). `QuizRepository` is pure data access.
 */
export const QuizService = {
  async getById(id: string): Promise<Quiz | null> {
    return safeRead(() => QuizRepository.findById(id), null);
  },

  async getByLessonId(lessonId: string): Promise<Quiz | null> {
    return safeRead(() => QuizRepository.findByLessonId(lessonId), null);
  },

  async create(input: CreateQuizInput): Promise<LearningActionResult<Quiz>> {
    return safeMutation(async () => {
      const user = await requireCourseManagementAccess();
      if (!user) {
        return { success: false, code: "forbidden", message: "You cannot manage course curriculum." };
      }
      const existing = await QuizRepository.findByLessonId(input.lessonId);
      if (existing) {
        return { success: false, code: "conflict", message: "This lesson already has a quiz." };
      }
      const created = await QuizRepository.create(input);
      const owner = await resolveLessonCourse(created.lessonId);
      if (owner) {
        await recordLearningAuditLog({
          action: "quiz_created",
          courseId: owner.courseId,
          moduleId: owner.moduleId,
          lessonId: created.lessonId,
          actorId: user.id,
        });
      }
      return { success: true, data: created };
    });
  },

  async update(
    id: string,
    input: UpdateQuizInput,
    expectedUpdatedAt?: string,
  ): Promise<LearningActionResult<Quiz>> {
    return safeMutation(async () => {
      const user = await requireCourseManagementAccess();
      if (!user) {
        return { success: false, code: "forbidden", message: "You cannot manage course curriculum." };
      }

      const row: UpdateQuizRow = {};
      if (input.passThresholdPercent !== undefined) row.passThresholdPercent = input.passThresholdPercent;

      const result = await QuizRepository.update(id, row, expectedUpdatedAt);
      if (result.status === "not_found") {
        return { success: false, code: "not_found", message: "Quiz not found." };
      }
      if (result.status === "conflict") {
        return {
          success: false,
          code: "conflict",
          message: "This quiz was changed by someone else. Reload to see the latest version.",
        };
      }

      const owner = await resolveLessonCourse(result.data.lessonId);
      if (owner) {
        await recordLearningAuditLog({
          action: "quiz_updated",
          courseId: owner.courseId,
          moduleId: owner.moduleId,
          lessonId: result.data.lessonId,
          actorId: user.id,
        });
      }
      return { success: true, data: result.data };
    });
  },

  /** Hard delete — cascades to the quiz's own questions/attempts, per
   *  `db/schema/learning.ts`'s cascade design. */
  async delete(id: string): Promise<LearningActionResult> {
    return safeMutation(async () => {
      const user = await requireCourseManagementAccess();
      if (!user) {
        return { success: false, code: "forbidden", message: "You cannot manage course curriculum." };
      }
      const existing = await QuizRepository.findById(id);
      if (!existing) {
        return { success: false, code: "not_found", message: "Quiz not found." };
      }
      const owner = await resolveLessonCourse(existing.lessonId);
      if (owner) {
        await recordLearningAuditLog({
          action: "quiz_deleted",
          courseId: owner.courseId,
          moduleId: owner.moduleId,
          lessonId: existing.lessonId,
          actorId: user.id,
        });
      }
      await QuizRepository.delete(id);
      return { success: true, data: undefined };
    });
  },
};
