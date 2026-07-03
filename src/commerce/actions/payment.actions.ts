"use server";

import { PaymentService } from "@/commerce/services/payment.service";
import { OrderService } from "@/commerce/services/order.service";
import { SessionService } from "@/auth/services/session.service";
import { simulatePaymentSchema } from "@/commerce/validators/payment.validator";
import type { Order } from "@/commerce/types/order";
import type { CommerceActionResult } from "@/commerce/types/result";

/** The checkout page's "Simulate Successful Payment" button — this is
 *  what stands in for a real gateway's webhook while only
 *  `ManualPaymentGateway` exists (Step 5.1's foundation-only scope).
 *  Two sequential service calls, not one: `PaymentService.simulateSuccess`
 *  transitions the `PaymentIntent`, then `OrderService.markPaid`
 *  completes the order (enrollment, coupon redemption, audit log) — kept
 *  as two calls here rather than `PaymentService` importing
 *  `OrderService` itself, which would create a circular dependency
 *  (`OrderService` already imports `PaymentService` for `createIntent`). */
export async function simulatePaymentSuccessAction(rawInput: unknown): Promise<CommerceActionResult<Order>> {
  const actingUser = await SessionService.getCurrentUser();
  if (!actingUser) {
    return { success: false, code: "forbidden", message: "You must be signed in." };
  }
  const parsed = simulatePaymentSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, code: "validation_failed", message: "Invalid payment." };
  }

  const paymentResult = await PaymentService.simulateSuccess(actingUser, parsed.data.paymentIntentId);
  if (!paymentResult.success) return paymentResult;

  return OrderService.markPaid(actingUser, paymentResult.data.orderId);
}

export async function simulatePaymentFailureAction(rawInput: unknown): Promise<CommerceActionResult<{ orderId: string }>> {
  const actingUser = await SessionService.getCurrentUser();
  if (!actingUser) {
    return { success: false, code: "forbidden", message: "You must be signed in." };
  }
  const parsed = simulatePaymentSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, code: "validation_failed", message: "Invalid payment." };
  }

  const result = await PaymentService.simulateFailure(actingUser, parsed.data.paymentIntentId);
  if (!result.success) return result;
  return { success: true, data: { orderId: result.data.orderId } };
}
