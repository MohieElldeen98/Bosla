import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { authUsers } from "./auth-users";
import { courses } from "./course";

/**
 * The Commerce Domain (Phase 5, Step 5.1 — docs/roadmap.md) — Orders,
 * Coupons, and the Payment foundation (`PaymentIntent`/`PaymentTransaction`)
 * that makes Bosla a sellable LMS. Mirrors `db/schema/course.ts`'s/
 * `learning.ts`'s conventions exactly: one file per domain, no Drizzle
 * `relations()` helper (composition happens at the Service layer via
 * parallel repository reads), plain-`text` audit `action` columns (not
 * enums, so a new action never needs a migration).
 *
 * No real payment provider is integrated here — see
 * docs/architecture.md §5's `PaymentGateway` design. `payment_provider`
 * includes `stripe`/`paymob`/`fawry` as a fixed, curated vocabulary for
 * that future work, but `"manual"` (a student/admin simulating success or
 * failure, since no real gateway exists yet) is the only value anything
 * in this codebase can actually produce today.
 */

export const orderStatusEnum = pgEnum("order_status", ["pending", "paid", "cancelled", "refunded"]);

export const couponDiscountTypeEnum = pgEnum("coupon_discount_type", ["percentage", "fixed_amount"]);
export const couponScopeEnum = pgEnum("coupon_scope", ["course", "specialty", "sitewide"]);

export const paymentProviderEnum = pgEnum("payment_provider", ["manual", "stripe", "paymob", "fawry"]);
export const paymentIntentStatusEnum = pgEnum("payment_intent_status", [
  "pending",
  "succeeded",
  "failed",
  "canceled",
]);
export const paymentTransactionTypeEnum = pgEnum("payment_transaction_type", [
  "created",
  "succeeded",
  "failed",
  "canceled",
]);

/** A discount code. `scopeId` is deliberately not a foreign key — it
 *  points to either a `courses.id` or a `specialties.id` depending on
 *  `scope` (polymorphic), which a single FK column can't express; the
 *  check constraint below at least enforces "set iff not sitewide."
 *  Scope/eligibility validation itself lives in `CouponService`, not
 *  here — this table is storage only. */
export const coupons = pgTable(
  "coupons",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    code: text("code").notNull(),
    discountType: couponDiscountTypeEnum("discount_type").notNull(),
    discountValue: numeric("discount_value", { precision: 10, scale: 2 }).notNull(),
    scope: couponScopeEnum("scope").notNull().default("sitewide"),
    scopeId: uuid("scope_id"),
    maxRedemptions: integer("max_redemptions"),
    redeemedCount: integer("redeemed_count").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    isActive: boolean("is_active").notNull().default(true),
    createdByUserId: uuid("created_by_user_id").references(() => authUsers.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => [
    uniqueIndex("coupons_code_key").on(table.code),
    index("coupons_scope_idx").on(table.scope, table.scopeId),
    check("coupons_discount_value_check", sql`${table.discountValue} > 0`),
    check(
      "coupons_percentage_range_check",
      sql`${table.discountType} <> 'percentage' OR (${table.discountValue} > 0 AND ${table.discountValue} <= 100)`,
    ),
    check("coupons_max_redemptions_check", sql`${table.maxRedemptions} IS NULL OR ${table.maxRedemptions} > 0`),
    check("coupons_redeemed_count_check", sql`${table.redeemedCount} >= 0`),
    check(
      "coupons_scope_id_check",
      sql`(${table.scope} = 'sitewide' AND ${table.scopeId} IS NULL) OR (${table.scope} <> 'sitewide' AND ${table.scopeId} IS NOT NULL)`,
    ),
  ],
);

/** One commercial transaction. Provider-agnostic by design (see
 *  docs/architecture.md §5) — no payment provider is ever a source of
 *  truth for "does this order exist," only `payment_intents` for "has it
 *  been paid." `couponId` is the coupon *resolved and locked in* at
 *  checkout time — its discount is already baked into `discountTotal`/
 *  `total`, never recalculated from the live coupon later. */
export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    studentId: uuid("student_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    status: orderStatusEnum("status").notNull().default("pending"),
    subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull(),
    discountTotal: numeric("discount_total", { precision: 10, scale: 2 }).notNull().default("0"),
    total: numeric("total", { precision: 10, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("USD"),
    couponId: uuid("coupon_id").references(() => coupons.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => [
    index("orders_student_id_idx").on(table.studentId),
    index("orders_status_idx").on(table.status),
    check("orders_subtotal_check", sql`${table.subtotal} >= 0`),
    check("orders_discount_total_check", sql`${table.discountTotal} >= 0`),
    check("orders_total_check", sql`${table.total} >= 0`),
  ],
);

/** Line items of an order — normally one per course, modeled as a table
 *  from day one so a multi-course cart later isn't a migration (see
 *  docs/database-overview.md §3). `unitPrice` is the course's price *at
 *  time of purchase*, never recalculated from the live course price —
 *  a later price change never rewrites history. */
export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "restrict" }),
    unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => [
    index("order_items_order_id_idx").on(table.orderId),
    uniqueIndex("order_items_order_course_key").on(table.orderId, table.courseId),
    check("order_items_unit_price_check", sql`${table.unitPrice} >= 0`),
  ],
);

/** One attempt to pay for an order — separate from `orders` because one
 *  order can have more than one payment attempt (a failed try, then a
 *  retry). `provider: "manual"` is the only one anything writes today;
 *  `stripe`/`paymob`/`fawry` exist as a reserved, fixed vocabulary for
 *  the real gateways `PaymentGateway` (Step 5.1's foundation-only
 *  abstraction, `src/commerce/payment-gateways/`) will plug in later
 *  without a schema change. */
export const paymentIntents = pgTable(
  "payment_intents",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    provider: paymentProviderEnum("provider").notNull().default("manual"),
    status: paymentIntentStatusEnum("status").notNull().default("pending"),
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("USD"),
    providerReference: text("provider_reference"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => [
    index("payment_intents_order_id_idx").on(table.orderId),
    check("payment_intents_amount_check", sql`${table.amount} >= 0`),
  ],
);

/** Append-only event log against a `PaymentIntent` — "created," then
 *  exactly one of "succeeded"/"failed"/"canceled." This *is* the payment
 *  audit trail (raw provider payloads land in `rawPayload` once a real
 *  gateway exists; today it just holds simulation metadata, e.g. who
 *  clicked "simulate success"). Never updated or deleted once written. */
export const paymentTransactions = pgTable(
  "payment_transactions",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    paymentIntentId: uuid("payment_intent_id")
      .notNull()
      .references(() => paymentIntents.id, { onDelete: "cascade" }),
    type: paymentTransactionTypeEnum("type").notNull(),
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    rawPayload: jsonb("raw_payload").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => [index("payment_transactions_intent_id_idx").on(table.paymentIntentId)],
);

/** Write-only audit trail for order-level actions (created/paid/
 *  cancelled/refunded) — mirrors `learning_audit_logs`/`course_audit_logs`
 *  exactly: a required anchor (`orderId`), optional actor (`set null` so
 *  a since-deleted admin's past actions aren't lost), plain-text
 *  `action`. Kept separate from `coupon_audit_logs` (own bounded
 *  sub-domain, own anchor), same reasoning `course_audit_logs`'s doc
 *  comment gives for not reusing `cms_audit_logs`. */
export const orderAuditLogs = pgTable(
  "order_audit_logs",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    action: text("action").notNull(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id").references(() => authUsers.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    metadata: jsonb("metadata").notNull().default({}),
  },
  (table) => [index("order_audit_logs_order_id_idx").on(table.orderId)],
);

/** Write-only audit trail for coupon-level actions (created/updated/
 *  activated/deactivated) — see `order_audit_logs`'s doc comment for why
 *  this is a separate table rather than one shared commerce audit log. */
export const couponAuditLogs = pgTable(
  "coupon_audit_logs",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    action: text("action").notNull(),
    couponId: uuid("coupon_id")
      .notNull()
      .references(() => coupons.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id").references(() => authUsers.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    metadata: jsonb("metadata").notNull().default({}),
  },
  (table) => [index("coupon_audit_logs_coupon_id_idx").on(table.couponId)],
);
