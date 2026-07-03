import { z } from "zod";
import { localizedTextSchema } from "@/cms/validators/content-blocks.validator";

/** No `.default()` on `position` in the base fields — same reason as
 *  every other domain here: a default survives `.partial()`, which would
 *  silently reset it on updates that don't mention it. */
const moduleBaseFields = z.object({
  courseId: z.string().uuid(),
  title: localizedTextSchema,
  position: z.number().int().min(0),
});

export const createModuleSchema = moduleBaseFields.extend({
  position: z.number().int().min(0).default(0),
});
export type CreateModuleInput = z.infer<typeof createModuleSchema>;

export const updateModuleSchema = moduleBaseFields.omit({ courseId: true }).partial();
export type UpdateModuleInput = z.infer<typeof updateModuleSchema>;
