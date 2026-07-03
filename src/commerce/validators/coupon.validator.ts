import { z } from "zod";
import { COUPON_DISCOUNT_TYPES, COUPON_SCOPES } from "@/commerce/types/coupon";
import { COUPON_SORT_DIRECTIONS, COUPON_SORT_FIELDS } from "@/commerce/types/coupon-search";

/**
 * No `.default()` on the base fields — see `courses/validators/
 * specialty.validator.ts`'s comment for why (a default survives
 * `.partial()` in Zod, silently resetting fields on updates that don't
 * mention them). Defaults are applied only on `createCouponSchema`.
 */
const couponBaseFields = z.object({
  code: z
    .string()
    .trim()
    .min(3)
    .max(32)
    .regex(/^[A-Za-z0-9_-]+$/, "Code may only contain letters, numbers, hyphens, and underscores.")
    .transform((value) => value.toUpperCase()),
  discountType: z.enum(COUPON_DISCOUNT_TYPES),
  discountValue: z.number().positive(),
  scope: z.enum(COUPON_SCOPES),
  scopeId: z.string().uuid().nullable().optional(),
  maxRedemptions: z.number().int().positive().nullable().optional(),
  expiresAt: z.string().nullable().optional(),
  isActive: z.boolean(),
});

/** Mirrors the two DB check constraints client-side, so a bad
 *  combination surfaces as a real field-level Zod error instead of a
 *  raw Postgres constraint-violation message — same reasoning
 *  `courses/validators/course.validator.ts`'s `hasValidPriceRange`
 *  gives for its own refinement. */
function hasValidScope(data: { scope?: string; scopeId?: string | null }): boolean {
  if (data.scope === "sitewide") return !data.scopeId;
  return !!data.scopeId;
}

function hasValidPercentage(data: { discountType?: string; discountValue?: number }): boolean {
  if (data.discountType !== "percentage" || data.discountValue === undefined) return true;
  return data.discountValue > 0 && data.discountValue <= 100;
}

const scopeRefinement: [typeof hasValidScope, { message: string; path: string[] }] = [
  hasValidScope,
  { message: "Select a course or specialty for this scope, or choose Sitewide.", path: ["scopeId"] },
];

const percentageRefinement: [typeof hasValidPercentage, { message: string; path: string[] }] = [
  hasValidPercentage,
  { message: "A percentage discount must be between 1 and 100.", path: ["discountValue"] },
];

export const createCouponSchema = couponBaseFields
  .extend({ isActive: z.boolean().default(true) })
  .refine(...scopeRefinement)
  .refine(...percentageRefinement);
export type CreateCouponInput = z.infer<typeof createCouponSchema>;

export const updateCouponSchema = couponBaseFields.partial();
export type UpdateCouponInput = z.infer<typeof updateCouponSchema>;

/** The admin Coupon form's own client-side resolver — same input/output
 *  type-split reasoning as `courses/validators/course.validator.ts`'s
 *  `courseFormSchema` (the `.default()` above makes `isActive` optional
 *  at this schema's Zod *input* type, which `zodResolver` can't
 *  reconcile against a `useForm` generic that's always fully
 *  populated). */
export const couponFormSchema = couponBaseFields;
export type CouponFormValues = z.infer<typeof couponFormSchema>;

/** Parses the admin Coupons listing's URL search params. */
export const searchCouponsSchema = z.object({
  query: z.string().trim().min(1).optional(),
  scope: z.enum(COUPON_SCOPES).optional(),
  isActive: z.coerce.boolean().optional(),
  sortBy: z.enum(COUPON_SORT_FIELDS).optional(),
  sortDirection: z.enum(COUPON_SORT_DIRECTIONS).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});
export type SearchCouponsInput = z.infer<typeof searchCouponsSchema>;

/**
 * The Instructor Coupons page's own, narrower schemas (Phase 6, Step
 * 6.6) — an Instructor's coupon is always `scope: "course"`, targeting
 * one of their own courses; `scope` itself is never a form field (forced
 * server-side in `CouponService.createOwn`), and `scopeId` — which
 * course — is create-only, matching `ModuleFormSheet`'s "`courseId` is
 * fixed by the page this is rendered on" reasoning: once a coupon
 * exists, `updateOwnCouponSchema` doesn't let it be re-pointed at a
 * different course.
 */
export const createOwnCouponSchema = couponBaseFields
  .omit({ scope: true })
  .extend({ scopeId: z.string().uuid(), isActive: z.boolean().default(true) })
  .refine(...percentageRefinement);
export type CreateOwnCouponInput = z.infer<typeof createOwnCouponSchema>;

export const updateOwnCouponSchema = couponBaseFields
  .omit({ scope: true, scopeId: true })
  .partial()
  .refine(...percentageRefinement);
export type UpdateOwnCouponInput = z.infer<typeof updateOwnCouponSchema>;

/** The Instructor Coupon form's own client-side resolver — same
 *  input/output type-split reasoning `couponFormSchema` itself already
 *  gives for the Admin form (the `.default()` on `isActive` above). */
export const ownCouponFormSchema = couponBaseFields.omit({ scope: true }).extend({ scopeId: z.string().uuid() });
export type OwnCouponFormValues = z.infer<typeof ownCouponFormSchema>;
