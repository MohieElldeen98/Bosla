import { z } from "zod";
import { localizedTextSchema, optionalLocalizedTextSchema } from "@/cms/validators/content-blocks.validator";
import { slugSchema } from "@/courses/validators/shared";

/** No `.default()` on the base fields — see `specialty.validator.ts`'s
 *  comment for why (a default survives `.partial()` in Zod, which would
 *  silently reset `isFeatured`/`isActive`/`displayOrder` on every update). */
const instructorBaseFields = z.object({
  slug: slugSchema,
  name: localizedTextSchema,
  title: optionalLocalizedTextSchema,
  qualification: optionalLocalizedTextSchema,
  bio: optionalLocalizedTextSchema,
  specialtyId: z.string().uuid().nullable().optional(),
  experienceYears: z.number().int().min(0).nullable().optional(),
  avatarImageId: z.string().uuid().nullable().optional(),
  publicPortraitImageId: z.string().uuid().nullable().optional(),
  profileId: z.string().uuid().optional(),
  isFeatured: z.boolean(),
  isActive: z.boolean(),
  displayOrder: z.number().int().min(0),
});

export const createInstructorSchema = instructorBaseFields.extend({
  isFeatured: z.boolean().default(false),
  isActive: z.boolean().default(true),
  displayOrder: z.number().int().min(0).default(0),
});
export type CreateInstructorInput = z.infer<typeof createInstructorSchema>;

export const updateInstructorSchema = instructorBaseFields.partial();
export type UpdateInstructorInput = z.infer<typeof updateInstructorSchema>;

/**
 * The Instructor Profile editor's own, narrower schema (Phase 6, Step
 * 6.6) — only the public bio fields an Instructor may self-edit
 * (`slug`/`specialtyId`/`isFeatured`/`isActive`/`displayOrder`/
 * `profileId` stay Admin-managed, omitted here entirely, not just
 * optional). `.nullable()` on every clearable field, not just
 * `.optional()` — this form always resubmits the whole thing on save
 * (like every other CMS-style section form in this codebase), so a
 * field the Instructor cleared must arrive as an explicit `null`, the
 * same reasoning `courseBaseFields`' own doc comment gives.
 */
export const updateOwnInstructorSchema = z.object({
  name: localizedTextSchema,
  title: optionalLocalizedTextSchema,
  qualification: optionalLocalizedTextSchema,
  bio: optionalLocalizedTextSchema,
  experienceYears: z.number().int().min(0).nullable().optional(),
  avatarImageId: z.string().uuid().nullable().optional(),
});
export type UpdateOwnInstructorInput = z.infer<typeof updateOwnInstructorSchema>;

/**
 * The Instructors admin editor's (`/admin/instructors`) own client-side
 * form schema — same "fully-populated shape" reasoning as
 * `course.validator.ts`'s `courseFormSchema`: `instructorToFormValues`
 * always fills every field (`null`, never `undefined`, for anything
 * clearable), so this plugs into `zodResolver` without the optional-input/
 * required-output split `createInstructorSchema`/`updateInstructorSchema`
 * have. `isFeatured`/`displayOrder`/`profileId` are deliberately absent —
 * the Featured Instructors panel is the only place that edits the first
 * two, and linking a real account isn't an editable field yet.
 */
export const instructorFormSchema = z.object({
  slug: slugSchema,
  name: localizedTextSchema,
  title: optionalLocalizedTextSchema,
  qualification: optionalLocalizedTextSchema,
  bio: optionalLocalizedTextSchema,
  specialtyId: z.string().uuid(),
  experienceYears: z.number().int().min(0).nullable(),
  avatarImageId: z.string().uuid().nullable(),
  publicPortraitImageId: z.string().uuid().nullable(),
  isActive: z.boolean(),
});
export type InstructorFormValues = z.infer<typeof instructorFormSchema>;
