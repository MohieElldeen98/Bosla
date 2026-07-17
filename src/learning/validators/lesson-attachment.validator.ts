import { z } from "zod";
import { localizedTextSchema } from "@/cms/validators/content-blocks.validator";

export const createLessonAttachmentSchema = z.object({
  lessonId: z.string().uuid(),
  mediaAssetId: z.string().uuid(),
  title: localizedTextSchema,
  position: z.number().int().min(0).default(0),
});
export type CreateLessonAttachmentInput = z.infer<typeof createLessonAttachmentSchema>;

export const updateLessonAttachmentSchema = z
  .object({
    title: localizedTextSchema,
    position: z.number().int().min(0),
  })
  .partial();
export type UpdateLessonAttachmentInput = z.infer<typeof updateLessonAttachmentSchema>;
