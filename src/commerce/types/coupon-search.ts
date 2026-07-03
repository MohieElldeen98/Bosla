import type { CouponDiscountType, CouponScope } from "@/commerce/types/coupon";

export const COUPON_SORT_FIELDS = ["createdAt", "code", "expiresAt"] as const;
export type CouponSortField = (typeof COUPON_SORT_FIELDS)[number];
export const DEFAULT_COUPON_SORT_FIELD: CouponSortField = "createdAt";

export const COUPON_SORT_DIRECTIONS = ["asc", "desc"] as const;
export type CouponSortDirection = (typeof COUPON_SORT_DIRECTIONS)[number];
export const DEFAULT_COUPON_SORT_DIRECTION: CouponSortDirection = "desc";

export const DEFAULT_COUPON_PAGE_SIZE = 20;

export interface CouponSearchFilters {
  /** Matches the coupon code. */
  query?: string;
  scope?: CouponScope;
  /** Restricts to coupons whose `scopeId` is one of these — the
   *  Instructor Coupons page's (Phase 6, Step 6.6) own filter, scoping a
   *  search to just the signed-in Instructor's own courses. Unused by
   *  the Admin listing. */
  scopeIds?: string[];
  isActive?: boolean;
  sortBy?: CouponSortField;
  sortDirection?: CouponSortDirection;
  page?: number;
  pageSize?: number;
}

export interface CouponSearchResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** The admin Coupons listing's display-ready row shape — a `Coupon`
 *  plus its scope target's name resolved (course title / specialty
 *  name / "Sitewide"), composed at the Service layer. Usage statistics
 *  (`redeemedCount`/`maxRedemptions`) are already plain columns on
 *  `Coupon` itself, not derived — reused as-is, not recomputed. */
export interface CouponListItem {
  id: string;
  code: string;
  discountType: CouponDiscountType;
  discountValue: string;
  scope: CouponScope;
  scopeLabel: string;
  maxRedemptions: number | null;
  redeemedCount: number;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
