import { CmsSectionRepository, type CmsSectionRecord } from "@/cms/repositories/section.repository";
import { validateSectionContent } from "@/cms/validators/section-content.schemas";
import { requireCmsAccess } from "@/cms/utils/require-cms-access";
import { resolveContentLocale } from "@/cms/utils/resolve-content-locale";
import { safeMutation, safeRead } from "@/cms/utils/safe-operation";
import { recordAuditLog } from "@/cms/utils/audit-log";
import type { Locale } from "@/i18n/routing";
import type { CmsSection, ResolvedCmsSection } from "@/cms/types/section";
import type { CmsActionResult } from "@/cms/types/result";
import type { CreateSectionInput, UpdateSectionInput } from "@/cms/validators/section.validator";

function toResolvedSection(record: CmsSectionRecord, locale: Locale): ResolvedCmsSection {
  return {
    id: record.id,
    sectionType: record.sectionType,
    isEnabled: record.isEnabled,
    position: record.position,
    content: resolveContentLocale(
      record.content,
      locale,
      ["en", "ar"],
    ) as ResolvedCmsSection["content"],
  };
}

/**
 * Orchestration for `cms_sections` — content validation against the
 * per-type schema registry, locale resolution, ordering, and authorization
 * on every mutation. `CmsSectionRepository` is pure data access; this is
 * where "no hardcoded homepage content" is actually enforced (a section's
 * content can only be saved once it passes its type's Zod schema).
 */
export const CmsSectionService = {
  async getByPageId(pageId: string): Promise<CmsSection[]> {
    const records = await safeRead(() => CmsSectionRepository.findByPageId(pageId), []);
    return records as CmsSection[];
  },

  /** Enabled sections only, resolved to the active locale, ordered by
   *  position — what a future page-rendering pipeline would call. */
  async getResolvedByPageId(pageId: string, locale: Locale): Promise<ResolvedCmsSection[]> {
    const records = await safeRead(() => CmsSectionRepository.findByPageId(pageId), []);
    return records.filter((record) => record.isEnabled).map((record) => toResolvedSection(record, locale));
  },

  async create(input: CreateSectionInput): Promise<CmsActionResult<CmsSection>> {
    return safeMutation(async () => {
      const user = await requireCmsAccess();
      if (!user) {
        return { success: false, code: "forbidden", message: "You cannot edit CMS content." };
      }

      const contentResult = validateSectionContent(input.sectionType, input.content);
      if (!contentResult.success) {
        return {
          success: false,
          code: "validation_failed",
          message: contentResult.error.issues.map((issue) => issue.message).join(" "),
        };
      }

      const created = await CmsSectionRepository.create({
        pageId: input.pageId,
        sectionType: input.sectionType,
        content: contentResult.data,
        isEnabled: input.isEnabled ?? true,
        position: input.position ?? 0,
      });
      return { success: true, data: created as CmsSection };
    });
  },

  /** `expectedUpdatedAt`, when the caller supplies it (every save from the
   *  Homepage editor does — Step 6.6), enforces optimistic concurrency: if
   *  someone else saved this section since the caller last loaded it, this
   *  returns `code: "conflict"` instead of silently overwriting their
   *  change (docs/cms-overview.md §16). */
  async update(
    id: string,
    input: UpdateSectionInput,
    expectedUpdatedAt?: string,
  ): Promise<CmsActionResult<CmsSection>> {
    return safeMutation(async () => {
      const user = await requireCmsAccess();
      if (!user) {
        return { success: false, code: "forbidden", message: "You cannot edit CMS content." };
      }

      const existing = await CmsSectionRepository.findById(id);
      if (!existing) {
        return { success: false, code: "not_found", message: "Section not found." };
      }

      let content: unknown | undefined;
      if (input.content !== undefined) {
        const contentResult = validateSectionContent(existing.sectionType, input.content);
        if (!contentResult.success) {
          return {
            success: false,
            code: "validation_failed",
            message: contentResult.error.issues.map((issue) => issue.message).join(" "),
          };
        }
        content = contentResult.data;
      }

      const result = await CmsSectionRepository.update(
        id,
        { content, isEnabled: input.isEnabled, position: input.position },
        expectedUpdatedAt,
      );
      if (result.status === "not_found") {
        return { success: false, code: "not_found", message: "Section not found." };
      }
      if (result.status === "conflict") {
        return {
          success: false,
          code: "conflict",
          message: "This section was changed by someone else. Reload the page to see the latest version.",
        };
      }

      await recordAuditLog({
        action: "save_draft",
        pageId: existing.pageId,
        sectionId: id,
        actorId: user.id,
        metadata: { sectionType: existing.sectionType },
      });
      return { success: true, data: result.data as CmsSection };
    });
  },

  async toggleEnabled(id: string, isEnabled: boolean): Promise<CmsActionResult<CmsSection>> {
    return safeMutation(async () => {
      const user = await requireCmsAccess();
      if (!user) {
        return { success: false, code: "forbidden", message: "You cannot edit CMS content." };
      }
      const result = await CmsSectionRepository.update(id, { isEnabled });
      if (result.status !== "ok") {
        return { success: false, code: "not_found", message: "Section not found." };
      }

      await recordAuditLog({
        action: "toggle_section",
        pageId: result.data.pageId,
        sectionId: id,
        actorId: user.id,
        metadata: { isEnabled },
      });
      return { success: true, data: result.data as CmsSection };
    });
  },

  async reorder(pageId: string, orderedSectionIds: string[]): Promise<CmsActionResult> {
    return safeMutation(async () => {
      const user = await requireCmsAccess();
      if (!user) {
        return { success: false, code: "forbidden", message: "You cannot edit CMS content." };
      }
      await CmsSectionRepository.reorder(pageId, orderedSectionIds);

      await recordAuditLog({
        action: "reorder_sections",
        pageId,
        actorId: user.id,
        metadata: { orderedSectionIds },
      });
      return { success: true, data: undefined };
    });
  },

  async delete(id: string): Promise<CmsActionResult> {
    return safeMutation(async () => {
      const user = await requireCmsAccess();
      if (!user) {
        return { success: false, code: "forbidden", message: "You cannot delete CMS content." };
      }
      await CmsSectionRepository.delete(id);
      return { success: true, data: undefined };
    });
  },
};
