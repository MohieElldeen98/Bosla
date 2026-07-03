import { ModuleRepository, type UpdateModuleRow } from "@/learning/repositories/module.repository";
import { requireCourseManagementAccess } from "@/courses/utils/require-course-access";
import { recordLearningAuditLog } from "@/learning/utils/audit-log";
import { resolveLocalizedText } from "@/cms/utils/resolve-localized";
import { safeMutation, safeRead } from "@/learning/utils/safe-operation";
import type { Locale } from "@/i18n/routing";
import type { Module, ResolvedModule } from "@/learning/types/module";
import type { LearningActionResult } from "@/learning/types/result";
import type { CreateModuleInput, UpdateModuleInput } from "@/learning/validators/module.validator";

function toResolvedModule(module: Module, locale: Locale): ResolvedModule {
  return {
    id: module.id,
    courseId: module.courseId,
    title: resolveLocalizedText(module.title, locale),
    position: module.position,
  };
}

/**
 * Orchestration for `modules` — course curriculum structure, authored by
 * whoever can manage the course itself. Reuses `requireCourseManagementAccess`
 * from the Course Domain as-is (Admin/Super Admin, no Instructor Panel
 * yet — Phase 6) rather than a parallel authorization check: a module is
 * course content, the same authorization boundary as the course it
 * belongs to. `ModuleRepository` is pure data access.
 */
export const ModuleService = {
  async getById(id: string): Promise<Module | null> {
    return safeRead(() => ModuleRepository.findById(id), null);
  },

  async listByCourseId(courseId: string): Promise<Module[]> {
    return safeRead(() => ModuleRepository.findByCourseId(courseId), []);
  },

  async listResolvedByCourseId(courseId: string, locale: Locale): Promise<ResolvedModule[]> {
    const list = await safeRead(() => ModuleRepository.findByCourseId(courseId), []);
    return list.map((module) => toResolvedModule(module, locale));
  },

  async create(input: CreateModuleInput): Promise<LearningActionResult<Module>> {
    return safeMutation(async () => {
      const user = await requireCourseManagementAccess();
      if (!user) {
        return { success: false, code: "forbidden", message: "You cannot manage course curriculum." };
      }
      const created = await ModuleRepository.create(input);
      await recordLearningAuditLog({
        action: "module_created",
        courseId: created.courseId,
        moduleId: created.id,
        actorId: user.id,
      });
      return { success: true, data: created };
    });
  },

  /** `expectedUpdatedAt`, when given, enforces the same optimistic
   *  concurrency as the Course Editor (Step 3.3) — see
   *  `ModuleRepository.update`'s doc comment. */
  async update(
    id: string,
    input: UpdateModuleInput,
    expectedUpdatedAt?: string,
  ): Promise<LearningActionResult<Module>> {
    return safeMutation(async () => {
      const user = await requireCourseManagementAccess();
      if (!user) {
        return { success: false, code: "forbidden", message: "You cannot manage course curriculum." };
      }

      const row: UpdateModuleRow = {};
      if (input.title !== undefined) row.title = input.title;
      if (input.position !== undefined) row.position = input.position;

      const result = await ModuleRepository.update(id, row, expectedUpdatedAt);
      if (result.status === "not_found") {
        return { success: false, code: "not_found", message: "Module not found." };
      }
      if (result.status === "conflict") {
        return {
          success: false,
          code: "conflict",
          message: "This module was changed by someone else. Reload to see the latest version.",
        };
      }

      await recordLearningAuditLog({
        action: "module_updated",
        courseId: result.data.courseId,
        moduleId: result.data.id,
        actorId: user.id,
      });
      return { success: true, data: result.data };
    });
  },

  /** Hard delete — cascades to the module's own lessons (and their
   *  quizzes/questions/progress), per `db/schema/learning.ts`'s cascade
   *  design. No archive/soft-delete concept for curriculum structure,
   *  unlike `courses.status`. */
  async delete(id: string): Promise<LearningActionResult> {
    return safeMutation(async () => {
      const user = await requireCourseManagementAccess();
      if (!user) {
        return { success: false, code: "forbidden", message: "You cannot manage course curriculum." };
      }
      const existing = await ModuleRepository.findById(id);
      if (!existing) {
        return { success: false, code: "not_found", message: "Module not found." };
      }
      await recordLearningAuditLog({
        action: "module_deleted",
        courseId: existing.courseId,
        moduleId: existing.id,
        actorId: user.id,
      });
      await ModuleRepository.delete(id);
      return { success: true, data: undefined };
    });
  },
};
