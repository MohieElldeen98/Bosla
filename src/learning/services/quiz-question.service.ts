import {
  QuizQuestionRepository,
  type UpdateQuizQuestionRow,
} from "@/learning/repositories/quiz-question.repository";
import { requireCourseManagementAccess } from "@/courses/utils/require-course-access";
import { requireOwnCourseAccess } from "@/learning/utils/require-own-course-access";
import { recordLearningAuditLog } from "@/learning/utils/audit-log";
import { resolveLocalizedText } from "@/cms/utils/resolve-localized";
import { resolveQuizCourse, resolveQuizQuestionCourse } from "@/learning/utils/resolve-lesson-course";
import { safeMutation, safeRead } from "@/learning/utils/safe-operation";
import type { Locale } from "@/i18n/routing";
import type { QuizQuestion, ResolvedQuizQuestion } from "@/learning/types/quiz-question";
import type { LearningActionResult } from "@/learning/types/result";
import type {
  CreateQuizQuestionInput,
  UpdateQuizQuestionInput,
} from "@/learning/validators/quiz-question.validator";
import type { AuthUser } from "@/auth/types/session";

function toResolvedQuizQuestion(question: QuizQuestion, locale: Locale): ResolvedQuizQuestion {
  return {
    id: question.id,
    quizId: question.quizId,
    prompt: resolveLocalizedText(question.prompt, locale),
    position: question.position,
    choices: question.choices.map((choice) => resolveLocalizedText(choice, locale)),
    correctChoiceIndex: question.correctChoiceIndex,
  };
}

/**
 * Orchestration for `quiz_questions` — `create`/`update`/`delete` reuse
 * `requireCourseManagementAccess` as-is (Admin/Super Admin), and are
 * deliberately not audit-logged at this granularity — see
 * `learningAuditLogs`'s doc comment (`db/schema/learning.ts`): auditing
 * happens at the quiz level, not per-question, matching how CMS audits
 * a section "save" at the whole-section level, not per field.
 *
 * `createOwn`/`updateOwn`/`deleteOwn`/`reorderOwn` (Phase 6, Step 6.5)
 * are the Quiz Editor's own Instructor-owned counterparts, gated by
 * `requireOwnCourseAccess` the same way `LessonService`'s `*Own` methods
 * are. Unlike the Admin path, these ARE audit-logged (`question_*`
 * actions) — an Instructor authoring their own quiz content is exactly
 * the kind of change `learning_audit_logs` exists to track, and Step 6.4
 * already set the "reorder gets its own audit action" precedent for
 * Module/Lesson.
 */
export const QuizQuestionService = {
  async getById(id: string): Promise<QuizQuestion | null> {
    return safeRead(() => QuizQuestionRepository.findById(id), null);
  },

  async listByQuizId(quizId: string): Promise<QuizQuestion[]> {
    return safeRead(() => QuizQuestionRepository.findByQuizId(quizId), []);
  },

  async listResolvedByQuizId(quizId: string, locale: Locale): Promise<ResolvedQuizQuestion[]> {
    const list = await safeRead(() => QuizQuestionRepository.findByQuizId(quizId), []);
    return list.map((question) => toResolvedQuizQuestion(question, locale));
  },

  async create(input: CreateQuizQuestionInput): Promise<LearningActionResult<QuizQuestion>> {
    return safeMutation(async () => {
      const user = await requireCourseManagementAccess();
      if (!user) {
        return { success: false, code: "forbidden", message: "You cannot manage course curriculum." };
      }
      const created = await QuizQuestionRepository.create(input);
      return { success: true, data: created };
    });
  },

  async update(
    id: string,
    input: UpdateQuizQuestionInput,
    expectedUpdatedAt?: string,
  ): Promise<LearningActionResult<QuizQuestion>> {
    return safeMutation(async () => {
      const user = await requireCourseManagementAccess();
      if (!user) {
        return { success: false, code: "forbidden", message: "You cannot manage course curriculum." };
      }

      const row: UpdateQuizQuestionRow = {};
      if (input.prompt !== undefined) row.prompt = input.prompt;
      if (input.position !== undefined) row.position = input.position;
      if (input.choices !== undefined) row.choices = input.choices;
      if (input.correctChoiceIndex !== undefined) row.correctChoiceIndex = input.correctChoiceIndex;

      const result = await QuizQuestionRepository.update(id, row, expectedUpdatedAt);
      if (result.status === "not_found") {
        return { success: false, code: "not_found", message: "Question not found." };
      }
      if (result.status === "conflict") {
        return {
          success: false,
          code: "conflict",
          message: "This question was changed by someone else. Reload to see the latest version.",
        };
      }
      return { success: true, data: result.data };
    });
  },

  async delete(id: string): Promise<LearningActionResult> {
    return safeMutation(async () => {
      const user = await requireCourseManagementAccess();
      if (!user) {
        return { success: false, code: "forbidden", message: "You cannot manage course curriculum." };
      }
      await QuizQuestionRepository.delete(id);
      return { success: true, data: undefined };
    });
  },

  /** Appends to the end of the quiz's question list, same "the caller
   *  never guesses a position" reasoning as `ModuleService.createOwn`/
   *  `LessonService.createOwn` — any `position` in `input` is ignored in
   *  favor of `existing.length`. */
  async createOwn(
    actingUser: AuthUser,
    input: CreateQuizQuestionInput,
  ): Promise<LearningActionResult<QuizQuestion>> {
    return safeMutation(async () => {
      const owner = await resolveQuizCourse(input.quizId);
      if (!owner) {
        return { success: false, code: "not_found", message: "Quiz not found." };
      }
      const access = await requireOwnCourseAccess(actingUser, owner.courseId, { requireDraft: true });
      if (!access.ok) {
        return { success: false, code: access.code, message: access.message };
      }

      const existing = await QuizQuestionRepository.findByQuizId(input.quizId);
      const created = await QuizQuestionRepository.create({ ...input, position: existing.length });
      await recordLearningAuditLog({
        action: "question_created",
        courseId: owner.courseId,
        moduleId: owner.moduleId,
        lessonId: owner.lessonId,
        actorId: actingUser.id,
        metadata: { quizId: input.quizId, questionId: created.id },
      });
      return { success: true, data: created };
    });
  },

  /** Prompt/choices/correctChoiceIndex — never `position`, same "only
   *  `reorderOwn` moves things" reasoning as `LessonService.updateOwn`. */
  async updateOwn(
    actingUser: AuthUser,
    id: string,
    input: UpdateQuizQuestionInput,
    expectedUpdatedAt?: string,
  ): Promise<LearningActionResult<QuizQuestion>> {
    return safeMutation(async () => {
      const owner = await resolveQuizQuestionCourse(id);
      if (!owner) {
        return { success: false, code: "not_found", message: "Question not found." };
      }
      const access = await requireOwnCourseAccess(actingUser, owner.courseId, { requireDraft: true });
      if (!access.ok) {
        return { success: false, code: access.code, message: access.message };
      }

      const row: UpdateQuizQuestionRow = {};
      if (input.prompt !== undefined) row.prompt = input.prompt;
      if (input.choices !== undefined) row.choices = input.choices;
      if (input.correctChoiceIndex !== undefined) row.correctChoiceIndex = input.correctChoiceIndex;

      const result = await QuizQuestionRepository.update(id, row, expectedUpdatedAt);
      if (result.status === "not_found") {
        return { success: false, code: "not_found", message: "Question not found." };
      }
      if (result.status === "conflict") {
        return {
          success: false,
          code: "conflict",
          message: "This question was changed by someone else. Reload to see the latest version.",
        };
      }

      await recordLearningAuditLog({
        action: "question_updated",
        courseId: owner.courseId,
        moduleId: owner.moduleId,
        lessonId: owner.lessonId,
        actorId: actingUser.id,
        metadata: { quizId: owner.quizId, questionId: id },
      });
      return { success: true, data: result.data };
    });
  },

  async deleteOwn(actingUser: AuthUser, id: string): Promise<LearningActionResult> {
    return safeMutation(async () => {
      const owner = await resolveQuizQuestionCourse(id);
      if (!owner) {
        return { success: false, code: "not_found", message: "Question not found." };
      }
      const access = await requireOwnCourseAccess(actingUser, owner.courseId, { requireDraft: true });
      if (!access.ok) {
        return { success: false, code: access.code, message: access.message };
      }

      await recordLearningAuditLog({
        action: "question_deleted",
        courseId: owner.courseId,
        moduleId: owner.moduleId,
        lessonId: owner.lessonId,
        actorId: actingUser.id,
        metadata: { quizId: owner.quizId, questionId: id },
      });
      await QuizQuestionRepository.delete(id);
      return { success: true, data: undefined };
    });
  },

  /** Same "complete ordered list, exact match required" contract as
   *  `ModuleService.reorderOwn`/`LessonService.reorderOwn`, scoped to one
   *  quiz's questions. */
  async reorderOwn(
    actingUser: AuthUser,
    quizId: string,
    orderedQuestionIds: string[],
  ): Promise<LearningActionResult> {
    return safeMutation(async () => {
      const owner = await resolveQuizCourse(quizId);
      if (!owner) {
        return { success: false, code: "not_found", message: "Quiz not found." };
      }
      const access = await requireOwnCourseAccess(actingUser, owner.courseId, { requireDraft: true });
      if (!access.ok) {
        return { success: false, code: access.code, message: access.message };
      }

      const existing = await QuizQuestionRepository.findByQuizId(quizId);
      const existingIds = new Set(existing.map((q) => q.id));
      const matches =
        orderedQuestionIds.length === existing.length && orderedQuestionIds.every((id) => existingIds.has(id));
      if (!matches) {
        return {
          success: false,
          code: "validation_failed",
          message: "The question list doesn't match this quiz's current questions.",
        };
      }

      await Promise.all(
        orderedQuestionIds.map((id, index) => QuizQuestionRepository.update(id, { position: index })),
      );
      await recordLearningAuditLog({
        action: "question_reordered",
        courseId: owner.courseId,
        moduleId: owner.moduleId,
        lessonId: owner.lessonId,
        actorId: actingUser.id,
        metadata: { quizId },
      });
      return { success: true, data: undefined };
    });
  },
};
