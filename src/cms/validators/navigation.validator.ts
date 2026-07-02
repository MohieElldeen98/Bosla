import { z } from "zod";
import { localizedTextSchema } from "@/cms/validators/content-blocks.validator";
import { NAVIGATION_LOCATIONS } from "@/cms/types/navigation";

export const createNavigationItemSchema = z.object({
  location: z.enum(NAVIGATION_LOCATIONS),
  label: localizedTextSchema,
  href: z.string().min(1),
  icon: z.string().optional(),
  position: z.number().int().min(0).default(0),
  isEnabled: z.boolean().default(true),
});
export type CreateNavigationItemInput = z.infer<typeof createNavigationItemSchema>;

export const updateNavigationItemSchema = createNavigationItemSchema.partial();
export type UpdateNavigationItemInput = z.infer<typeof updateNavigationItemSchema>;
