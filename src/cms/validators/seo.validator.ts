import { z } from "zod";
import { optionalLocalizedTextSchema } from "@/cms/validators/content-blocks.validator";

export const seoMetaSchema = z.object({
  title: optionalLocalizedTextSchema,
  description: optionalLocalizedTextSchema,
  ogImageId: z.string().uuid().nullable().optional(),
  canonicalPath: z.string().optional(),
});
export type SeoMetaInput = z.infer<typeof seoMetaSchema>;
