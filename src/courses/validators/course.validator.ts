import { z } from "zod";
import { localizedTextSchema } from "@/cms/validators/content-blocks.validator";
import { slugSchema } from "@/courses/validators/shared";
import { COURSE_LANGUAGES } from "@/courses/types/course-language";
import { COURSE_LEVELS } from "@/courses/types/course-level";
import { COURSE_STATUSES } from "@/courses/types/course-status";
import { COURSE_SORT_FIELDS, SORT_DIRECTIONS } from "@/courses/types/course-search";

/** No `.default()` on the base fields — see
 *  `specialty.validator.ts`'s comment for why (a default survives
 *  `.partial()` in Zod, which would silently reset `level`/`status`/
 *  `language`/`currency` to their defaults on every update that doesn't
 *  mention them). Defaults are applied only on `createCourseSchema`. */
const courseBaseFields = z.object({
  slug: slugSchema,
  title: localizedTextSchema,
  description: localizedTextSchema,
  specialtyId: z.string().uuid(),
  categoryId: z.string().uuid().optional(),
  instructorId: z.string().uuid(),
  level: z.enum(COURSE_LEVELS),
  status: z.enum(COURSE_STATUSES),
  language: z.enum(COURSE_LANGUAGES),
  price: z.number().min(0),
  originalPrice: z.number().min(0).optional(),
  currency: z.string().min(1),
  coverImageId: z.string().uuid().optional(),
});

/** Mirrors the `courses_original_price_check` DB constraint client-side,
 *  so a bad price range is rejected with a field-level Zod error instead
 *  of a raw Postgres constraint-violation message. */
function hasValidPriceRange(data: { price?: number; originalPrice?: number }): boolean {
  if (data.originalPrice === undefined || data.price === undefined) return true;
  return data.originalPrice >= data.price;
}

const priceRangeRefinement: [typeof hasValidPriceRange, { message: string; path: string[] }] = [
  hasValidPriceRange,
  { message: "originalPrice must be greater than or equal to price", path: ["originalPrice"] },
];

export const createCourseSchema = courseBaseFields
  .extend({
    level: z.enum(COURSE_LEVELS).default("beginner"),
    status: z.enum(COURSE_STATUSES).default("draft"),
    language: z.enum(COURSE_LANGUAGES).default("en"),
    currency: z.string().min(1).default("USD"),
  })
  .refine(...priceRangeRefinement);
export type CreateCourseInput = z.infer<typeof createCourseSchema>;

export const updateCourseSchema = courseBaseFields.partial().refine(...priceRangeRefinement);
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
