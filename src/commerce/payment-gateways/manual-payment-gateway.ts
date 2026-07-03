import type { PaymentGateway } from "@/commerce/payment-gateways/payment-gateway";

/**
 * The only `PaymentGateway` implementation that exists today — a
 * stand-in for a real provider while Commerce's foundation (Step 5.1)
 * ships ahead of Stripe/Paymob/Fawry integration (docs/roadmap.md Phase
 * 5). There's no external provider to redirect to or receive webhooks
 * from: `PaymentService.simulateSuccess`/`simulateFailure` transition a
 * `PaymentIntent` directly (a student clicking "Simulate Successful
 * Payment" on the checkout page, or an admin clicking "Mark as Paid"),
 * standing in for what a real webhook would otherwise trigger.
 */
export const ManualPaymentGateway: PaymentGateway = {
  provider: "manual",

  async createCheckoutSession({ paymentIntentId }) {
    return { paymentIntentId, redirectUrl: null };
  },

  async verifyWebhookSignature() {
    return false;
  },

  async handleWebhookEvent() {
    throw new Error("The manual payment gateway has no webhooks — use PaymentService.simulateSuccess/simulateFailure instead.");
  },
};
