import { z } from "zod";
import { localizedTextSchema, optionalLocalizedTextSchema } from "@/cms/validators/content-blocks.validator";
import { slugSchema } from "@/blog/validators/shared";

const base = z.object({
  slug: slugSchema,
  title: localizedTextSchema,
  description: optionalLocalizedTextSchema,
  isActive: z.boolean(),
  displayOrder: z.number().int().min(0),
});
export const createArticleSeriesSchema = base.extend({
  isActive: z.boolean().default(true),
  displayOrder: z.number().int().min(0).default(0),
});
export type CreateArticleSeriesInput = z.infer<typeof createArticleSeriesSchema>;
export const updateArticleSeriesSchema = base.partial();
export type UpdateArticleSeriesInput = z.infer<typeof updateArticleSeriesSchema>;
