import { z } from "zod";
import { localizedTextSchema, optionalLocalizedTextSchema } from "@/cms/validators/content-blocks.validator";
import { slugSchema } from "@/blog/validators/shared";

/** No `.default()` on the base fields — see
 *  `courses/validators/specialty.validator.ts`'s comment for why (a
 *  default survives `.partial()` in Zod, which would silently reset
 *  `isActive`/`displayOrder` on every update). */
const articleCategoryBaseFields = z.object({
  slug: slugSchema,
  name: localizedTextSchema,
  description: optionalLocalizedTextSchema,
  icon: z.string().min(1).optional(),
  isActive: z.boolean(),
  displayOrder: z.number().int().min(0),
});

export const createArticleCategorySchema = articleCategoryBaseFields.extend({
  isActive: z.boolean().default(true),
  displayOrder: z.number().int().min(0).default(0),
});
export type CreateArticleCategoryInput = z.infer<typeof createArticleCategorySchema>;

export const updateArticleCategorySchema = articleCategoryBaseFields.partial();
export type UpdateArticleCategoryInput = z.infer<typeof updateArticleCategorySchema>;
