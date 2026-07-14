import { ArticleCategoryRepository } from "@/blog/repositories/article-category.repository";
import { requireBlogManagementAccess } from "@/blog/utils/require-blog-access";
import { resolveLocalizedText } from "@/cms/utils/resolve-localized";
import { safeMutation, safeRead } from "@/blog/utils/safe-operation";
import type { Locale } from "@/i18n/routing";
import type {
  ArticleCategory,
  NewArticleCategoryInput,
  ResolvedArticleCategory,
} from "@/blog/types/article-category";
import type { BlogActionResult } from "@/blog/types/result";
import type { UpdateArticleCategoryInput } from "@/blog/validators/article-category.validator";

function toResolvedCategory(category: ArticleCategory, locale: Locale): ResolvedArticleCategory {
  return {
    id: category.id,
    slug: category.slug,
    name: resolveLocalizedText(category.name, locale),
    description: resolveLocalizedText(category.description, locale),
    icon: category.icon,
    isActive: category.isActive,
    displayOrder: category.displayOrder,
  };
}

/**
 * Orchestration for `article_categories` — authorization on every
 * mutation, uniqueness on `slug`, locale resolution for reads. Mirrors
 * `CategoryService` (courses) exactly; `ArticleCategoryRepository` is pure
 * data access.
 */
export const ArticleCategoryService = {
  async getById(id: string): Promise<ArticleCategory | null> {
    return safeRead(() => ArticleCategoryRepository.findById(id), null);
  },

  async getBySlug(slug: string): Promise<ArticleCategory | null> {
    return safeRead(() => ArticleCategoryRepository.findBySlug(slug), null);
  },

  async list(): Promise<ArticleCategory[]> {
    return safeRead(() => ArticleCategoryRepository.findAll(), []);
  },

  async listResolved(locale: Locale): Promise<ResolvedArticleCategory[]> {
    const list = await safeRead(() => ArticleCategoryRepository.findAll(), []);
    return list.map((category) => toResolvedCategory(category, locale));
  },

  /** The public blog's "Explore topics" chips — active categories only. */
  async listActiveResolved(locale: Locale): Promise<ResolvedArticleCategory[]> {
    const list = await safeRead(() => ArticleCategoryRepository.findAll(), []);
    return list
      .filter((category) => category.isActive)
      .map((category) => toResolvedCategory(category, locale));
  },

  async create(input: NewArticleCategoryInput): Promise<BlogActionResult<ArticleCategory>> {
    return safeMutation(async () => {
      const user = await requireBlogManagementAccess();
      if (!user) {
        return { success: false, code: "forbidden", message: "You cannot manage the blog." };
      }
      const existing = await ArticleCategoryRepository.findBySlug(input.slug);
      if (existing) {
        return {
          success: false,
          code: "conflict",
          message: `A blog category with slug "${input.slug}" already exists.`,
        };
      }
      const created = await ArticleCategoryRepository.create(input);
      return { success: true, data: created };
    });
  },

  async update(
    id: string,
    input: UpdateArticleCategoryInput,
  ): Promise<BlogActionResult<ArticleCategory>> {
    return safeMutation(async () => {
      const user = await requireBlogManagementAccess();
      if (!user) {
        return { success: false, code: "forbidden", message: "You cannot manage the blog." };
      }
      const updated = await ArticleCategoryRepository.update(id, input);
      if (!updated) {
        return { success: false, code: "not_found", message: "Blog category not found." };
      }
      return { success: true, data: updated };
    });
  },

  async delete(id: string): Promise<BlogActionResult> {
    return safeMutation(async () => {
      const user = await requireBlogManagementAccess();
      if (!user) {
        return { success: false, code: "forbidden", message: "You cannot manage the blog." };
      }
      await ArticleCategoryRepository.delete(id);
      return { success: true, data: undefined };
    });
  },
};
