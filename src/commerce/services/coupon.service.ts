import { CouponRepository } from "@/commerce/repositories/coupon.repository";
import { requireCommerceManagementAccess } from "@/commerce/utils/require-commerce-access";
import { recordCouponAuditLog } from "@/commerce/utils/audit-log";
import { safeMutation, safeRead } from "@/commerce/utils/safe-operation";
import { SpecialtyRepository } from "@/courses/repositories/specialty.repository";
import { CourseRepository } from "@/courses/repositories/course.repository";
import { resolveLocalizedText } from "@/cms/utils/resolve-localized";
import type { Locale } from "@/i18n/routing";
import type { Course } from "@/courses/types/course";
import type { Coupon } from "@/commerce/types/coupon";
import type {
  CouponSearchFilters,
  CouponSearchResult,
  CouponListItem,
} from "@/commerce/types/coupon-search";
import type { CommerceActionResult } from "@/commerce/types/result";
import type { CreateCouponInput, UpdateCouponInput } from "@/commerce/validators/coupon.validator";

/** The discount computed for one checkout — never negative, never more
 *  than the course's own price (a fixed-amount coupon larger than the
 *  price just makes the course free, not negative-cost). */
export interface CouponValidationResult {
  coupon: Coupon;
  discountAmount: string;
}

function computeDiscountAmount(coupon: Coupon, coursePrice: string): string {
  const price = Number(coursePrice);
  const value = Number(coupon.discountValue);
  const raw = coupon.discountType === "percentage" ? (price * value) / 100 : value;
  return Math.min(Math.max(raw, 0), price).toFixed(2);
}

/**
 * Orchestration for `coupons` — authorization on every *management*
 * mutation (`requireCommerceManagementAccess`, Admin/Super Admin only,
 * matching docs/roles-and-permissions.md §2's "Create sitewide
 * coupons"/"Create coupons... any scope" rows). `validateForCheckout` is
 * deliberately unrestricted — any signed-in student applying a code at
 * checkout needs to reach it, the same "reads are unrestricted, only
 * mutations gate" convention `CourseService`/`EnrollmentService` already
 * established.
 */
export const CouponService = {
  async getById(id: string): Promise<Coupon | null> {
    return safeRead(() => CouponRepository.findById(id), null);
  },

  async searchResolved(rawFilters: CouponSearchFilters, locale: Locale): Promise<CouponSearchResult<CouponListItem>> {
    const result = await safeRead(() => CouponRepository.search(rawFilters), {
      items: [] as Coupon[],
      total: 0,
      page: rawFilters.page ?? 1,
      pageSize: rawFilters.pageSize ?? 20,
      totalPages: 1,
    });

    const courseIds = [...new Set(result.items.filter((c) => c.scope === "course" && c.scopeId).map((c) => c.scopeId!))];
    const specialtyIds = [
      ...new Set(result.items.filter((c) => c.scope === "specialty" && c.scopeId).map((c) => c.scopeId!)),
    ];
    const [courseRows, specialtyRows] = await Promise.all([
      safeRead(() => CourseRepository.findByIds(courseIds), []),
      safeRead(() => SpecialtyRepository.findByIds(specialtyIds), []),
    ]);
    const courseById = new Map(courseRows.map((c) => [c.id, c]));
    const specialtyById = new Map(specialtyRows.map((s) => [s.id, s]));

    const items: CouponListItem[] = result.items.map((coupon) => {
      let scopeLabel = "Sitewide";
      if (coupon.scope === "course" && coupon.scopeId) {
        const course = courseById.get(coupon.scopeId);
        scopeLabel = course ? resolveLocalizedText(course.title, locale) : coupon.scopeId;
      } else if (coupon.scope === "specialty" && coupon.scopeId) {
        const specialty = specialtyById.get(coupon.scopeId);
        scopeLabel = specialty ? resolveLocalizedText(specialty.name, locale) : coupon.scopeId;
      }
      return {
        id: coupon.id,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        scope: coupon.scope,
        scopeLabel,
        maxRedemptions: coupon.maxRedemptions,
        redeemedCount: coupon.redeemedCount,
        expiresAt: coupon.expiresAt,
        isActive: coupon.isActive,
        createdAt: coupon.createdAt,
        updatedAt: coupon.updatedAt,
      };
    });

    return { ...result, items };
  },

  async create(input: CreateCouponInput): Promise<CommerceActionResult<Coupon>> {
    return safeMutation(async () => {
      const user = await requireCommerceManagementAccess();
      if (!user) {
        return { success: false, code: "forbidden", message: "You cannot manage coupons." };
      }
      const existing = await CouponRepository.findByCode(input.code);
      if (existing) {
        return { success: false, code: "conflict", message: `A coupon with code "${input.code}" already exists.` };
      }
      const created = await CouponRepository.create({
        code: input.code,
        discountType: input.discountType,
        discountValue: input.discountValue.toFixed(2),
        scope: input.scope,
        scopeId: input.scopeId ?? null,
        maxRedemptions: input.maxRedemptions ?? null,
        expiresAt: input.expiresAt ?? null,
        isActive: input.isActive,
        createdByUserId: user.id,
      });
      await recordCouponAuditLog({ action: "coupon_created", couponId: created.id, actorId: user.id });
      return { success: true, data: created };
    });
  },

  async update(
    id: string,
    input: UpdateCouponInput,
    expectedUpdatedAt?: string,
  ): Promise<CommerceActionResult<Coupon>> {
    return safeMutation(async () => {
      const user = await requireCommerceManagementAccess();
      if (!user) {
        return { success: false, code: "forbidden", message: "You cannot manage coupons." };
      }

      const result = await CouponRepository.update(
        id,
        {
          discountType: input.discountType,
          discountValue: input.discountValue !== undefined ? input.discountValue.toFixed(2) : undefined,
          scope: input.scope,
          scopeId: input.scopeId,
          maxRedemptions: input.maxRedemptions,
          expiresAt: input.expiresAt !== undefined ? (input.expiresAt ? new Date(input.expiresAt) : null) : undefined,
          isActive: input.isActive,
        },
        expectedUpdatedAt,
      );
      if (result.status === "not_found") {
        return { success: false, code: "not_found", message: "Coupon not found." };
      }
      if (result.status === "conflict") {
        return {
          success: false,
          code: "conflict",
          message: "This coupon was changed by someone else. Reload to see the latest version.",
        };
      }
      await recordCouponAuditLog({ action: "coupon_updated", couponId: result.data.id, actorId: user.id });
      return { success: true, data: result.data };
    });
  },

  /** Activate/Deactivate — a soft flip, not a delete, so a coupon's own
   *  redemption history is never lost, same reasoning
   *  `EnrollmentService.revoke`/`.restore` gives for its own status
   *  flip. */
  async setActive(
    id: string,
    isActive: boolean,
    expectedUpdatedAt?: string,
  ): Promise<CommerceActionResult<Coupon>> {
    return safeMutation(async () => {
      const user = await requireCommerceManagementAccess();
      if (!user) {
        return { success: false, code: "forbidden", message: "You cannot manage coupons." };
      }
      const result = await CouponRepository.update(id, { isActive }, expectedUpdatedAt);
      if (result.status === "not_found") {
        return { success: false, code: "not_found", message: "Coupon not found." };
      }
      if (result.status === "conflict") {
        return {
          success: false,
          code: "conflict",
          message: "This coupon was changed by someone else. Reload to see the latest version.",
        };
      }
      await recordCouponAuditLog({
        action: isActive ? "coupon_activated" : "coupon_deactivated",
        couponId: result.data.id,
        actorId: user.id,
      });
      return { success: true, data: result.data };
    });
  },

  /**
   * Checkout-time validation — unrestricted (any signed-in student
   * applying a code needs this), and the *only* place a coupon's
   * discount is computed. `OrderService.createFromCheckout` calls this,
   * then locks the resulting `discountAmount` into the `Order` at
   * creation time — never recalculated later (docs/architecture.md §5).
   */
  async validateForCheckout(code: string, course: Course): Promise<CommerceActionResult<CouponValidationResult>> {
    return safeMutation(async () => {
      const coupon = await CouponRepository.findByCode(code);
      if (!coupon) {
        return { success: false, code: "not_found", message: "This coupon code doesn't exist." };
      }
      if (!coupon.isActive) {
        return { success: false, code: "unavailable", message: "This coupon is no longer active." };
      }
      if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
        return { success: false, code: "unavailable", message: "This coupon has expired." };
      }
      if (coupon.maxRedemptions !== null && coupon.redeemedCount >= coupon.maxRedemptions) {
        return { success: false, code: "unavailable", message: "This coupon has reached its usage limit." };
      }

      const inScope =
        coupon.scope === "sitewide" ||
        (coupon.scope === "course" && coupon.scopeId === course.id) ||
        (coupon.scope === "specialty" && coupon.scopeId === course.specialtyId);
      if (!inScope) {
        return { success: false, code: "unavailable", message: "This coupon doesn't apply to this course." };
      }

      const discountAmount = computeDiscountAmount(coupon, course.price);
      return { success: true, data: { coupon, discountAmount } };
    });
  },
};
