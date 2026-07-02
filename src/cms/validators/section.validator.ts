import { z } from "zod";
import { CMS_SECTION_TYPES } from "@/cms/types/section";

/**
 * Validates everything about a section EXCEPT `content` — content is
 * validated separately, against the type-specific schema in
 * `section-content.schemas.ts`'s registry, since its shape depends on
 * `sectionType`. Keeping the two separate avoids one giant discriminated
 * union schema that would need updating in two places for one new field.
 */
export const createSectionSchema = z.object({
  pageId: z.string().uuid(),
  sectionType: z.enum(CMS_SECTION_TYPES),
  content: z.unknown(),
  isEnabled: z.boolean().default(true),
  position: z.number().int().min(0).default(0),
});
export type CreateSectionInput = z.infer<typeof createSectionSchema>;

export const updateSectionSchema = z.object({
  content: z.unknown().optional(),
  isEnabled: z.boolean().optional(),
  position: z.number().int().min(0).optional(),
});
export type UpdateSectionInput = z.infer<typeof updateSectionSchema>;

export const reorderSectionsSchema = z.object({
  pageId: z.string().uuid(),
  orderedSectionIds: z.array(z.string().uuid()).min(1),
});
export type ReorderSectionsInput = z.infer<typeof reorderSectionsSchema>;
