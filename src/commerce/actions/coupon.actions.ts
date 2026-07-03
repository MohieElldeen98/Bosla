"use server";

import { CouponService } from "@/commerce/services/coupon.service";
import { createCouponSchema, updateCouponSchema } from "@/commerce/validators/coupon.validator";
import type { Coupon } from "@/commerce/types/coupon";
import type { CommerceActionResult } from "@/commerce/types/result";

export async function createCouponAction(rawInput: unknown): Promise<CommerceActionResult<Coupon>> {
  const parsed = createCouponSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      code: "validation_failed",
      message: parsed.error.issues.map((issue) => issue.message).join(" "),
    };
  }
  return CouponService.create(parsed.data);
}

export async function updateCouponAction(
  id: string,
  rawInput: unknown,
  expectedUpdatedAt?: string,
): Promise<CommerceActionResult<Coupon>> {
  const parsed = updateCouponSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      code: "validation_failed",
      message: parsed.error.issues.map((issue) => issue.message).join(" "),
    };
  }
  return CouponService.update(id, parsed.data, expectedUpdatedAt);
}

export async function setCouponActiveAction(
  id: string,
  isActive: boolean,
  expectedUpdatedAt?: string,
): Promise<CommerceActionResult<Coupon>> {
  return CouponService.setActive(id, isActive, expectedUpdatedAt);
}
