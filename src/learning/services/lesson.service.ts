import { LessonRepository, type UpdateLessonRow } from "@/learning/repositories/lesson.repository";
import { ModuleRepository } from "@/learning/repositories/module.repository";
import { requireCourseManagementAccess } from "@/courses/utils/require-course-access";
import { requireOwnCourseAccess } from "@/learning/utils/require-own-course-access";
import { recordLearningAuditLog } from "@/learning/utils/audit-log";
import { resolveLocalizedText } from "@/cms/utils/resolve-localized";
import { safeMutation, safeRead } from "@/learning/utils/safe-operation";
import { QuizService } from "@/learning/services/quiz.service";
import type { Locale } from "@/i18n/routing";
import type { Lesson, ResolvedLesson } from "@/learning/types/lesson";
import type { LearningActionResult } from "@/learning/types/result";
import type { CreateLessonInput, UpdateLessonInput } from "@/learning/validators/lesson.validator";
import type { AuthUser } from "@/auth/types/session";

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
 * Orchestration for `lessons`. `create`/`update`/`delete` reuse
 * `requireCourseManagementAccess` as-is (Admin/Super Admin);
 * `createOwn`/`updateOwn`/`deleteOwn`/`reorderOwn` (Phase 6, Step 6.4)
 * are the Curriculum Builder's Instructor-owned counterparts, gated by
 * `requireOwnCourseAccess`. A lesson doesn't carry its own `courseId`
 * (only `moduleId`), so every method here resolves the owning module
 * first — one extra read, composed the same "no cross-domain SQL joins"
 * way every other service in this codebase does it; for the `Own`
 * methods that resolved module is also what authorization is checked
 * against.
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

  /** Appends to the end of the module's lesson list, same "the caller
   *  never guesses a position" reasoning as `ModuleService.createOwn`.
   *  A `type: "quiz"` lesson also gets its placeholder `Quiz` row
   *  created in the same call — `QuizService.createOwn` (Step 6.4),
   *  reused rather than duplicated; question authoring itself is a
   *  later step's scope, this just ensures the one-to-one `quizzes` row
   *  exists so the lesson is immediately valid. */
  async createOwn(actingUser: AuthUser, input: CreateLessonInput): Promise<LearningActionResult<Lesson>> {
    return safeMutation(async () => {
      const courseModule = await ModuleRepository.findById(input.moduleId);
      if (!courseModule) {
        return { success: false, code: "not_found", message: "Module not found." };
      }
      const access = await requireOwnCourseAccess(actingUser, courseModule.courseId, { requireDraft: true });
      if (!access.ok) {
        return { success: false, code: access.code, message: access.message };
      }

      const existingLessons = await LessonRepository.findByModuleId(input.moduleId);
      const created = await LessonRepository.create({ ...input, position: existingLessons.length });
      await recordLearningAuditLog({
        action: "lesson_created",
        courseId: courseModule.courseId,
        moduleId: courseModule.id,
        lessonId: created.id,
        actorId: actingUser.id,
      });

      if (created.type === "quiz") {
        await QuizService.createOwn(actingUser, created.id);
      }
      return { success: true, data: created };
    });
  },

  /** Title/type/video/body/duration/preview — never `position`, same
   *  "only `reorderOwn` moves things" reasoning as
   *  `ModuleService.updateOwn`. Changing `type` *to* `"quiz"` backfills
   *  the placeholder `Quiz` row if one doesn't already exist yet
   *  (idempotent — see `QuizService.createOwn`). */
  async updateOwn(
    actingUser: AuthUser,
    id: string,
    input: UpdateLessonInput,
    expectedUpdatedAt?: string,
  ): Promise<LearningActionResult<Lesson>> {
    return safeMutation(async () => {
      const existing = await LessonRepository.findById(id);
      if (!existing) {
        return { success: false, code: "not_found", message: "Lesson not found." };
      }
      const courseModule = await ModuleRepository.findById(existing.moduleId);
      if (!courseModule) {
        return { success: false, code: "not_found", message: "Module not found." };
      }
      const access = await requireOwnCourseAccess(actingUser, courseModule.courseId, { requireDraft: true });
      if (!access.ok) {
        return { success: false, code: access.code, message: access.message };
      }

      const row: UpdateLessonRow = {};
      if (input.title !== undefined) row.title = input.title;
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

      await recordLearningAuditLog({
        action: "lesson_updated",
        courseId: courseModule.courseId,
        moduleId: result.data.moduleId,
        lessonId: result.data.id,
        actorId: actingUser.id,
      });

      if (result.data.type === "quiz") {
        await QuizService.createOwn(actingUser, result.data.id);
      }
      return { success: true, data: result.data };
    });
  },

  async deleteOwn(actingUser: AuthUser, id: string): Promise<LearningActionResult> {
    return safeMutation(async () => {
      const existing = await LessonRepository.findById(id);
      if (!existing) {
        return { success: false, code: "not_found", message: "Lesson not found." };
      }
      const courseModule = await ModuleRepository.findById(existing.moduleId);
      if (!courseModule) {
        return { success: false, code: "not_found", message: "Module not found." };
      }
      const access = await requireOwnCourseAccess(actingUser, courseModule.courseId, { requireDraft: true });
      if (!access.ok) {
        return { success: false, code: access.code, message: access.message };
      }

      await recordLearningAuditLog({
        action: "lesson_deleted",
        courseId: courseModule.courseId,
        moduleId: existing.moduleId,
        lessonId: existing.id,
        actorId: actingUser.id,
      });
      await LessonRepository.delete(id);
      return { success: true, data: undefined };
    });
  },

  /** Same "complete ordered list, exact match required" contract as
   *  `ModuleService.reorderOwn`, scoped to one module's lessons rather
   *  than a course's modules. Deliberately doesn't support moving a
   *  lesson to a *different* module in this step — only within-module
   *  reordering, matching the Curriculum Builder's own scope
   *  (Step 6.4). */
  async reorderOwn(actingUser: AuthUser, moduleId: string, orderedLessonIds: string[]): Promise<LearningActionResult> {
    return safeMutation(async () => {
      const courseModule = await ModuleRepository.findById(moduleId);
      if (!courseModule) {
        return { success: false, code: "not_found", message: "Module not found." };
      }
      const access = await requireOwnCourseAccess(actingUser, courseModule.courseId, { requireDraft: true });
      if (!access.ok) {
        return { success: false, code: access.code, message: access.message };
      }

      const existing = await LessonRepository.findByModuleId(moduleId);
      const existingIds = new Set(existing.map((l) => l.id));
      const matches =
        orderedLessonIds.length === existing.length && orderedLessonIds.every((id) => existingIds.has(id));
      if (!matches) {
        return {
          success: false,
          code: "validation_failed",
          message: "The lesson list doesn't match this module's current lessons.",
        };
      }

      await Promise.all(orderedLessonIds.map((id, index) => LessonRepository.update(id, { position: index })));
      await recordLearningAuditLog({
        action: "lesson_reordered",
        courseId: courseModule.courseId,
        moduleId,
        actorId: actingUser.id,
      });
      return { success: true, data: undefined };
    });
  },
};
