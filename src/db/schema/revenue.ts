import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
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
import { instructors } from "./course";
import { orders, orderItems } from "./commerce";

/**
 * The Revenue Distribution & Payout Platform (docs/revenue-platform.md)
 * — how a verified sale becomes shares (`revenue_allocations`), shares
 * become balances (`instructor_balances`), and balances become payouts
 * (`payout_batches`/`payout_items`). Splitting logic itself lives in
 * the Revenue Engine (`src/commerce/revenue/`), driven by effective-
 * dated `commission_rules` — never hardcoded percentages.
 *
 * Two immutability principles shape every table here:
 * 1. Financial amounts are NEVER rewritten. A refund or correction is a
 *    new signed row (`refund_reversal`/`adjustment`), not an update —
 *    the ledger only grows.
 * 2. Rule history is preserved by effective windows: changing a
 *    commission closes the old row (`effectiveTo`) and inserts a new
 *    one, so an old sale re-read years later still resolves the rule
 *    that priced it.
 *
 * `recipient_type` is plain text ("platform"/"instructor" today) so the
 * marketplace future — affiliates, partners, referral programs — is new
 * vocabulary plus new rules, never a schema migration.
 */

export const commissionRuleScopeEnum = pgEnum("commission_rule_scope", ["global", "instructor", "course"]);
export const commissionRateTypeEnum = pgEnum("commission_rate_type", ["percentage", "fixed_amount"]);

export const revenueAllocationKindEnum = pgEnum("revenue_allocation_kind", [
  "sale",
  "refund_reversal",
  "adjustment",
]);
export const revenueAllocationStatusEnum = pgEnum("revenue_allocation_status", [
  "pending",
  "available",
  "paid",
]);

export const payoutStatusEnum = pgEnum("payout_status", [
  "pending",
  "scheduled",
  "processing",
  "paid",
  "failed",
  "cancelled",
]);

/** How much of a sale a recipient earns. Resolution: for a given
 *  `recipientType`, the most specific rule effective at sale time wins
 *  (course > instructor > global); the platform's share is always the
 *  residual, never its own rule. Rows are closed (`effectiveTo`), never
 *  re-rated — see the module doc. */
export const commissionRules = pgTable(
  "commission_rules",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    scope: commissionRuleScopeEnum("scope").notNull(),
    /** `courses.id` for scope "course", `instructors.id` for scope
     *  "instructor", NULL for "global" — polymorphic like
     *  `coupons.scopeId`, and check-constrained the same way. */
    scopeId: uuid("scope_id"),
    recipientType: text("recipient_type").notNull().default("instructor"),
    rateType: commissionRateTypeEnum("rate_type").notNull(),
    rateValue: numeric("rate_value", { precision: 10, scale: 2 }).notNull(),
    effectiveFrom: timestamp("effective_from", { withTimezone: true }).notNull().default(sql`now()`),
    effectiveTo: timestamp("effective_to", { withTimezone: true }),
    createdByUserId: uuid("created_by_user_id").references(() => authUsers.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => [
    index("commission_rules_scope_idx").on(table.scope, table.scopeId),
    index("commission_rules_effective_idx").on(table.effectiveFrom, table.effectiveTo),
    check("commission_rules_rate_value_check", sql`${table.rateValue} >= 0`),
    check(
      "commission_rules_percentage_range_check",
      sql`${table.rateType} <> 'percentage' OR (${table.rateValue} >= 0 AND ${table.rateValue} <= 100)`,
    ),
    check(
      "commission_rules_scope_id_check",
      sql`(${table.scope} = 'global' AND ${table.scopeId} IS NULL) OR (${table.scope} <> 'global' AND ${table.scopeId} IS NOT NULL)`,
    ),
    check(
      "commission_rules_effective_window_check",
      sql`${table.effectiveTo} IS NULL OR ${table.effectiveTo} > ${table.effectiveFrom}`,
    ),
  ],
);

/** The revenue ledger — one signed row per share of one sale (or its
 *  reversal/correction). `amount` is signed: `sale` rows positive,
 *  `refund_reversal` negative, `adjustment` either. Amounts are
 *  IMMUTABLE once written; only the payout-lifecycle `status` and the
 *  `payoutItemId` linkage ever change. The partial unique indexes are
 *  the double-processing guards: one sale allocation per (order item,
 *  recipient), one reversal per (reversal key, order item, recipient) —
 *  a replayed webhook or double-clicked refund inserts nothing. */
export const revenueAllocations = pgTable(
  "revenue_allocations",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    /** NULL only for `adjustment` rows — a manual correction isn't tied
     *  to a sale. */
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "restrict" }),
    orderItemId: uuid("order_item_id").references(() => orderItems.id, { onDelete: "restrict" }),
    /** The Payment Platform `payments.id` that funded this sale — NULL
     *  for $0-order edge cases and admin mark-paid orders. Not an FK:
     *  the ledger must outlive any payment-table reshaping. */
    paymentId: uuid("payment_id"),
    kind: revenueAllocationKindEnum("kind").notNull(),
    recipientType: text("recipient_type").notNull(),
    /** `instructors.id` when `recipientType` is "instructor"; NULL for
     *  the platform's own share. A future affiliate/partner recipient
     *  gets its own id column or reuses this with its type. */
    instructorId: uuid("instructor_id").references(() => instructors.id, { onDelete: "restrict" }),
    commissionRuleId: uuid("commission_rule_id").references(() => commissionRules.id, { onDelete: "set null" }),
    currency: text("currency").notNull(),
    /** What the split was computed FROM (order total net of tax) —
     *  kept so any historical allocation can be re-derived and audited. */
    basisAmount: numeric("basis_amount", { precision: 10, scale: 2 }).notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    status: revenueAllocationStatusEnum("status").notNull().default("pending"),
    /** Set exactly once when a payout batch picks this row up. */
    payoutItemId: uuid("payout_item_id"),
    /** Idempotency key for reversals — the refund id (or a synthetic
     *  key for admin order-level refunds). NULL on sale/adjustment. */
    reversalKey: text("reversal_key"),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => [
    index("revenue_allocations_order_id_idx").on(table.orderId),
    index("revenue_allocations_instructor_idx").on(table.instructorId, table.status),
    index("revenue_allocations_created_at_idx").on(table.createdAt),
    uniqueIndex("revenue_allocations_sale_key")
      .on(table.orderId, table.orderItemId, table.recipientType, table.instructorId)
      .where(sql`${table.kind} = 'sale'`),
    uniqueIndex("revenue_allocations_reversal_key")
      .on(table.reversalKey, table.orderItemId, table.recipientType, table.instructorId)
      .where(sql`${table.kind} = 'refund_reversal'`),
  ],
);

/** Denormalized per-(instructor, currency) balance cache — the ledger
 *  above is the source of truth; this row is maintained transactionally
 *  next to every ledger write (SQL increments, never read-modify-write)
 *  so dashboards don't re-aggregate the world per view. `pending` ages
 *  into `available` after the hold window (`REVENUE_HOLD_DAYS`);
 *  `paid` accumulates from settled payout items. */
export const instructorBalances = pgTable(
  "instructor_balances",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    instructorId: uuid("instructor_id")
      .notNull()
      .references(() => instructors.id, { onDelete: "cascade" }),
    currency: text("currency").notNull(),
    pendingBalance: numeric("pending_balance", { precision: 12, scale: 2 }).notNull().default("0"),
    availableBalance: numeric("available_balance", { precision: 12, scale: 2 }).notNull().default("0"),
    paidBalance: numeric("paid_balance", { precision: 12, scale: 2 }).notNull().default("0"),
    lifetimeEarnings: numeric("lifetime_earnings", { precision: 12, scale: 2 }).notNull().default("0"),
    refundAdjustments: numeric("refund_adjustments", { precision: 12, scale: 2 }).notNull().default("0"),
    manualAdjustments: numeric("manual_adjustments", { precision: 12, scale: 2 }).notNull().default("0"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => [uniqueIndex("instructor_balances_instructor_currency_key").on(table.instructorId, table.currency)],
);

/** Where an instructor wants to be paid — declared architecture only:
 *  no bank/transfer provider is integrated yet, so `accountDetails` is
 *  free-form jsonb an admin reads when executing a batch out-of-band. */
export const payoutAccounts = pgTable(
  "payout_accounts",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    instructorId: uuid("instructor_id")
      .notNull()
      .references(() => instructors.id, { onDelete: "cascade" }),
    method: text("method").notNull(),
    currency: text("currency").notNull(),
    accountName: text("account_name").notNull(),
    accountDetails: jsonb("account_details").notNull().default({}),
    isDefault: boolean("is_default").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => [index("payout_accounts_instructor_idx").on(table.instructorId)],
);

/** One payout run — a set of instructor payments executed together.
 *  Lifecycle: pending → scheduled → processing → paid | failed;
 *  cancelled only before processing. */
export const payoutBatches = pgTable(
  "payout_batches",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    status: payoutStatusEnum("status").notNull().default("pending"),
    currency: text("currency").notNull(),
    totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull().default("0"),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    notes: text("notes"),
    createdByUserId: uuid("created_by_user_id").references(() => authUsers.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => [index("payout_batches_status_idx").on(table.status)],
);

/** One instructor's payment inside a batch — the amount is the sum of
 *  the `available` allocations the batch swept (each stamped with this
 *  row's id, the double-payout guard). */
export const payoutItems = pgTable(
  "payout_items",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    batchId: uuid("batch_id")
      .notNull()
      .references(() => payoutBatches.id, { onDelete: "restrict" }),
    instructorId: uuid("instructor_id")
      .notNull()
      .references(() => instructors.id, { onDelete: "restrict" }),
    payoutAccountId: uuid("payout_account_id").references(() => payoutAccounts.id, { onDelete: "set null" }),
    status: payoutStatusEnum("status").notNull().default("pending"),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    currency: text("currency").notNull(),
    failureReason: text("failure_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => [
    index("payout_items_batch_idx").on(table.batchId),
    index("payout_items_instructor_idx").on(table.instructorId),
    uniqueIndex("payout_items_batch_instructor_key").on(table.batchId, table.instructorId),
    check("payout_items_amount_check", sql`${table.amount} > 0`),
  ],
);

/** The admin action record behind every manual balance correction —
 *  the money itself lands as an `adjustment` allocation row (signed);
 *  this table keeps who/why. */
export const commissionAdjustments = pgTable(
  "commission_adjustments",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    instructorId: uuid("instructor_id")
      .notNull()
      .references(() => instructors.id, { onDelete: "restrict" }),
    allocationId: uuid("allocation_id")
      .notNull()
      .references(() => revenueAllocations.id, { onDelete: "restrict" }),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    currency: text("currency").notNull(),
    reason: text("reason").notNull(),
    createdByUserId: uuid("created_by_user_id").references(() => authUsers.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => [index("commission_adjustments_instructor_idx").on(table.instructorId)],
);

/** Write-only audit trail for every financial movement — allocation,
 *  reversal, adjustment, rule change, payout transition. Mirrors
 *  `order_audit_logs`' conventions (plain-text action, optional actor,
 *  jsonb metadata; NULL actor = the system itself). */
export const revenueAuditLogs = pgTable(
  "revenue_audit_logs",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id"),
    actorId: uuid("actor_id").references(() => authUsers.id, { onDelete: "set null" }),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => [
    index("revenue_audit_logs_entity_idx").on(table.entityType, table.entityId),
    index("revenue_audit_logs_created_at_idx").on(table.createdAt),
    index("revenue_audit_logs_actor_id_idx").on(table.actorId, table.createdAt),
  ],
);
