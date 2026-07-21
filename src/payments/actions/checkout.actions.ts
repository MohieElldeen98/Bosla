"use server";

import { SessionService } from "@/auth/services/session.service";
import { CheckoutService } from "@/payments/checkout/checkout.service";
import { abandonCheckoutSchema, checkoutStatusSchema, startCheckoutSchema } from "@/payments/validators/checkout.validator";
import type { CheckoutStart, CheckoutStatus } from "@/payments/types/checkout";
import type { PaymentActionResult } from "@/payments/types/result";

/** The checkout page's "Continue to payment" Server Action — resolves
 *  the session itself (the trust boundary) and always checks out for
 *  the caller's own id. */
export async function startCheckoutAction(rawInput: unknown): Promise<PaymentActionResult<CheckoutStart>> {
  const actingUser = await SessionService.getCurrentUser();
  if (!actingUser) {
    return { success: false, code: "forbidden", message: "You must be signed in." };
  }
  const parsed = startCheckoutSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      code: "validation_failed",
      message: parsed.error.issues.map((issue) => issue.message).join(" "),
    };
  }
  return CheckoutService.start(actingUser, parsed.data);
}

/** The checkout result page's polling action — the ONLY thing the
 *  browser trusts after a provider redirect. Reads webhook-verified DB
 *  state; nothing in the redirect URL can influence it. */
export async function getCheckoutStatusAction(rawInput: unknown): Promise<PaymentActionResult<CheckoutStatus>> {
  const actingUser = await SessionService.getCurrentUser();
  if (!actingUser) {
    return { success: false, code: "forbidden", message: "You must be signed in." };
  }
  const parsed = checkoutStatusSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, code: "validation_failed", message: "Invalid order." };
  }
  return CheckoutService.getStatus(actingUser, parsed.data.orderId);
}

/** The "cancel and return" button's Server Action — the student giving
 *  up on the attempt currently open in another tab. Idempotent and
 *  never destructive: a payment that already resolved just reports
 *  `abandoned: false` rather than erroring. */
export async function abandonCheckoutAction(rawInput: unknown): Promise<PaymentActionResult<{ abandoned: boolean }>> {
  const actingUser = await SessionService.getCurrentUser();
  if (!actingUser) {
    return { success: false, code: "forbidden", message: "You must be signed in." };
  }
  const parsed = abandonCheckoutSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, code: "validation_failed", message: "Invalid payment." };
  }
  return CheckoutService.abandon(actingUser, parsed.data.paymentId);
}
