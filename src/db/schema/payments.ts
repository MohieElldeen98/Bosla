import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgSequence,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { authUsers } from "./auth-users";
import { orders } from "./commerce";

/**
 * The Payment Platform (docs/payment-platform.md) — the ONE place Bosla
 * records how money actually moves: `payments` (one row per attempt to
 * collect an order's total, whatever the provider), `payment_events`
 * (the immutable webhook/audit log), `refunds` (money going back), and
 * `invoices` (the receipt of record). Replaces the Step-5.1
 * `payment_intents`/`payment_transactions` foundation wholesale
 * (migration 0024).
 *
 * `provider` is deliberately plain `text`, NOT a Postgres enum — adding
 * Stripe/Geidea/Fawry/anything later is a new `PaymentProviderAdapter`
 * registration plus configuration, never a schema migration
 * (`src/payments/providers/`). Statuses ARE enums: they're the
 * platform's own normalized vocabulary, independent of any provider's.
 */

/** `expired`/`abandoned` are deliberately NOT in `FINAL_PAYMENT_STATUSES`
 *  (`payments.ts` types) — both are the platform's own bookkeeping
 *  guesses about an attempt that stopped moving, never a provider-
 *  confirmed outcome. A late webhook must still be able to resolve one
 *  into `succeeded`/`failed` (docs/payment-platform.md §Lifecycle). Only
 *  `failed`/`canceled`/`refunded` are truly terminal. */
export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "authorized",
  "succeeded",
  "failed",
  "canceled",
  "partially_refunded",
  "refunded",
  "expired",
  "abandoned",
]);

export const refundStatusEnum = pgEnum("refund_status", ["pending", "succeeded", "failed"]);

/** One attempt to collect an order's total through a provider — the
 *  platform's single payment model. Provider identifiers
 *  (`providerPaymentId` = the provider's checkout/intention handle,
 *  `providerTransactionId` = the settled transaction) are nullable
 *  because they only exist once the provider has answered.
 *  `providerResponse` keeps the latest raw provider snapshot for
 *  debugging; the full history lives in `payment_events`. `verifiedAt`
 *  is set exactly once, by server-side webhook verification — never by
 *  anything a browser redirect claims. */
export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    providerPaymentId: text("provider_payment_id"),
    providerTransactionId: text("provider_transaction_id"),
    status: paymentStatusEnum("status").notNull().default("pending"),
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    currency: text("currency").notNull(),
    capturedAmount: numeric("captured_amount", { precision: 10, scale: 2 }).notNull().default("0"),
    refundedAmount: numeric("refunded_amount", { precision: 10, scale: 2 }).notNull().default("0"),
    paymentMethod: text("payment_method"),
    providerResponse: jsonb("provider_response").notNull().default({}),
    /** Distinguishes this row from every other attempt at the same
     *  order — `CheckoutService.start` always opens a fresh row per
     *  attempt (never resumes one), so this is a real ordinal, not a
     *  derived count. */
    attemptNumber: integer("attempt_number").notNull().default(1),
    /** Guards double-submission at checkout: the idempotency key still
     *  makes a raced double-submit of the SAME attempt collapse to one
     *  row; it no longer means "the one open attempt for this order" —
     *  multiple pending/abandoned/expired rows can coexist per order. */
    idempotencyKey: text("idempotency_key"),
    /** The attempt's deadline — set at creation, never moved. Past this
     *  point an unresolved `pending` row is eligible for the expiry
     *  sweep (`PaymentExpiryService`) to become `expired`. Deterministic
     *  and auditable: the deadline itself is a stored fact, not derived
     *  from "now minus some constant" at read time. */
    expiresAt: timestamp("expires_at", { withTimezone: true })
      .notNull()
      .default(sql`now() + interval '30 minutes'`),
    /** When the sweep actually flipped this row to `expired` — null
     *  until then, even though `expiresAt` may already be in the past.
     *  The gap between the two is intentional: expiry is swept lazily,
     *  not by a hard deadline enforced mid-request. */
    expiredAt: timestamp("expired_at", { withTimezone: true }),
    /** When this row was marked `abandoned` — either the student's own
     *  "cancel and return" action, or the moment a fresh attempt
     *  superseded it. Never set for anything but a genuine abandonment
     *  signal (see `abandonedReason`). */
    abandonedAt: timestamp("abandoned_at", { withTimezone: true }),
    /** Small closed-in-practice vocabulary (`superseded_by_retry` |
     *  `user_cancelled`) kept as free text, not an enum — analytics
     *  wants to slice by this without ever needing a migration to add a
     *  new reason. */
    abandonedReason: text("abandoned_reason"),
    /** Normalized, provider-agnostic failure category
     *  (`provider_declined` | `provider_error` | `amount_mismatch` |
     *  …) — deliberately NOT the raw provider error string, which stays
     *  in `providerResponse`/`payment_events` only. This field is safe
     *  to surface in admin reporting and analytics without leaking
     *  provider internals. */
    failureReason: text("failure_reason"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => [
    index("payments_order_id_idx").on(table.orderId),
    index("payments_status_idx").on(table.status),
    index("payments_provider_idx").on(table.provider),
    /** The expiry sweep's exact query shape: "pending rows past their
     *  deadline." */
    index("payments_expiry_sweep_idx").on(table.status, table.expiresAt),
    uniqueIndex("payments_provider_payment_key")
      .on(table.provider, table.providerPaymentId)
      .where(sql`${table.providerPaymentId} IS NOT NULL`),
    uniqueIndex("payments_idempotency_key").on(table.idempotencyKey).where(sql`${table.idempotencyKey} IS NOT NULL`),
    check("payments_amount_check", sql`${table.amount} >= 0`),
    check("payments_captured_amount_check", sql`${table.capturedAmount} >= 0`),
    check("payments_refunded_amount_check", sql`${table.refundedAmount} >= 0`),
  ],
);

/** The immutable audit log — EVERY webhook delivery lands here exactly
 *  as received (verified or not, matched to a payment or not), before
 *  any processing decision. Never updated except to stamp
 *  `processedAt`/`processingError`, never deleted. The unique
 *  `(provider, providerEventId)` slot is the replay/duplicate-delivery
 *  guard: a provider retrying the same event gets acknowledged without
 *  reprocessing. */
export const paymentEvents = pgTable(
  "payment_events",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    paymentId: uuid("payment_id").references(() => payments.id, { onDelete: "set null" }),
    provider: text("provider").notNull(),
    eventType: text("event_type").notNull(),
    /** The provider's own identifier for this delivery (Paymob: the
     *  transaction id) — `null` only when the provider genuinely sends
     *  none, in which case dedupe falls back to status-transition
     *  guards in `WebhookService`. */
    providerEventId: text("provider_event_id"),
    signatureVerified: boolean("signature_verified").notNull().default(false),
    payload: jsonb("payload").notNull().default({}),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    processingError: text("processing_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => [
    index("payment_events_payment_id_idx").on(table.paymentId),
    index("payment_events_provider_idx").on(table.provider),
    uniqueIndex("payment_events_provider_event_key")
      .on(table.provider, table.providerEventId, table.eventType)
      .where(sql`${table.providerEventId} IS NOT NULL`),
  ],
);

/** One refund attempt against a payment — full or partial (`amount` ≤
 *  what remains uncaptured-back). History is the table itself: a
 *  payment's refunds are its rows, newest first, and
 *  `payments.refundedAmount` is the running settled total. */
export const refunds = pgTable(
  "refunds",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    paymentId: uuid("payment_id")
      .notNull()
      .references(() => payments.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    providerRefundId: text("provider_refund_id"),
    status: refundStatusEnum("status").notNull().default("pending"),
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    currency: text("currency").notNull(),
    reason: text("reason"),
    providerResponse: jsonb("provider_response").notNull().default({}),
    createdByUserId: uuid("created_by_user_id").references(() => authUsers.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => [
    index("refunds_payment_id_idx").on(table.paymentId),
    check("refunds_amount_check", sql`${table.amount} > 0`),
  ],
);

/** Backs `invoices.invoiceNumber` — a real Postgres sequence rather
 *  than a MAX()+1 read so two orders completing in the same instant can
 *  never mint the same number. */
export const invoiceNumberSeq = pgSequence("invoice_number_seq", { startWith: 1000, increment: 1 });

/** The receipt of record, written exactly once per completed order —
 *  totals are copied from the order at issue time (never recomputed
 *  later), same "lock history in" reasoning `order_items.unitPrice`
 *  gives. The PDF is rendered on demand from this row
 *  (`/api/payments/invoices/[invoiceId]/pdf`), not stored. */
export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    invoiceNumber: text("invoice_number").notNull(),
    currency: text("currency").notNull(),
    subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull(),
    discountTotal: numeric("discount_total", { precision: 10, scale: 2 }).notNull().default("0"),
    taxTotal: numeric("tax_total", { precision: 10, scale: 2 }).notNull().default("0"),
    total: numeric("total", { precision: 10, scale: 2 }).notNull(),
    issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().default(sql`now()`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => [
    uniqueIndex("invoices_invoice_number_key").on(table.invoiceNumber),
    uniqueIndex("invoices_order_id_key").on(table.orderId),
  ],
);
