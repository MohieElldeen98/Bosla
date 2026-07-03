import {
  QuizQuestionRepository,
  type UpdateQuizQuestionRow,
} from "@/learning/repositories/quiz-question.repository";
import { requireCourseManagementAccess } from "@/courses/utils/require-course-access";
import { resolveLocalizedText } from "@/cms/utils/resolve-localized";
import { safeMutation, safeRead } from "@/learning/utils/safe-operation";
import type { Locale } from "@/i18n/routing";
import type { QuizQuestion, ResolvedQuizQuestion } from "@/learning/types/quiz-question";
import type { LearningActionResult } from "@/learning/types/result";
import type {
  CreateQuizQuestionInput,
  UpdateQuizQuestionInput,
} from "@/learning/validators/quiz-question.validator";

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
 * Orchestration for `quiz_questions` — same authorization boundary as
 * `QuizService` (reuses `requireCourseManagementAccess` as-is).
 * Deliberately not audit-logged at this granularity — see
 * `learningAuditLogs`'s doc comment (`db/schema/learning.ts`): auditing
 * happens at the quiz level, not per-question, matching how CMS audits
 * "save_draft" at the whole-section level, not per field.
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
};
