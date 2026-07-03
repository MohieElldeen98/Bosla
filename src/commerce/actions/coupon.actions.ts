"use server";

import { SessionService } from "@/auth/services/session.service";
import { CouponService } from "@/commerce/services/coupon.service";
import {
  createCouponSchema,
  updateCouponSchema,
  createOwnCouponSchema,
  updateOwnCouponSchema,
} from "@/commerce/validators/coupon.validator";
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

/** The Instructor Coupons page's own Server Actions (Phase 6, Step
 *  6.6) — same "resolve the session here" reasoning as every other
 *  `*Own` action in this codebase. */
export async function createOwnCouponAction(rawInput: unknown): Promise<CommerceActionResult<Coupon>> {
  const actingUser = await SessionService.getCurrentUser();
  if (!actingUser) {
    return { success: false, code: "forbidden", message: "You must be signed in." };
  }
  const parsed = createOwnCouponSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      code: "validation_failed",
      message: parsed.error.issues.map((issue) => issue.message).join(" "),
    };
  }
  return CouponService.createOwn(actingUser, parsed.data);
}

export async function updateOwnCouponAction(
  id: string,
  rawInput: unknown,
  expectedUpdatedAt?: string,
): Promise<CommerceActionResult<Coupon>> {
  const actingUser = await SessionService.getCurrentUser();
  if (!actingUser) {
    return { success: false, code: "forbidden", message: "You must be signed in." };
  }
  const parsed = updateOwnCouponSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      code: "validation_failed",
      message: parsed.error.issues.map((issue) => issue.message).join(" "),
    };
  }
  return CouponService.updateOwn(actingUser, id, parsed.data, expectedUpdatedAt);
}

export async function setOwnCouponActiveAction(
  id: string,
  isActive: boolean,
  expectedUpdatedAt?: string,
): Promise<CommerceActionResult<Coupon>> {
  const actingUser = await SessionService.getCurrentUser();
  if (!actingUser) {
    return { success: false, code: "forbidden", message: "You must be signed in." };
  }
  return CouponService.setActiveOwn(actingUser, id, isActive, expectedUpdatedAt);
}
