import { z } from "zod";
import { localizedTextSchema } from "@/cms/validators/content-blocks.validator";
import { LESSON_TYPES } from "@/learning/types/lesson-type";

/** No `.default()` on the base fields — same `.partial()` reasoning as
 *  every other domain validator here. */
const lessonBaseFields = z.object({
  moduleId: z.string().uuid(),
  title: localizedTextSchema,
  position: z.number().int().min(0),
  type: z.enum(LESSON_TYPES),
  videoAssetId: z.string().uuid().nullable().optional(),
  body: localizedTextSchema.nullable().optional(),
  durationSeconds: z.number().int().min(0).nullable().optional(),
  isPreview: z.boolean(),
});

export const createLessonSchema = lessonBaseFields.extend({
  position: z.number().int().min(0).default(0),
  type: z.enum(LESSON_TYPES).default("video"),
  isPreview: z.boolean().default(false),
});
export type CreateLessonInput = z.infer<typeof createLessonSchema>;

export const updateLessonSchema = lessonBaseFields.omit({ moduleId: true }).partial();
export type UpdateLessonInput = z.infer<typeof updateLessonSchema>;
