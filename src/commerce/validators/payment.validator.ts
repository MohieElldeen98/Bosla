import { z } from "zod";

/** The Checkout page's "simulate payment" step (Step 5.1's payment
 *  foundation — no real gateway exists, so this is how a `PaymentIntent`
 *  actually transitions). */
export const simulatePaymentSchema = z.object({
  paymentIntentId: z.string().uuid(),
});
export type SimulatePaymentInput = z.infer<typeof simulatePaymentSchema>;
