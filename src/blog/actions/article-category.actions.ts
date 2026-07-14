"use server";

import { ArticleCategoryService } from "@/blog/services/article-category.service";
import {
  createArticleCategorySchema,
  updateArticleCategorySchema,
} from "@/blog/validators/article-category.validator";
import type { ArticleCategory } from "@/blog/types/article-category";
import type { BlogActionResult } from "@/blog/types/result";

export async function createArticleCategoryAction(
  rawInput: unknown,
): Promise<BlogActionResult<ArticleCategory>> {
  const parsed = createArticleCategorySchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      code: "validation_failed",
      message: parsed.error.issues.map((issue) => issue.message).join(" "),
    };
  }
  return ArticleCategoryService.create(parsed.data);
}

export async function updateArticleCategoryAction(
  id: string,
  rawInput: unknown,
): Promise<BlogActionResult<ArticleCategory>> {
  const parsed = updateArticleCategorySchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      code: "validation_failed",
      message: parsed.error.issues.map((issue) => issue.message).join(" "),
    };
  }
  return ArticleCategoryService.update(id, parsed.data);
}

export async function deleteArticleCategoryAction(id: string): Promise<BlogActionResult> {
  return ArticleCategoryService.delete(id);
}
