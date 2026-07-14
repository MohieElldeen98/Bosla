import { z } from "zod";

/**
 * One slug format for every Blog domain entity — mirrors
 * `courses/validators/shared.ts`'s slug regex exactly, kept as this
 * domain's own copy per the same reasoning given there.
 */
export const slugSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only.");
