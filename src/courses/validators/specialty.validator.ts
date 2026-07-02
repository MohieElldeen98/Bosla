import { z } from "zod";
import { localizedTextSchema, optionalLocalizedTextSchema } from "@/cms/validators/content-blocks.validator";
import { slugSchema } from "@/courses/validators/shared";

/**
 * No `.default()` on the base fields — a default survives `.partial()` in
 * Zod (an omitted key still gets filled with its default value), which
 * would make `updateSpecialtySchema` silently reset `isActive`/
 * `displayOrder` to their defaults on every update that doesn't mention
 * them. Defaults are applied only on `createSpecialtySchema`, where "not
 * provided" should genuinely mean "use the default."
 */
const specialtyBaseFields = z.object({
  slug: slugSchema,
  name: localizedTextSchema,
  description: optionalLocalizedTextSchema,
  icon: z.string().min(1).optional(),
  isActive: z.boolean(),
  displayOrder: z.number().int().min(0),
});

export const createSpecialtySchema = specialtyBaseFields.extend({
  isActive: z.boolean().default(true),
  displayOrder: z.number().int().min(0).default(0),
});
export type CreateSpecialtyInput = z.infer<typeof createSpecialtySchema>;

export const updateSpecialtySchema = specialtyBaseFields.partial();
export type UpdateSpecialtyInput = z.infer<typeof updateSpecialtySchema>;
