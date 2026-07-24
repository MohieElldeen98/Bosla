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
 * Coupons, and their audit trails — what makes Bosla a sellable LMS. Mirrors `db/schema/course.ts`'s/
 * `learning.ts`'s conventions exactly: one file per domain, no Drizzle
 * `relations()` helper (composition happens at the Service layer via
 * parallel repository reads), plain-`text` audit `action` columns (not
 * enums, so a new action never needs a migration).
 *
 * Payment execution itself is NOT this file's concern anymore — the
 * Payment Platform (`db/schema/payments.ts`, docs/payment-platform.md)
 * owns `payments`/`payment_events`/`refunds`/`invoices`. This file keeps
 * what a sale *is* (orders, items, coupons, audit logs); that one keeps
 * how a sale gets *paid*. The Step-5.1 `payment_intents`/
 * `payment_transactions` foundation this file used to declare was
 * migration 0024's one-time removal — superseded wholesale by the
 * Payment Platform's `payments` table.
 */

export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "paid",
  "cancelled",
  "refunded",
  "failed",
  "expired",
]);

export const couponDiscountTypeEnum = pgEnum("coupon_discount_type", ["percentage", "fixed_amount"]);
export const couponScopeEnum = pgEnum("coupon_scope", ["course", "specialty", "sitewide"]);

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
    maxRedemptionsPerUser: integer("max_redemptions_per_user"),
    minSubtotal: numeric("min_subtotal", { precision: 10, scale: 2 }),
    maxDiscountAmount: numeric("max_discount_amount", { precision: 10, scale: 2 }),
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
    check(
      "coupons_max_redemptions_per_user_check",
      sql`${table.maxRedemptionsPerUser} IS NULL OR ${table.maxRedemptionsPerUser} > 0`,
    ),
    check("coupons_min_subtotal_check", sql`${table.minSubtotal} IS NULL OR ${table.minSubtotal} >= 0`),
    check(
      "coupons_max_discount_amount_check",
      sql`${table.maxDiscountAmount} IS NULL OR ${table.maxDiscountAmount} > 0`,
    ),
    check("coupons_redeemed_count_check", sql`${table.redeemedCount} >= 0`),
    check(
      "coupons_scope_id_check",
      sql`(${table.scope} = 'sitewide' AND ${table.scopeId} IS NULL) OR (${table.scope} <> 'sitewide' AND ${table.scopeId} IS NOT NULL)`,
    ),
  ],
);

/** One commercial transaction. Provider-agnostic by design (see
 *  docs/architecture.md §5) — no payment provider is ever a source of
 *  truth for "does this order exist," only the Payment Platform's
 *  verified `payments` row for "has it been paid." `couponId` is the coupon *resolved and locked in* at
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
    taxTotal: numeric("tax_total", { precision: 10, scale: 2 }).notNull().default("0"),
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
    check("orders_tax_total_check", sql`${table.taxTotal} >= 0`),
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

/** One row per coupon actually *used* by a completed (or completing)
 *  order — the queryable per-user usage record `coupons.redeemedCount`'s
 *  bare counter can't provide ("has THIS student used THIS coupon, and
 *  how many times"), which the coupon engine's per-user limit
 *  (`maxRedemptionsPerUser`) needs. Written exactly once per order at
 *  completion time (unique `(couponId, orderId)`), alongside — not
 *  instead of — the counter increment, which stays as the cheap
 *  aggregate the global `maxRedemptions` check reads. */
export const couponRedemptions = pgTable(
  "coupon_redemptions",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    couponId: uuid("coupon_id")
      .notNull()
      .references(() => coupons.id, { onDelete: "cascade" }),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => [
    uniqueIndex("coupon_redemptions_coupon_order_key").on(table.couponId, table.orderId),
    index("coupon_redemptions_coupon_user_idx").on(table.couponId, table.userId),
  ],
);

/** Doubles as the platform's generic **Order/Payment Timeline**
 *  (docs/payment-platform.md §Timeline), not just order-status audit
 *  entries — `action` is the event type (open vocabulary: "order_paid",
 *  "payment_attempt.created", "checkout.abandoned", "revenue.allocated",
 *  "invoice.generated", …), still plain `text` so a brand-new domain
 *  (emails, certificates, payouts, subscriptions) can append its own
 *  event types forever without a migration or touching this file.
 *  `paymentId` is a *soft* reference — deliberately not a Drizzle
 *  `.references()` FK: `payments` lives in `payments.ts`, which already
 *  imports `orders` FROM this file, so a real relation here would be a
 *  circular schema import. The FK constraint itself still exists at the
 *  database level (hand-added in the migration, `ON DELETE SET NULL`);
 *  Drizzle just isn't the one managing it, same "no `relations()`
 *  helper, composition at the service layer" convention every domain
 *  here already follows. `actorType` classifies who/what caused the
 *  event (`system` | `user` | `admin` | `provider`) independent of
 *  whether `actorId` is present (a `provider` webhook has no actor
 *  row; `system` events are the platform acting on its own, e.g. an
 *  expiry sweep). Immutable: rows are inserted only, never updated or
 *  deleted — the timeline IS the history. */
export const orderAuditLogs = pgTable(
  "order_audit_logs",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    action: text("action").notNull(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    paymentId: uuid("payment_id"),
    actorType: text("actor_type").notNull().default("system"),
    actorId: uuid("actor_id").references(() => authUsers.id, { onDelete: "set null" }),
    message: text("message"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    metadata: jsonb("metadata").notNull().default({}),
  },
  (table) => [
    index("order_audit_logs_order_id_idx").on(table.orderId),
    index("order_audit_logs_payment_id_idx").on(table.paymentId),
    index("order_audit_logs_actor_id_idx").on(table.actorId, table.createdAt),
    index("order_audit_logs_created_at_idx").on(table.createdAt),
  ],
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
  (table) => [
    index("coupon_audit_logs_coupon_id_idx").on(table.couponId),
    index("coupon_audit_logs_actor_id_idx").on(table.actorId, table.createdAt),
    index("coupon_audit_logs_created_at_idx").on(table.createdAt),
  ],
);

