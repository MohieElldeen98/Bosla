import { z } from "zod";
import { routing } from "@/i18n/routing";

/** The checkout page's "Continue to payment" input — `studentId` is
 *  never a field (the Server Action resolves the session itself), same
 *  trust-boundary reasoning `createCheckoutSchema` established.
 *  `locale` only shapes the provider return URL. */
export const startCheckoutSchema = z.object({
  courseId: z.string().uuid(),
  couponCode: z.string().trim().min(1).max(64).optional(),
  locale: z.enum(routing.locales),
});
export type StartCheckoutInput = z.infer<typeof startCheckoutSchema>;

/** The checkout result page's polling input. */
export const checkoutStatusSchema = z.object({
  orderId: z.string().uuid(),
});
export type CheckoutStatusInput = z.infer<typeof checkoutStatusSchema>;

/** The "cancel and return" action's input — one payment attempt, the
 *  one currently awaiting payment in the tab the student just closed. */
export const abandonCheckoutSchema = z.object({
  paymentId: z.string().uuid(),
});
export type AbandonCheckoutInput = z.infer<typeof abandonCheckoutSchema>;
