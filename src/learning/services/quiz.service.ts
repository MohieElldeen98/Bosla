import { QuizRepository, type UpdateQuizRow } from "@/learning/repositories/quiz.repository";
import { requireCourseManagementAccess } from "@/courses/utils/require-course-access";
import { requireOwnCourseAccess } from "@/learning/utils/require-own-course-access";
import { recordLearningAuditLog } from "@/learning/utils/audit-log";
import { resolveLessonCourse, resolveQuizCourse } from "@/learning/utils/resolve-lesson-course";
import { safeMutation, safeRead } from "@/learning/utils/safe-operation";
import type { Quiz } from "@/learning/types/quiz";
import type { LearningActionResult } from "@/learning/types/result";
import type { CreateQuizInput, UpdateQuizInput } from "@/learning/validators/quiz.validator";
import type { AuthUser } from "@/auth/types/session";

/**
 * Orchestration for `quizzes` — `create`/`update`/`delete` reuse
 * `requireCourseManagementAccess` as-is (Admin/Super Admin).
 * `createOwn` (Phase 6, Step 6.4) is the Curriculum Builder's own
 * counterpart — auto-called by `LessonService.createOwn`/`updateOwn`
 * whenever a lesson's `type` is/becomes `"quiz"`, to keep the one-to-one
 * `quizzes` row that lesson type implies always present. `updateOwn`
 * (Phase 6, Step 6.5) is the Quiz Editor's own counterpart, letting an
 * Instructor change the pass threshold of their own quiz.
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

  /** Idempotent — a lesson that already has a quiz returns it as-is
   *  rather than erroring (unlike `create`, which treats a duplicate as
   *  a conflict), since this is called defensively on every
   *  `createOwn`/`updateOwn` for a `"quiz"`-typed lesson, not just once. */
  async createOwn(actingUser: AuthUser, lessonId: string): Promise<LearningActionResult<Quiz>> {
    return safeMutation(async () => {
      const owner = await resolveLessonCourse(lessonId);
      if (!owner) {
        return { success: false, code: "not_found", message: "Lesson not found." };
      }
      const access = await requireOwnCourseAccess(actingUser, owner.courseId, { requireDraft: true });
      if (!access.ok) {
        return { success: false, code: access.code, message: access.message };
      }

      const existing = await QuizRepository.findByLessonId(lessonId);
      if (existing) {
        return { success: true, data: existing };
      }
      const created = await QuizRepository.create({ lessonId });
      await recordLearningAuditLog({
        action: "quiz_created",
        courseId: owner.courseId,
        moduleId: owner.moduleId,
        lessonId,
        actorId: actingUser.id,
      });
      return { success: true, data: created };
    });
  },

  /** The Quiz Editor's own counterpart to `update` (Phase 6, Step 6.5) —
   *  only `passThresholdPercent` is ever settable through it (a quiz's
   *  "title"/"description" are really its lesson's `title`/`body`,
   *  edited via the already-existing `LessonService.updateOwn` — no
   *  separate quiz-level fields for those exist, or need to). */
  async updateOwn(
    actingUser: AuthUser,
    id: string,
    input: UpdateQuizInput,
    expectedUpdatedAt?: string,
  ): Promise<LearningActionResult<Quiz>> {
    return safeMutation(async () => {
      const owner = await resolveQuizCourse(id);
      if (!owner) {
        return { success: false, code: "not_found", message: "Quiz not found." };
      }
      const access = await requireOwnCourseAccess(actingUser, owner.courseId, { requireDraft: true });
      if (!access.ok) {
        return { success: false, code: access.code, message: access.message };
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

      await recordLearningAuditLog({
        action: "quiz_updated",
        courseId: owner.courseId,
        moduleId: owner.moduleId,
        lessonId: owner.lessonId,
        actorId: actingUser.id,
      });
      return { success: true, data: result.data };
    });
  },
};
