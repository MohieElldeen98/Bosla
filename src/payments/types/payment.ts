/** Providers the platform ships adapters for today — used for admin
 *  filter dropdowns and docs, NOT as a closed type: `provider` is a
 *  plain string everywhere (DB column included) so a new adapter is a
 *  registry entry (`src/payments/providers/index.ts`) plus env config,
 *  never a type/schema migration. */
export const KNOWN_PAYMENT_PROVIDERS = ["paymob"] as const;

/** Mirrors `db/schema/payments.ts`'s `payment_status` enum exactly —
 *  the platform's own normalized vocabulary; every provider's raw
 *  status maps into this inside its adapter and nowhere else. */
export const PAYMENT_STATUSES = [
  "pending",
  "authorized",
  "succeeded",
  "failed",
  "canceled",
  "partially_refunded",
  "refunded",
  "expired",
  "abandoned",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/** Truly terminal — a provider-confirmed outcome (or an admin's own
 *  void), never resurrected. The webhook pipeline consults this before
 *  every transition so a late/replayed "failed" event can never
 *  un-succeed a settled payment.
 *
 *  `expired`/`abandoned` are deliberately EXCLUDED: both are the
 *  platform's own bookkeeping guesses about an attempt that stopped
 *  moving (a deadline passed, or a retry superseded it) — never a
 *  signal that money didn't move. A late webhook reporting success on
 *  an `expired`/`abandoned` payment must still be able to complete it;
 *  see `WebhookService`'s "late recovery" handling
 *  (docs/payment-platform.md §Lifecycle). */
export const FINAL_PAYMENT_STATUSES: readonly PaymentStatus[] = ["failed", "canceled", "refunded"];

/** Statuses a late webhook is still allowed to move OFF of — every
 *  non-final status. `pending`/`authorized` are the normal in-flight
 *  case; `expired`/`abandoned` are the recoverable dormant case. */
export const RECOVERABLE_PAYMENT_STATUSES: readonly PaymentStatus[] = ["pending", "authorized", "expired", "abandoned"];

/** Closed-in-practice, open-in-type vocabulary for `abandonedReason` —
 *  kept as free text at the DB layer so a new reason never needs a
 *  migration; this list is what today's code actually writes. */
export const ABANDONED_REASONS = ["superseded_by_retry", "user_cancelled"] as const;
export type AbandonedReason = (typeof ABANDONED_REASONS)[number];

/** Same convention for `failureReason` — a normalized, provider-agnostic
 *  category, never the raw provider error string (that stays in
 *  `providerResponse`/`payment_events`). */
export const FAILURE_REASONS = ["provider_declined", "provider_error", "provider_voided", "amount_mismatch"] as const;
export type FailureReason = (typeof FAILURE_REASONS)[number];

/** Mirrors `db/schema/payments.ts`'s `payments` table. Money fields are
 *  decimal strings (Postgres `numeric` round-trips as string), same
 *  convention `orders.total` established. */
export interface Payment {
  id: string;
  orderId: string;
  provider: string;
  providerPaymentId: string | null;
  providerTransactionId: string | null;
  status: PaymentStatus;
  amount: string;
  currency: string;
  capturedAmount: string;
  refundedAmount: string;
  paymentMethod: string | null;
  providerResponse: Record<string, unknown>;
  /** This attempt's ordinal within its order (1, 2, 3…) — a stored
   *  fact, not a derived count, so it survives any future change to how
   *  attempts are queried/ordered. */
  attemptNumber: number;
  idempotencyKey: string | null;
  /** This attempt's deadline, set once at creation
   *  (`PaymentExpiryService`/docs/payment-platform.md §Expiration). */
  expiresAt: string;
  /** When the expiry sweep actually flipped this row — null until it
   *  does, even past `expiresAt`. */
  expiredAt: string | null;
  abandonedAt: string | null;
  abandonedReason: string | null;
  failureReason: string | null;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewPaymentInput {
  orderId: string;
  provider: string;
  amount: string;
  currency: string;
  providerPaymentId?: string | null;
  idempotencyKey?: string | null;
  /** Defaults to 1 — callers opening attempt N pass it explicitly
   *  (`CheckoutService.start`). */
  attemptNumber?: number;
  /** Defaults to now + the configured TTL
   *  (`getPaymentAttemptTtlMinutes`) when omitted. */
  expiresAt?: string;
}

/** The fields a webhook/provider response (or the expiry/abandon
 *  pipelines) are allowed to update — status moves through
 *  `PaymentRepository.update`'s guarded transition, never a blind
 *  overwrite. */
export interface PaymentUpdateInput {
  status?: PaymentStatus;
  providerPaymentId?: string | null;
  providerTransactionId?: string | null;
  capturedAmount?: string;
  refundedAmount?: string;
  paymentMethod?: string | null;
  providerResponse?: Record<string, unknown>;
  verifiedAt?: string | null;
  expiredAt?: string | null;
  abandonedAt?: string | null;
  abandonedReason?: string | null;
  failureReason?: string | null;
}
