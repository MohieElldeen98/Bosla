"use server";

import { PaymentService } from "@/payments/services/payment.service";
import { paymentIdSchema, refundPaymentSchema } from "@/payments/validators/payment.validator";
import type { Payment } from "@/payments/types/payment";
import type { Refund } from "@/payments/types/refund";
import type { PaymentActionResult } from "@/payments/types/result";

/** The admin payment detail's Refund action — full when `amount` is
 *  omitted, partial otherwise. Authorization lives inside
 *  `PaymentService.refund` (`requirePaymentManagementAccess`). */
export async function refundPaymentAction(rawInput: unknown): Promise<PaymentActionResult<Refund>> {
  const parsed = refundPaymentSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      code: "validation_failed",
      message: parsed.error.issues.map((issue) => issue.message).join(" "),
    };
  }
  return PaymentService.refund(parsed.data.paymentId, parsed.data.amount, parsed.data.reason);
}

export async function capturePaymentAction(rawInput: unknown): Promise<PaymentActionResult<Payment>> {
  const parsed = paymentIdSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, code: "validation_failed", message: "Invalid payment." };
  }
  return PaymentService.capture(parsed.data.paymentId);
}

export async function voidPaymentAction(rawInput: unknown): Promise<PaymentActionResult<Payment>> {
  const parsed = paymentIdSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, code: "validation_failed", message: "Invalid payment." };
  }
  return PaymentService.void(parsed.data.paymentId);
}
