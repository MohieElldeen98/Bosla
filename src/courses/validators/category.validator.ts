import { z } from "zod";
import { localizedTextSchema, optionalLocalizedTextSchema } from "@/cms/validators/content-blocks.validator";
import { slugSchema } from "@/courses/validators/shared";

/** No `.default()` on the base fields — see `specialty.validator.ts`'s
 *  comment for why (a default survives `.partial()` in Zod, which would
 *  silently reset `isActive`/`displayOrder` on every update). */
const categoryBaseFields = z.object({
  slug: slugSchema,
  name: localizedTextSchema,
  description: optionalLocalizedTextSchema,
  icon: z.string().min(1).optional(),
  specialtyId: z.string().uuid().nullable().optional(),
  isActive: z.boolean(),
  displayOrder: z.number().int().min(0),
});

export const createCategorySchema = categoryBaseFields.extend({
  isActive: z.boolean().default(true),
  displayOrder: z.number().int().min(0).default(0),
});
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = categoryBaseFields.partial();
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
