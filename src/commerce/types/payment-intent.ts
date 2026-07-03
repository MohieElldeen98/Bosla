/** Mirrors `db/schema/commerce.ts`'s `payment_provider`/
 *  `payment_intent_status` Postgres enums exactly. `"manual"` is the
 *  only provider anything in this codebase can actually produce today —
 *  see `src/commerce/payment-gateways/`'s doc comment. */
export const PAYMENT_PROVIDERS = ["manual", "stripe", "paymob", "fawry"] as const;
export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number];

export const PAYMENT_INTENT_STATUSES = ["pending", "succeeded", "failed", "canceled"] as const;
export type PaymentIntentStatus = (typeof PAYMENT_INTENT_STATUSES)[number];

/** Mirrors `db/schema/commerce.ts`'s `payment_intents` table — one
 *  attempt to pay for an order. */
export interface PaymentIntent {
  id: string;
  orderId: string;
  provider: PaymentProvider;
  status: PaymentIntentStatus;
  amount: string;
  currency: string;
  providerReference: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewPaymentIntentInput {
  orderId: string;
  provider?: PaymentProvider;
  status?: PaymentIntentStatus;
  amount: string;
  currency?: string;
  providerReference?: string | null;
}
