import { z } from "zod";

/**
 * One slug format for every Course Domain entity — mirrors
 * `cms/validators/page.validator.ts`'s slug regex exactly. Kept here
 * instead of importing that CMS validator directly, since a slug format
 * rule isn't inherently CMS-specific and this domain shouldn't depend on
 * CMS's validator module just for it.
 */
export const slugSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only.");
