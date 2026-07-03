import type { PaymentProvider } from "@/commerce/types/payment-intent";

/** What `createCheckoutSession` hands back to the checkout flow —
 *  `redirectUrl` is where the browser goes to actually pay. `null` for
 *  the `"manual"` gateway (Step 5.1's only implementation): there's no
 *  real provider to redirect to, so the checkout page itself renders
 *  the "simulate payment" step in place instead of leaving the site. */
export interface CheckoutSession {
  paymentIntentId: string;
  redirectUrl: string | null;
}

/** The outcome `handleWebhookEvent` hands back after mapping a
 *  provider's own payload shape into one common result —
 *  `OrderService`/`PaymentService` only ever deal with this shape, never
 *  a provider-specific payload. */
export interface PaymentResult {
  paymentIntentId: string;
  status: "succeeded" | "failed";
  providerReference?: string | null;
  rawPayload?: Record<string, unknown>;
}

/**
 * The provider-agnostic interface every payment provider implements —
 * exactly the shape docs/architecture.md §5 designed ahead of this step:
 *
 * ```
 * PaymentGateway
 *  ├─ createCheckoutSession(order): CheckoutSession
 *  ├─ verifyWebhookSignature(request): boolean
 *  └─ handleWebhookEvent(payload): PaymentResult
 * ```
 *
 * No provider SDK should be imported outside its own adapter module
 * (`src/commerce/payment-gateways/<provider>.ts`) — that's the boundary
 * that keeps adding a real provider later a contained change, never
 * something the checkout UI or `OrderService` needs to know about.
 * `ManualPaymentGateway` (this step's only implementation) has no real
 * webhooks; a future Stripe/Paymob/Fawry adapter is where
 * `verifyWebhookSignature`/`handleWebhookEvent` actually do something.
 */
export interface PaymentGateway {
  readonly provider: PaymentProvider;
  createCheckoutSession(params: {
    paymentIntentId: string;
    amount: string;
    currency: string;
  }): Promise<CheckoutSession>;
  verifyWebhookSignature(request: Request): Promise<boolean>;
  handleWebhookEvent(payload: unknown): Promise<PaymentResult>;
}
