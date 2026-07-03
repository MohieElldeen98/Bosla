import { LessonRepository, type UpdateLessonRow } from "@/learning/repositories/lesson.repository";
import { ModuleRepository } from "@/learning/repositories/module.repository";
import { requireCourseManagementAccess } from "@/courses/utils/require-course-access";
import { recordLearningAuditLog } from "@/learning/utils/audit-log";
import { resolveLocalizedText } from "@/cms/utils/resolve-localized";
import { safeMutation, safeRead } from "@/learning/utils/safe-operation";
import type { Locale } from "@/i18n/routing";
import type { Lesson, ResolvedLesson } from "@/learning/types/lesson";
import type { LearningActionResult } from "@/learning/types/result";
import type { CreateLessonInput, UpdateLessonInput } from "@/learning/validators/lesson.validator";

function toResolvedLesson(lesson: Lesson, locale: Locale): ResolvedLesson {
  return {
    id: lesson.id,
    moduleId: lesson.moduleId,
    title: resolveLocalizedText(lesson.title, locale),
    position: lesson.position,
    type: lesson.type,
    videoAssetId: lesson.videoAssetId,
    body: resolveLocalizedText(lesson.body, locale),
    durationSeconds: lesson.durationSeconds,
    isPreview: lesson.isPreview,
  };
}

/**
 * Orchestration for `lessons` — same authorization boundary as
 * `ModuleService` (reuses `requireCourseManagementAccess` as-is). A
 * lesson doesn't carry its own `courseId` (only `moduleId`), so audit
 * logging here resolves the owning module first — one extra read,
 * composed the same "no cross-domain SQL joins" way every other service
 * in this codebase does it.
 */
export const LessonService = {
  async getById(id: string): Promise<Lesson | null> {
    return safeRead(() => LessonRepository.findById(id), null);
  },

  async listByModuleId(moduleId: string): Promise<Lesson[]> {
    return safeRead(() => LessonRepository.findByModuleId(moduleId), []);
  },

  async listResolvedByModuleId(moduleId: string, locale: Locale): Promise<ResolvedLesson[]> {
    const list = await safeRead(() => LessonRepository.findByModuleId(moduleId), []);
    return list.map((lesson) => toResolvedLesson(lesson, locale));
  },

  async create(input: CreateLessonInput): Promise<LearningActionResult<Lesson>> {
    return safeMutation(async () => {
      const user = await requireCourseManagementAccess();
      if (!user) {
        return { success: false, code: "forbidden", message: "You cannot manage course curriculum." };
      }
      const courseModule = await ModuleRepository.findById(input.moduleId);
      if (!courseModule) {
        return { success: false, code: "not_found", message: "Module not found." };
      }
      const created = await LessonRepository.create(input);
      await recordLearningAuditLog({
        action: "lesson_created",
        courseId: courseModule.courseId,
        moduleId: courseModule.id,
        lessonId: created.id,
        actorId: user.id,
      });
      return { success: true, data: created };
    });
  },

  async update(
    id: string,
    input: UpdateLessonInput,
    expectedUpdatedAt?: string,
  ): Promise<LearningActionResult<Lesson>> {
    return safeMutation(async () => {
      const user = await requireCourseManagementAccess();
      if (!user) {
        return { success: false, code: "forbidden", message: "You cannot manage course curriculum." };
      }

      const row: UpdateLessonRow = {};
      if (input.title !== undefined) row.title = input.title;
      if (input.position !== undefined) row.position = input.position;
      if (input.type !== undefined) row.type = input.type;
      if (input.videoAssetId !== undefined) row.videoAssetId = input.videoAssetId;
      if (input.body !== undefined) row.body = input.body;
      if (input.durationSeconds !== undefined) row.durationSeconds = input.durationSeconds;
      if (input.isPreview !== undefined) row.isPreview = input.isPreview;

      const result = await LessonRepository.update(id, row, expectedUpdatedAt);
      if (result.status === "not_found") {
        return { success: false, code: "not_found", message: "Lesson not found." };
      }
      if (result.status === "conflict") {
        return {
          success: false,
          code: "conflict",
          message: "This lesson was changed by someone else. Reload to see the latest version.",
        };
      }

      const courseModule = await ModuleRepository.findById(result.data.moduleId);
      if (courseModule) {
        await recordLearningAuditLog({
          action: "lesson_updated",
          courseId: courseModule.courseId,
          moduleId: result.data.moduleId,
          lessonId: result.data.id,
          actorId: user.id,
        });
      }
      return { success: true, data: result.data };
    });
  },

  /** Hard delete — cascades to the lesson's own quiz/questions/progress
   *  rows, per `db/schema/learning.ts`'s cascade design. */
  async delete(id: string): Promise<LearningActionResult> {
    return safeMutation(async () => {
      const user = await requireCourseManagementAccess();
      if (!user) {
        return { success: false, code: "forbidden", message: "You cannot manage course curriculum." };
      }
      const existing = await LessonRepository.findById(id);
      if (!existing) {
        return { success: false, code: "not_found", message: "Lesson not found." };
      }
      const courseModule = await ModuleRepository.findById(existing.moduleId);
      if (courseModule) {
        await recordLearningAuditLog({
          action: "lesson_deleted",
          courseId: courseModule.courseId,
          moduleId: existing.moduleId,
          lessonId: existing.id,
          actorId: user.id,
        });
      }
      await LessonRepository.delete(id);
      return { success: true, data: undefined };
    });
  },
};
