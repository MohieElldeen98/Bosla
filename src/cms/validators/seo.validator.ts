import { z } from "zod";
import { localizedTextSchema } from "@/cms/validators/content-blocks.validator";

export const seoMetaSchema = z.object({
  title: localizedTextSchema.optional(),
  description: localizedTextSchema.optional(),
  ogImageId: z.string().uuid().optional(),
  canonicalPath: z.string().optional(),
});
export type SeoMetaInput = z.infer<typeof seoMetaSchema>;
