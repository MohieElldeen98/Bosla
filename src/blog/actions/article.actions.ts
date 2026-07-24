"use server";

import { ArticleService } from "@/blog/services/article.service";
import { requireBlogAuthorAccess } from "@/blog/utils/require-blog-access";
import { createArticleSchema, updateArticleSchema } from "@/blog/validators/article.validator";
import { seoMetaSchema } from "@/cms/validators/seo.validator";
import type { Article } from "@/blog/types/article";
import type { BlogActionResult } from "@/blog/types/result";
import type { SeoMeta } from "@/cms/types/seo";

export async function createArticleAction(rawInput: unknown): Promise<BlogActionResult<Article>> {
  const parsed = createArticleSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      code: "validation_failed",
      message: parsed.error.issues.map((issue) => issue.message).join(" "),
    };
  }
  return ArticleService.create(parsed.data);
}

export async function updateArticleAction(
  id: string,
  rawInput: unknown,
  expectedUpdatedAt?: string,
): Promise<BlogActionResult<Article>> {
  const parsed = updateArticleSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      code: "validation_failed",
      message: parsed.error.issues.map((issue) => issue.message).join(" "),
    };
  }
  return ArticleService.update(id, parsed.data, expectedUpdatedAt);
}

export async function publishArticleAction(
  id: string,
  expectedUpdatedAt?: string,
): Promise<BlogActionResult<Article>> {
  return ArticleService.publish(id, expectedUpdatedAt);
}

export async function unpublishArticleAction(
  id: string,
  expectedUpdatedAt?: string,
): Promise<BlogActionResult<Article>> {
  return ArticleService.unpublish(id, expectedUpdatedAt);
}

export async function deleteArticleAction(id: string): Promise<BlogActionResult> {
  return ArticleService.delete(id);
}

export async function attachArticleSeoMetaAction(id: string): Promise<BlogActionResult<Article>> {
  return ArticleService.attachSeoMeta(id);
}

export async function updateArticleSeoMetaAction(
  id: string,
  rawInput: unknown,
  expectedUpdatedAt?: string,
): Promise<BlogActionResult<SeoMeta>> {
  const parsed = seoMetaSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      code: "validation_failed",
      message: parsed.error.issues.map((issue) => issue.message).join(" "),
    };
  }
  return ArticleService.updateSeo(id, parsed.data, expectedUpdatedAt);
}

/**
 * Backs the public blog's author affordances, which must stay client-side
 * so `/blog` and `/blog/[slug]` keep their ISR caching (the same
 * reasoning as `getMyProfileAction` for the navbar): "may I write?" for
 * the Write Article button, and "may I edit this one?" for the article
 * page's Edit button.
 */
export async function getArticleManageAccessAction(articleId: string): Promise<boolean> {
  const user = await requireBlogAuthorAccess();
  if (!user) return false;
  const article = await ArticleService.getById(articleId);
  if (!article) return false;
  return ArticleService.canManageArticle(user, article);
}

/**
 * The one unauthenticated action in this module — fired once per article
 * view by `ArticleViewTracker` (the public article page is ISR-cached, so
 * counting inside the page render would only count cache rebuilds).
 * Validates the id shape and returns nothing: there is no caller-visible
 * outcome to act on, and no session requirement — guests are exactly who
 * views count.
 */
export async function registerArticleViewAction(id: string): Promise<void> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return;
  await ArticleService.registerView(id);
}
