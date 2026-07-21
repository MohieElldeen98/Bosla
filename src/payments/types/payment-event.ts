/** The platform's normalized event vocabulary — what every provider's
 *  webhook payload reduces to inside its adapter. `unknown` is a valid
 *  outcome: the event still lands in the immutable log, it just drives
 *  no state transition. */
export const PAYMENT_EVENT_TYPES = [
  "payment.succeeded",
  "payment.failed",
  "payment.authorized",
  "payment.voided",
  "refund.succeeded",
  "refund.failed",
  "unknown",
] as const;
export type PaymentEventType = (typeof PAYMENT_EVENT_TYPES)[number];

/** Mirrors `db/schema/payments.ts`'s `payment_events` table — one row
 *  per webhook delivery, written before any processing decision, never
 *  deleted. */
export interface PaymentEvent {
  id: string;
  paymentId: string | null;
  provider: string;
  eventType: string;
  providerEventId: string | null;
  signatureVerified: boolean;
  payload: Record<string, unknown>;
  processedAt: string | null;
  processingError: string | null;
  createdAt: string;
}

export interface NewPaymentEventInput {
  paymentId?: string | null;
  provider: string;
  eventType: string;
  providerEventId?: string | null;
  signatureVerified: boolean;
  payload: Record<string, unknown>;
}
