import { ArticleSeriesRepository } from "@/blog/repositories/article-series.repository";
import { requireBlogAuthorAccess, requireBlogManagementAccess } from "@/blog/utils/require-blog-access";
import { slugifyTitle } from "@/blog/utils/generate-slug";
import { resolveLocalizedText } from "@/cms/utils/resolve-localized";
import { safeMutation, safeRead } from "@/blog/utils/safe-operation";
import type { Locale } from "@/i18n/routing";
import type { ArticleSeries, NewArticleSeriesInput, ResolvedArticleSeries } from "@/blog/types/article-series";
import type { BlogActionResult } from "@/blog/types/result";
import type { UpdateArticleSeriesInput } from "@/blog/validators/article-series.validator";

function resolved(series: ArticleSeries, locale: Locale): ResolvedArticleSeries { return { ...series, title: resolveLocalizedText(series.title, locale), description: resolveLocalizedText(series.description, locale) }; }
export const ArticleSeriesService = {
  async getById(id: string) { return safeRead(() => ArticleSeriesRepository.findById(id), null); },
  async getBySlug(slug: string) { return safeRead(() => ArticleSeriesRepository.findBySlug(slug), null); },
  async list() { return safeRead(() => ArticleSeriesRepository.findAll(), []); },
  async listResolved(locale: Locale) { return (await ArticleSeriesService.list()).map((s) => resolved(s, locale)); },
  async listActiveResolved(locale: Locale) { return (await ArticleSeriesService.listResolved(locale)).filter((s) => s.isActive); },
  async create(input: NewArticleSeriesInput): Promise<BlogActionResult<ArticleSeries>> { return safeMutation(async () => { const user = await requireBlogManagementAccess(); if (!user) return { success: false, code: "forbidden", message: "You cannot manage the blog." }; if (await ArticleSeriesRepository.findBySlug(input.slug)) return { success: false, code: "conflict", message: `A blog series with slug "${input.slug}" already exists.` }; return { success: true, data: await ArticleSeriesRepository.create(input) }; }); },
  /**
   * Inline creation from the Article Editor — an author starting lesson 1
   * of a new topic must not need the Admin Panel. Author-gated (unlike
   * `create`/`update`/`delete`, which stay manager-only for slug/order
   * curation); the slug is auto-generated collision-proof from the title,
   * mirroring `ArticleService.create`'s convention.
   */
  async createInline(title: string): Promise<BlogActionResult<ArticleSeries>> {
    return safeMutation(async () => {
      const user = await requireBlogAuthorAccess();
      if (!user) {
        return { success: false, code: "forbidden", message: "You cannot create a series." };
      }
      const base = slugifyTitle(title);
      let slug = base;
      for (let n = 2; (await ArticleSeriesRepository.findBySlug(slug)) && n <= 50; n += 1) {
        slug = `${base}-${n}`;
      }
      const created = await ArticleSeriesRepository.create({
        slug,
        title: { en: title, ar: title },
        isActive: true,
        displayOrder: 0,
      });
      return { success: true, data: created };
    });
  },

  async update(id: string, input: UpdateArticleSeriesInput): Promise<BlogActionResult<ArticleSeries>> { return safeMutation(async () => { const user = await requireBlogManagementAccess(); if (!user) return { success: false, code: "forbidden", message: "You cannot manage the blog." }; const data = await ArticleSeriesRepository.update(id, input); return data ? { success: true, data } : { success: false, code: "not_found", message: "Blog series not found." }; }); },
  async delete(id: string): Promise<BlogActionResult> { return safeMutation(async () => { const user = await requireBlogManagementAccess(); if (!user) return { success: false, code: "forbidden", message: "You cannot manage the blog." }; await ArticleSeriesRepository.delete(id); return { success: true, data: undefined }; }); },
};
