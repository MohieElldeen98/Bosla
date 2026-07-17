import { LessonAttachmentRepository, type UpdateLessonAttachmentRow } from "@/learning/repositories/lesson-attachment.repository";
import { requireCourseManagementAccess } from "@/courses/utils/require-course-access";
import { requireOwnCourseAccess } from "@/learning/utils/require-own-course-access";
import { resolveLessonCourse } from "@/learning/utils/resolve-lesson-course";
import { recordLearningAuditLog } from "@/learning/utils/audit-log";
import { resolveLocalizedText } from "@/cms/utils/resolve-localized";
import { safeMutation, safeRead } from "@/learning/utils/safe-operation";
import { CmsMediaService } from "@/cms/services/media.service";
import type { Locale } from "@/i18n/routing";
import type { AuthUser } from "@/auth/types/session";
import type { LearningActionResult } from "@/learning/types/result";
import type { LessonAttachment, ResolvedLessonAttachment } from "@/learning/types/lesson-attachment";
import type {
  CreateLessonAttachmentInput,
  UpdateLessonAttachmentInput,
} from "@/learning/validators/lesson-attachment.validator";

/**
 * Orchestration for `lesson_attachments` — mirrors `LessonService`'s
 * split exactly: `create`/`update`/`delete` behind
 * `requireCourseManagementAccess` (Admin/Super Admin), `*Own` variants
 * behind `requireOwnCourseAccess` (the course-owning Instructor, drafts
 * only — an attachment is curriculum content, so it inherits the
 * curriculum's write rules). An attachment has no `courseId` of its own;
 * every gate resolves lesson → module → course first via
 * `resolveLessonCourse`, the shared walker.
 *
 * There is deliberately NO student-facing list method here: the player
 * receives attachments inside `CoursePlayerService.getLessonPlayerData`,
 * whose auth/enrollment/preview gate already decides who may see the
 * lesson at all — a second read path would mean a second gate to keep
 * in sync.
 */
export const LessonAttachmentService = {
  async listByLessonId(lessonId: string): Promise<LessonAttachment[]> {
    return safeRead(() => LessonAttachmentRepository.findByLessonId(lessonId), []);
  },

  async listResolvedByLessonId(lessonId: string, locale: Locale): Promise<ResolvedLessonAttachment[]> {
    const attachments = await safeRead(() => LessonAttachmentRepository.findByLessonId(lessonId), []);
    if (attachments.length === 0) return [];
    const assets = await CmsMediaService.getResolvedByIds(
      attachments.map((attachment) => attachment.mediaAssetId),
      locale,
    );
    const assetById = new Map(assets.map((asset) => [asset.id, asset]));
    return attachments.flatMap((attachment) => {
      const asset = assetById.get(attachment.mediaAssetId);
      if (!asset) return [];
      return [
        {
          id: attachment.id,
          title: resolveLocalizedText(attachment.title, locale),
          url: asset.url,
          mimeType: asset.mimeType,
          fileSize: asset.fileSize,
          position: attachment.position,
        },
      ];
    });
  },

  async create(input: CreateLessonAttachmentInput): Promise<LearningActionResult<LessonAttachment>> {
    return safeMutation(async () => {
      const user = await requireCourseManagementAccess();
      if (!user) {
        return { success: false, code: "forbidden", message: "You cannot manage course curriculum." };
      }
      const owner = await resolveLessonCourse(input.lessonId);
      if (!owner) {
        return { success: false, code: "not_found", message: "Lesson not found." };
      }
      const created = await LessonAttachmentRepository.create(input);
      await recordLearningAuditLog({
        action: "attachment_created",
        courseId: owner.courseId,
        moduleId: owner.moduleId,
        lessonId: input.lessonId,
        actorId: user.id,
      });
      return { success: true, data: created };
    });
  },

  async createOwn(
    actingUser: AuthUser,
    input: CreateLessonAttachmentInput,
  ): Promise<LearningActionResult<LessonAttachment>> {
    return safeMutation(async () => {
      const owner = await resolveLessonCourse(input.lessonId);
      if (!owner) {
        return { success: false, code: "not_found", message: "Lesson not found." };
      }
      const access = await requireOwnCourseAccess(actingUser, owner.courseId, { requireDraft: true });
      if (!access.ok) {
        return { success: false, code: access.code, message: access.message };
      }
      const created = await LessonAttachmentRepository.create(input);
      await recordLearningAuditLog({
        action: "attachment_created",
        courseId: owner.courseId,
        moduleId: owner.moduleId,
        lessonId: input.lessonId,
        actorId: actingUser.id,
      });
      return { success: true, data: created };
    });
  },

  async updateOwn(
    actingUser: AuthUser,
    id: string,
    input: UpdateLessonAttachmentInput,
  ): Promise<LearningActionResult<LessonAttachment>> {
    return safeMutation(async () => {
      const existing = await LessonAttachmentRepository.findById(id);
      if (!existing) {
        return { success: false, code: "not_found", message: "Attachment not found." };
      }
      const owner = await resolveLessonCourse(existing.lessonId);
      if (!owner) {
        return { success: false, code: "not_found", message: "Lesson not found." };
      }
      const access = await requireOwnCourseAccess(actingUser, owner.courseId, { requireDraft: true });
      if (!access.ok) {
        return { success: false, code: access.code, message: access.message };
      }
      const row: UpdateLessonAttachmentRow = {};
      if (input.title !== undefined) row.title = input.title;
      if (input.position !== undefined) row.position = input.position;
      const updated = await LessonAttachmentRepository.update(id, row);
      if (!updated) {
        return { success: false, code: "not_found", message: "Attachment not found." };
      }
      await recordLearningAuditLog({
        action: "attachment_updated",
        courseId: owner.courseId,
        moduleId: owner.moduleId,
        lessonId: existing.lessonId,
        actorId: actingUser.id,
      });
      return { success: true, data: updated };
    });
  },

  async deleteOwn(actingUser: AuthUser, id: string): Promise<LearningActionResult> {
    return safeMutation(async () => {
      const existing = await LessonAttachmentRepository.findById(id);
      if (!existing) {
        return { success: false, code: "not_found", message: "Attachment not found." };
      }
      const owner = await resolveLessonCourse(existing.lessonId);
      if (!owner) {
        return { success: false, code: "not_found", message: "Lesson not found." };
      }
      const access = await requireOwnCourseAccess(actingUser, owner.courseId, { requireDraft: true });
      if (!access.ok) {
        return { success: false, code: access.code, message: access.message };
      }
      await LessonAttachmentRepository.delete(id);
      await recordLearningAuditLog({
        action: "attachment_deleted",
        courseId: owner.courseId,
        moduleId: owner.moduleId,
        lessonId: existing.lessonId,
        actorId: actingUser.id,
      });
      return { success: true, data: undefined };
    });
  },

  async delete(id: string): Promise<LearningActionResult> {
    return safeMutation(async () => {
      const user = await requireCourseManagementAccess();
      if (!user) {
        return { success: false, code: "forbidden", message: "You cannot manage course curriculum." };
      }
      const existing = await LessonAttachmentRepository.findById(id);
      if (!existing) {
        return { success: false, code: "not_found", message: "Attachment not found." };
      }
      const owner = await resolveLessonCourse(existing.lessonId);
      await LessonAttachmentRepository.delete(id);
      await recordLearningAuditLog({
        action: "attachment_deleted",
        courseId: owner?.courseId ?? "",
        moduleId: owner?.moduleId,
        lessonId: existing.lessonId,
        actorId: user.id,
      });
      return { success: true, data: undefined };
    });
  },
};
