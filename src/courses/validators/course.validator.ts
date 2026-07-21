import { z } from "zod";
import { localizedTextSchema } from "@/cms/validators/content-blocks.validator";
import { slugSchema } from "@/courses/validators/shared";
import { COURSE_LANGUAGES } from "@/courses/types/course-language";
import { COURSE_LEVELS } from "@/courses/types/course-level";
import { COURSE_STATUSES } from "@/courses/types/course-status";
import { COURSE_SORT_FIELDS, SORT_DIRECTIONS } from "@/courses/types/course-search";

const localizedTextArraySchema = z.array(localizedTextSchema);

/**
 * No `.default()` on the base fields — see `specialty.validator.ts`'s
 * comment for why (a default survives `.partial()` in Zod, which would
 * silently reset `level`/`status`/`language`/`currency`/`isFree`/
 * `certificateAvailable`/`featured`/the array fields to their defaults on
 * every update that doesn't mention them). Defaults are applied only on
 * `createCourseSchema`.
 *
 * `.nullable()` in addition to `.optional()` on every field that isn't
 * required — the Course Editor (Step 3.3) always submits the *whole* form
 * on save (like every CMS section form), not a true partial PATCH, so a
 * field the admin left blank must arrive as an explicit `null` ("clear
 * it") rather than `undefined` ("field not provided, leave unchanged" —
 * the meaning `undefined` already has for `archive`/`restore`'s narrower
 * `{status: "..."}` patches). Without this, there would be no way to ever
 * remove a previously-set subtitle/category/cover image through the
 * editor once it had a value.
 */
const courseBaseFields = z.object({
  slug: slugSchema,
  title: localizedTextSchema,
  subtitle: localizedTextSchema.nullable().optional(),
  description: localizedTextSchema,
  shortDescription: localizedTextSchema.nullable().optional(),
  specialtyId: z.string().uuid(),
  categoryId: z.string().uuid().nullable().optional(),
  instructorId: z.string().uuid(),
  level: z.enum(COURSE_LEVELS),
  status: z.enum(COURSE_STATUSES),
  language: z.enum(COURSE_LANGUAGES),
  price: z.number().min(0),
  originalPrice: z.number().min(0).nullable().optional(),
  // Deliberately NOT `.datetime()`: this schema backs the editor form via
  // zodResolver, whose typing needs input and output to stay identical —
  // no preprocess/transform. The form's <input type="datetime-local">
  // emits `YYYY-MM-DDTHH:mm` and submit converts it to offset ISO in the
  // admin's own timezone; the refine only rejects unparseable strings.
  // `CourseService` normalizes whatever arrives to ISO before writing.
  saleEndsAt: z
    .string()
    .refine((value) => value === "" || !Number.isNaN(new Date(value).getTime()), "Invalid date")
    .nullable()
    .optional(),
  currency: z.string().min(1),
  isFree: z.boolean(),
  estimatedDurationMinutes: z.number().int().min(0).nullable().optional(),
  certificateAvailable: z.boolean(),
  featured: z.boolean(),
  requirements: localizedTextArraySchema,
  learningObjectives: localizedTextArraySchema,
  targetAudience: localizedTextArraySchema,
  coverImageId: z.string().uuid().nullable().optional(),
  thumbnailId: z.string().uuid().nullable().optional(),
  trailerVideoId: z.string().uuid().nullable().optional(),
});

/** Mirrors the `courses_original_price_check` DB constraint client-side,
 *  so a bad price range is rejected with a field-level Zod error instead
 *  of a raw Postgres constraint-violation message. */
function hasValidPriceRange(data: { price?: number; originalPrice?: number | null }): boolean {
  if (data.originalPrice === undefined || data.originalPrice === null || data.price === undefined) {
    return true;
  }
  return data.originalPrice >= data.price;
}

const priceRangeRefinement: [typeof hasValidPriceRange, { message: string; path: string[] }] = [
  hasValidPriceRange,
  { message: "originalPrice must be greater than or equal to price", path: ["originalPrice"] },
];

/**
 * The Course Editor's (Step 3.3) own client-side resolver — `courseBaseFields`
 * already has every field at the "required" type-level shape the editor's
 * `courseToFormValues` always populates (no field is ever left
 * `undefined` in form state, only genuinely-blank ones as `null`), so this
 * plugs in as `zodResolver`'s schema without the input/output type split
 * `createCourseSchema` has: that schema's `.extend({...default(...)})`
 * makes several fields optional at its Zod *input* type (defaults fill
 * them at parse time) while `z.infer` reports the *output* type as
 * required — a mismatch `zodResolver` can't reconcile against a `useForm`
 * generic that's always fully populated. Both schemas independently
 * enforce the same rules; `createCourseSchema` is still what
 * `createCourseAction` re-validates against server-side.
 */
export const courseFormSchema = courseBaseFields
  // Authors never see or set slugs (the article contract): the editor
  // submits `""` on create and the service generates a unique slug from
  // the title. Edit keeps the stored slug in form state untouched.
  .extend({ slug: z.union([slugSchema, z.literal("")]) })
  .refine(...priceRangeRefinement);
export type CourseFormValues = z.infer<typeof courseFormSchema>;

export const createCourseSchema = courseBaseFields
  .extend({
    // Blank = "generate from the title" — see `courseFormSchema`'s note.
    slug: z.union([slugSchema, z.literal("")]).default(""),
    level: z.enum(COURSE_LEVELS).default("beginner"),
    status: z.enum(COURSE_STATUSES).default("draft"),
    language: z.enum(COURSE_LANGUAGES).default("en"),
    currency: z.string().min(1).default("EGP"),
    isFree: z.boolean().default(false),
    certificateAvailable: z.boolean().default(false),
    featured: z.boolean().default(false),
    requirements: localizedTextArraySchema.default([]),
    learningObjectives: localizedTextArraySchema.default([]),
    targetAudience: localizedTextArraySchema.default([]),
  })
  .refine(...priceRangeRefinement);
export type CreateCourseInput = z.infer<typeof createCourseSchema>;

/**
 * `status` is deliberately omitted here — Phase 6 Step 6.2's course state
 * machine means a course's status can no longer be set to an arbitrary
 * value through the general edit form; it only changes through the
 * dedicated, authorized transition methods (`CourseService
 * .submitForReview`/`.approve`/`.reject`/`.archive`/`.restore`). Initial
 * status is still freely choosable at creation time (`createCourseSchema`
 * below, unchanged) — this restriction is about *transitions*, not the
 * starting value.
 */
export const updateCourseSchema = courseBaseFields
  .omit({ status: true })
  .partial()
  .refine(...priceRangeRefinement);
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;

/**
 * Parses the admin course listing's URL search params (Step 3.2) — every
 * field optional and defensively coerced (`z.coerce.number()` for
 * page/pageSize, since URL search params always arrive as strings), so a
 * malformed or missing param degrades to "no filter"/"use the default"
 * rather than throwing.
 */
export const searchCoursesSchema = z.object({
  query: z.string().trim().min(1).optional(),
  status: z.enum(COURSE_STATUSES).optional(),
  specialtyId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  instructorId: z.string().uuid().optional(),
  sortBy: z.enum(COURSE_SORT_FIELDS).optional(),
  sortDirection: z.enum(SORT_DIRECTIONS).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});
export type SearchCoursesInput = z.infer<typeof searchCoursesSchema>;

/** Sort options exposed to *visitors* on `/courses` (Step 3.4) — a
 *  curated subset of `COURSE_SORT_FIELDS`: `slug`/`status` aren't
 *  meaningful to a visitor, and `updatedAt` doesn't matter publicly the
 *  way `createdAt` ("Newest") does. */
export const PUBLIC_COURSE_SORT_FIELDS = ["createdAt", "price", "estimatedDurationMinutes"] as const;

/**
 * Parses the public course catalog's URL search params (Step 3.4).
 * Deliberately has **no `status` or `instructorId` field** — unlike
 * `searchCoursesSchema` (the admin listing's), so there is no way for a
 * URL param to ever select a non-published course; the page always
 * passes `status: "published", onlyActive: true` itself, hard-coded, not
 * sourced from user input.
 */
export const publicSearchCoursesSchema = z.object({
  query: z.string().trim().min(1).optional(),
  specialtyId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  language: z.enum(COURSE_LANGUAGES).optional(),
  level: z.enum(COURSE_LEVELS).optional(),
  price: z.enum(["free", "paid"]).optional(),
  // Not `z.coerce.boolean()` — that coerces via JS's `Boolean(...)`, so
  // the literal string `"false"` (a truthy non-empty string) would parse
  // as `true`. The UI only ever sets `featured=true` or omits the param
  // entirely (an unchecked "Featured only" filter means "no filter", not
  // "featured=false"), so an explicit-`"true"`-only parse is correct and
  // safer.
  featured: z
    .enum(["true"])
    .transform(() => true)
    .optional(),
  sortBy: z.enum(PUBLIC_COURSE_SORT_FIELDS).optional(),
  sortDirection: z.enum(SORT_DIRECTIONS).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(48).optional(),
});
export type PublicSearchCoursesInput = Omit<z.infer<typeof publicSearchCoursesSchema>, "price"> & {
  price?: "free" | "paid";
  isFree?: boolean;
};
