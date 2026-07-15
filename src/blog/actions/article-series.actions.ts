"use server";

import { z } from "zod";
import { ArticleSeriesService } from "@/blog/services/article-series.service";
import { createArticleSeriesSchema, updateArticleSeriesSchema } from "@/blog/validators/article-series.validator";
import type { ArticleSeries } from "@/blog/types/article-series";
import type { BlogActionResult } from "@/blog/types/result";
export async function createArticleSeriesAction(raw: unknown): Promise<BlogActionResult<ArticleSeries>> { const parsed = createArticleSeriesSchema.safeParse(raw); return parsed.success ? ArticleSeriesService.create(parsed.data) : { success: false, code: "validation_failed", message: parsed.error.issues.map((i) => i.message).join(" ") }; }
export async function updateArticleSeriesAction(id: string, raw: unknown): Promise<BlogActionResult<ArticleSeries>> { const parsed = updateArticleSeriesSchema.safeParse(raw); return parsed.success ? ArticleSeriesService.update(id, parsed.data) : { success: false, code: "validation_failed", message: parsed.error.issues.map((i) => i.message).join(" ") }; }
export async function deleteArticleSeriesAction(id: string): Promise<BlogActionResult> { return ArticleSeriesService.delete(id); }

/** The Article Editor's inline "+ new series" — title only; slug and the
 *  rest are service-generated. Author-gated inside the service. */
export async function createArticleSeriesInlineAction(rawTitle: unknown): Promise<BlogActionResult<ArticleSeries>> {
  const parsed = z.string().trim().min(1).max(120).safeParse(rawTitle);
  if (!parsed.success) {
    return { success: false, code: "validation_failed", message: "A series needs a title." };
  }
  return ArticleSeriesService.createInline(parsed.data);
}
