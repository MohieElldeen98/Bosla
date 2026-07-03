/** Mirrors `db/schema/commerce.ts`'s `coupon_discount_type`/`coupon_scope`
 *  Postgres enums exactly. */
export const COUPON_DISCOUNT_TYPES = ["percentage", "fixed_amount"] as const;
export type CouponDiscountType = (typeof COUPON_DISCOUNT_TYPES)[number];

export const COUPON_SCOPES = ["course", "specialty", "sitewide"] as const;
export type CouponScope = (typeof COUPON_SCOPES)[number];

/** Mirrors `db/schema/commerce.ts`'s `coupons` table. `scopeId` is
 *  `null` iff `scope === "sitewide"` (DB check constraint enforces
 *  this) — otherwise it's a `courses.id` (scope `"course"`) or a
 *  `specialties.id` (scope `"specialty"`), not a real foreign key since
 *  a single column can't target two different tables. */
export interface Coupon {
  id: string;
  code: string;
  discountType: CouponDiscountType;
  discountValue: string;
  scope: CouponScope;
  scopeId: string | null;
  maxRedemptions: number | null;
  redeemedCount: number;
  expiresAt: string | null;
  isActive: boolean;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewCouponInput {
  code: string;
  discountType: CouponDiscountType;
  discountValue: string;
  scope: CouponScope;
  scopeId?: string | null;
  maxRedemptions?: number | null;
  expiresAt?: string | null;
  isActive?: boolean;
  createdByUserId?: string | null;
}
