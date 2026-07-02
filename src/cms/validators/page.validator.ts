import { z } from "zod";

export const createPageSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only."),
  title: z.string().trim().min(1).max(120),
  seoMetaId: z.string().uuid().optional(),
});
export type CreatePageInput = z.infer<typeof createPageSchema>;

export const updatePageSchema = createPageSchema.partial();
export type UpdatePageInput = z.infer<typeof updatePageSchema>;
