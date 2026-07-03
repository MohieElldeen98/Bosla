/** Mirrors `db/schema/commerce.ts`'s `payment_transaction_type` Postgres
 *  enum exactly — an append-only event log against a `PaymentIntent`. */
export const PAYMENT_TRANSACTION_TYPES = ["created", "succeeded", "failed", "canceled"] as const;
export type PaymentTransactionType = (typeof PAYMENT_TRANSACTION_TYPES)[number];

/** Mirrors `db/schema/commerce.ts`'s `payment_transactions` table.
 *  `rawPayload` holds simulation metadata today (e.g. who clicked
 *  "simulate success"); a real gateway's webhook payload lands here
 *  once one is integrated — no schema change needed for that. */
export interface PaymentTransaction {
  id: string;
  paymentIntentId: string;
  type: PaymentTransactionType;
  amount: string;
  rawPayload: Record<string, unknown>;
  createdAt: string;
}

export interface NewPaymentTransactionInput {
  paymentIntentId: string;
  type: PaymentTransactionType;
  amount: string;
  rawPayload?: Record<string, unknown>;
}
