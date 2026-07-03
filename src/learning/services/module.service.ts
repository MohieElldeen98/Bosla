import { ModuleRepository, type UpdateModuleRow } from "@/learning/repositories/module.repository";
import { requireCourseManagementAccess } from "@/courses/utils/require-course-access";
import { requireOwnCourseAccess } from "@/learning/utils/require-own-course-access";
import { recordLearningAuditLog } from "@/learning/utils/audit-log";
import { resolveLocalizedText } from "@/cms/utils/resolve-localized";
import { safeMutation, safeRead } from "@/learning/utils/safe-operation";
import type { Locale } from "@/i18n/routing";
import type { Module, ResolvedModule } from "@/learning/types/module";
import type { LearningActionResult } from "@/learning/types/result";
import type { CreateModuleInput, UpdateModuleInput } from "@/learning/validators/module.validator";
import type { AuthUser } from "@/auth/types/session";

function toResolvedModule(module: Module, locale: Locale): ResolvedModule {
  return {
    id: module.id,
    courseId: module.courseId,
    title: resolveLocalizedText(module.title, locale),
    position: module.position,
  };
}

/**
 * Orchestration for `modules` — course curriculum structure. `create`/
 * `update`/`delete` reuse `requireCourseManagementAccess` from the
 * Course Domain as-is (Admin/Super Admin). `createOwn`/`updateOwn`/
 * `deleteOwn`/`reorderOwn` (Phase 6, Step 6.4) are the Instructor
 * Panel's Curriculum Builder counterparts — same repository calls, same
 * audit logging, gated by `requireOwnCourseAccess` instead (the course's
 * own instructor, `draft`-only). `ModuleRepository` is pure data access
 * either way.
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

  /** The Curriculum Builder's own read (`/instructor/courses/[id]
   *  /curriculum`, Step 6.4) — ownership-gated, no `requireDraft` (an
   *  Instructor can still *view* their curriculum once submitted, just
   *  not edit it). Empty for a course that isn't theirs, same "fail
   *  closed" precedent `InstructorApplicationService.searchResolved`
   *  established. */
  async listResolvedByCourseIdForInstructor(
    actingUser: AuthUser,
    courseId: string,
    locale: Locale,
  ): Promise<ResolvedModule[]> {
    const access = await requireOwnCourseAccess(actingUser, courseId);
    if (!access.ok) return [];
    return ModuleService.listResolvedByCourseId(courseId, locale);
  },

  /** Appends to the end of the course's module list — the Curriculum
   *  Builder's "Add Module" always adds last, so the caller never has to
   *  guess a `position`; unlike `create` (Admin), `input.position` is
   *  never read. */
  async createOwn(actingUser: AuthUser, input: CreateModuleInput): Promise<LearningActionResult<Module>> {
    return safeMutation(async () => {
      const access = await requireOwnCourseAccess(actingUser, input.courseId, { requireDraft: true });
      if (!access.ok) {
        return { success: false, code: access.code, message: access.message };
      }
      const existing = await ModuleRepository.findByCourseId(input.courseId);
      const created = await ModuleRepository.create({ ...input, position: existing.length });
      await recordLearningAuditLog({
        action: "module_created",
        courseId: created.courseId,
        moduleId: created.id,
        actorId: actingUser.id,
      });
      return { success: true, data: created };
    });
  },

  /** Title only — `position` is never accepted here, only through
   *  `reorderOwn` below, so a stale client can never clobber a reorder
   *  another tab just made by resubmitting an old position. */
  async updateOwn(
    actingUser: AuthUser,
    id: string,
    input: UpdateModuleInput,
    expectedUpdatedAt?: string,
  ): Promise<LearningActionResult<Module>> {
    return safeMutation(async () => {
      const existing = await ModuleRepository.findById(id);
      if (!existing) {
        return { success: false, code: "not_found", message: "Module not found." };
      }
      const access = await requireOwnCourseAccess(actingUser, existing.courseId, { requireDraft: true });
      if (!access.ok) {
        return { success: false, code: access.code, message: access.message };
      }

      const row: UpdateModuleRow = {};
      if (input.title !== undefined) row.title = input.title;

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
        actorId: actingUser.id,
      });
      return { success: true, data: result.data };
    });
  },

  async deleteOwn(actingUser: AuthUser, id: string): Promise<LearningActionResult> {
    return safeMutation(async () => {
      const existing = await ModuleRepository.findById(id);
      if (!existing) {
        return { success: false, code: "not_found", message: "Module not found." };
      }
      const access = await requireOwnCourseAccess(actingUser, existing.courseId, { requireDraft: true });
      if (!access.ok) {
        return { success: false, code: access.code, message: access.message };
      }
      await recordLearningAuditLog({
        action: "module_deleted",
        courseId: existing.courseId,
        moduleId: existing.id,
        actorId: actingUser.id,
      });
      await ModuleRepository.delete(id);
      return { success: true, data: undefined };
    });
  },

  /**
   * Persists a new module order after a Curriculum Builder drag — takes
   * the *complete* ordered list of the course's module ids and writes
   * each one's `position` to its index. Rejects a list that doesn't
   * exactly match the course's current modules (wrong length, an id
   * from another course, a missing id) rather than silently applying a
   * partial reorder — the same "never trust the client for anything
   * ownership-relevant" posture `createOwn`/`updateOwn` already take,
   * applied to which *rows* are being touched, not just whose course
   * they're on. No per-item `expectedUpdatedAt`: a bulk position rewrite
   * isn't a single-field edit, and only one Instructor can ever be
   * dragging their own course's tree at a time in practice.
   */
  async reorderOwn(actingUser: AuthUser, courseId: string, orderedModuleIds: string[]): Promise<LearningActionResult> {
    return safeMutation(async () => {
      const access = await requireOwnCourseAccess(actingUser, courseId, { requireDraft: true });
      if (!access.ok) {
        return { success: false, code: access.code, message: access.message };
      }
      const existing = await ModuleRepository.findByCourseId(courseId);
      const existingIds = new Set(existing.map((m) => m.id));
      const matches =
        orderedModuleIds.length === existing.length && orderedModuleIds.every((id) => existingIds.has(id));
      if (!matches) {
        return {
          success: false,
          code: "validation_failed",
          message: "The module list doesn't match this course's current modules.",
        };
      }

      await Promise.all(orderedModuleIds.map((id, index) => ModuleRepository.update(id, { position: index })));
      await recordLearningAuditLog({ action: "module_reordered", courseId, actorId: actingUser.id });
      return { success: true, data: undefined };
    });
  },
};
