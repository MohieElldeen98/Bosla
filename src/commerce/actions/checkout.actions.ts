"use server";

import { OrderService } from "@/commerce/services/order.service";
import { SessionService } from "@/auth/services/session.service";
import { createCheckoutSchema } from "@/commerce/validators/order.validator";
import type { CheckoutResult } from "@/commerce/services/order.service";
import type { CommerceActionResult } from "@/commerce/types/result";

/** The "Buy"/"Enroll Now" button's Server Action — resolves the session
 *  itself (the trust boundary) and always checks out for the caller's
 *  *own* id; there's no field for "whose checkout," so no request could
 *  ever be crafted to buy on someone else's behalf. */
export async function checkoutAction(rawInput: unknown): Promise<CommerceActionResult<CheckoutResult>> {
  const actingUser = await SessionService.getCurrentUser();
  if (!actingUser) {
    return { success: false, code: "forbidden", message: "You must be signed in." };
  }
  const parsed = createCheckoutSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      code: "validation_failed",
      message: parsed.error.issues.map((issue) => issue.message).join(" "),
    };
  }
  return OrderService.createFromCheckout(actingUser, parsed.data);
}
