import { CmsPageRepository } from "@/cms/repositories/page.repository";
import { CmsSectionService } from "@/cms/services/section.service";
import { CmsSeoService } from "@/cms/services/seo.service";
import { requireCmsAccess } from "@/cms/utils/require-cms-access";
import { safeMutation, safeRead } from "@/cms/utils/safe-operation";
import type { Locale } from "@/i18n/routing";
import type { CmsPage, NewCmsPageInput, ResolvedCmsPage } from "@/cms/types/page";
import type { CmsActionResult } from "@/cms/types/result";
import type { UpdatePageInput } from "@/cms/validators/page.validator";

/**
 * Orchestration for `cms_pages`. `slug: "home"` is the homepage; any other
 * slug is a landing page — both go through this same service
 * (docs/cms-overview.md §11). See "Migration path" in
 * docs/cms-overview.md for how this relates to today's live, mock-driven
 * homepage — this service is not wired into it yet.
 */
export const CmsPageService = {
  async getBySlug(slug: string): Promise<CmsPage | null> {
    return safeRead(() => CmsPageRepository.findBySlug(slug), null);
  },

  async getById(id: string): Promise<CmsPage | null> {
    return safeRead(() => CmsPageRepository.findById(id), null);
  },

  async list(): Promise<CmsPage[]> {
    return safeRead(() => CmsPageRepository.findAll(), []);
  },

  /** A page with its enabled sections (resolved to `locale`) and SEO meta
   *  in one call — what a future page-rendering pipeline would use. */
  async getResolvedBySlug(slug: string, locale: Locale): Promise<ResolvedCmsPage | null> {
    const page = await CmsPageRepository.findBySlug(slug);
    if (!page) return null;

    const [sections, seo] = await Promise.all([
      CmsSectionService.getResolvedByPageId(page.id, locale),
      page.seoMetaId ? CmsSeoService.getResolved(page.seoMetaId, locale) : Promise.resolve(null),
    ]);

    return { id: page.id, slug: page.slug, title: page.title, seo, sections };
  },

  async create(input: NewCmsPageInput): Promise<CmsActionResult<CmsPage>> {
    return safeMutation(async () => {
      const user = await requireCmsAccess();
      if (!user) {
        return { success: false, code: "forbidden", message: "You cannot edit CMS content." };
      }
      const existing = await CmsPageRepository.findBySlug(input.slug);
      if (existing) {
        return { success: false, code: "conflict", message: `A page with slug "${input.slug}" already exists.` };
      }
      const created = await CmsPageRepository.create(input);
      return { success: true, data: created };
    });
  },

  async update(id: string, input: UpdatePageInput): Promise<CmsActionResult<CmsPage>> {
    return safeMutation(async () => {
      const user = await requireCmsAccess();
      if (!user) {
        return { success: false, code: "forbidden", message: "You cannot edit CMS content." };
      }
      const updated = await CmsPageRepository.update(id, input);
      if (!updated) {
        return { success: false, code: "not_found", message: "Page not found." };
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
      await CmsPageRepository.delete(id);
      return { success: true, data: undefined };
    });
  },
};
