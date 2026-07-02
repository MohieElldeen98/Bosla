import { CmsSectionRepository, type CmsSectionRecord } from "@/cms/repositories/section.repository";
import { validateSectionContent } from "@/cms/validators/section-content.schemas";
import { requireCmsAccess } from "@/cms/utils/require-cms-access";
import { safeMutation, safeRead } from "@/cms/utils/safe-operation";
import type { Locale } from "@/i18n/routing";
import type { CmsSection, ResolvedCmsSection } from "@/cms/types/section";
import type { CmsActionResult } from "@/cms/types/result";
import type { CreateSectionInput, UpdateSectionInput } from "@/cms/validators/section.validator";

/** Recursively flattens every `{en, ar}` leaf in a validated content object
 *  to the active locale's string — content shapes vary per section type, so
 *  this walks the object generically rather than needing one resolver per
 *  type. A leaf is recognized as localized text when it's a plain object
 *  whose keys are exactly the supported locales. */
function resolveContentLocale(content: unknown, locale: Locale, locales: readonly string[]): unknown {
  if (Array.isArray(content)) {
    return content.map((item) => resolveContentLocale(item, locale, locales));
  }
  if (content !== null && typeof content === "object") {
    const keys = Object.keys(content);
    const isLocalizedText =
      keys.length === locales.length && locales.every((loc) => keys.includes(loc));
    if (isLocalizedText) {
      return (content as Record<string, unknown>)[locale];
    }
    return Object.fromEntries(
      Object.entries(content).map(([key, value]) => [key, resolveContentLocale(value, locale, locales)]),
    );
  }
  return content;
}

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

  async update(id: string, input: UpdateSectionInput): Promise<CmsActionResult<CmsSection>> {
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

      const updated = await CmsSectionRepository.update(id, {
        content,
        isEnabled: input.isEnabled,
        position: input.position,
      });
      if (!updated) {
        return { success: false, code: "not_found", message: "Section not found." };
      }
      return { success: true, data: updated as CmsSection };
    });
  },

  async toggleEnabled(id: string, isEnabled: boolean): Promise<CmsActionResult<CmsSection>> {
    return safeMutation(async () => {
      const user = await requireCmsAccess();
      if (!user) {
        return { success: false, code: "forbidden", message: "You cannot edit CMS content." };
      }
      const updated = await CmsSectionRepository.update(id, { isEnabled });
      if (!updated) {
        return { success: false, code: "not_found", message: "Section not found." };
      }
      return { success: true, data: updated as CmsSection };
    });
  },

  async reorder(pageId: string, orderedSectionIds: string[]): Promise<CmsActionResult> {
    return safeMutation(async () => {
      const user = await requireCmsAccess();
      if (!user) {
        return { success: false, code: "forbidden", message: "You cannot edit CMS content." };
      }
      await CmsSectionRepository.reorder(pageId, orderedSectionIds);
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
