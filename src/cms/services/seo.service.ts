import { CmsSeoRepository } from "@/cms/repositories/seo.repository";
import { requireCmsAccess } from "@/cms/utils/require-cms-access";
import { resolveLocalizedText } from "@/cms/utils/resolve-localized";
import { safeMutation, safeRead } from "@/cms/utils/safe-operation";
import { recordAuditLog } from "@/cms/utils/audit-log";
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

  /** `pageId`, when the caller supplies it, is used only to attribute the
   *  audit-log entry — `cms_seo_meta` has no back-reference to `cms_pages`
   *  (the FK points the other way), so the caller (which already has
   *  `pageId` in scope, e.g. `HomepageEditor`) passes it through rather
   *  than this doing a reverse lookup. `expectedUpdatedAt` enforces the
   *  same optimistic concurrency as section saves (docs/cms-overview.md
   *  §16). */
  async update(
    id: string,
    input: NewSeoMetaInput,
    expectedUpdatedAt?: string,
    pageId?: string,
  ): Promise<CmsActionResult<SeoMeta>> {
    return safeMutation(async () => {
      const user = await requireCmsAccess();
      if (!user) {
        return { success: false, code: "forbidden", message: "You cannot edit CMS content." };
      }

      const result = await CmsSeoRepository.update(id, input, expectedUpdatedAt);
      if (result.status === "not_found") {
        return { success: false, code: "not_found", message: "SEO record not found." };
      }
      if (result.status === "conflict") {
        return {
          success: false,
          code: "conflict",
          message: "This record was changed by someone else. Reload the page to see the latest version.",
        };
      }

      if (pageId) {
        await recordAuditLog({
          action: "save_draft",
          pageId,
          actorId: user.id,
          metadata: { target: "seo" },
        });
      }
      return { success: true, data: result.data };
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
