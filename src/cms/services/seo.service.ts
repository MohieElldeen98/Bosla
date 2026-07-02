import { CmsSeoRepository } from "@/cms/repositories/seo.repository";
import { requireCmsAccess } from "@/cms/utils/require-cms-access";
import { resolveLocalizedText } from "@/cms/utils/resolve-localized";
import { safeMutation, safeRead } from "@/cms/utils/safe-operation";
import type { Locale } from "@/i18n/routing";
import type { NewSeoMetaInput, ResolvedSeoMeta, SeoMeta } from "@/cms/types/seo";
import type { CmsActionResult } from "@/cms/types/result";

/** Orchestration for `cms_seo_meta` (docs/cms-overview.md §7). */
export const CmsSeoService = {
  async getById(id: string): Promise<SeoMeta | null> {
    return safeRead(() => CmsSeoRepository.findById(id), null);
  },

  async getResolved(id: string, locale: Locale): Promise<ResolvedSeoMeta | null> {
    const seo = await safeRead(() => CmsSeoRepository.findById(id), null);
    if (!seo) return null;
    return {
      id: seo.id,
      title: resolveLocalizedText(seo.title, locale),
      description: resolveLocalizedText(seo.description, locale),
      ogImageId: seo.ogImageId,
      canonicalPath: seo.canonicalPath,
    };
  },

  async create(input: NewSeoMetaInput): Promise<CmsActionResult<SeoMeta>> {
    return safeMutation(async () => {
      const user = await requireCmsAccess();
      if (!user) {
        return { success: false, code: "forbidden", message: "You cannot edit CMS content." };
      }
      const created = await CmsSeoRepository.create(input);
      return { success: true, data: created };
    });
  },

  async update(id: string, input: NewSeoMetaInput): Promise<CmsActionResult<SeoMeta>> {
    return safeMutation(async () => {
      const user = await requireCmsAccess();
      if (!user) {
        return { success: false, code: "forbidden", message: "You cannot edit CMS content." };
      }
      const updated = await CmsSeoRepository.update(id, input);
      if (!updated) {
        return { success: false, code: "not_found", message: "SEO record not found." };
      }
      return { success: true, data: updated };
    });
  },

  async delete(id: string): Promise<CmsActionResult> {
    return safeMutation(async () => {
      const user = await requireCmsAccess();
      if (!user) {
        return { success: false, code: "forbidden", message: "You cannot delete CMS content." };
      }
      await CmsSeoRepository.delete(id);
      return { success: true, data: undefined };
    });
  },
};
