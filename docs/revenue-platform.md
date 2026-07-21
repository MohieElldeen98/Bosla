# Revenue Distribution & Payout Platform

How a verified sale becomes shares, shares become balances, and balances
become payouts. A first-class commerce domain built for the multi-vendor
future (affiliates, partners, marketplace) without redesign — allocation
logic is never hardcoded; everything flows through the **Revenue Engine**
driven by effective-dated **commission rules**.

## 1. Architecture

```
Verified Payment (Payment Platform, docs/payment-platform.md)
  └─ OrderService.completeOrder            (enrollment, notifications)
       └─ RevenueEngine.allocateForOrder   src/commerce/revenue/
            ├─ CommissionRuleRepository.findEffectiveCandidates
            ├─ Commission Engine           src/commerce/commissions/ (pure math)
            ├─ revenue_allocations         (signed, immutable ledger rows)
            └─ instructor_balances         (SQL-increment cache, atomic)
Refund (sync or webhook)
  └─ RevenueEngine.reverseForRefund        (negative ledger rows, keyed)
Admin
  ├─ CommissionService                     (rules, adjustments)
  ├─ PayoutService                         src/commerce/payouts/ (batches, sweep)
  └─ RevenueReportService                  src/commerce/reports/ (aggregates)
```

Folder map: `src/commerce/{revenue, commissions, payouts, reports}` +
shared `repositories/`, `types/revenue.ts`, `validators/revenue.validator.ts`,
`actions/revenue.actions.ts`, `utils/revenue-audit-log.ts`. Schema:
`src/db/schema/revenue.ts` (migration 0026).

## 2. Database schema (all history immutable)

- **revenue_allocations** — THE ledger. One signed row per share:
  `kind` `sale` (+), `refund_reversal` (−), `adjustment` (±);
  `recipientType` (`platform` / `instructor` — plain text, marketplace
  vocabulary needs no migration); `basisAmount` (what the split was
  computed from), `commissionRuleId` (which rule priced it), payout
  lifecycle `status` (`pending → available → paid`) and the once-only
  `payoutItemId` stamp. **Amounts are never updated.** Partial unique
  indexes guard double-processing: one `sale` row per (order item,
  recipient); one reversal per (reversal key, order item, recipient).
- **commission_rules** — scope `global` | `instructor` | `course` (+
  polymorphic `scopeId`), `percentage` | `fixed_amount`, and an
  effective window (`effectiveFrom`/`effectiveTo`). Never re-rated —
  "changing" a rule closes the old row and inserts a new one.
- **instructor_balances** — per (instructor, currency) cache: pending /
  available / paid / lifetime / refundAdjustments / manualAdjustments.
  Maintained via SQL-side increments in the same transaction as every
  ledger write; the ledger stays the source of truth.
- **payout_accounts** — where an instructor wants to be paid (free-form
  details; no transfer provider integrated by design).
- **payout_batches / payout_items** — one run / one instructor's payment
  in it. Status: `pending → scheduled → processing → paid | failed`,
  `cancelled` before processing.
- **commission_adjustments** — the who/why record behind each manual
  adjustment (the money itself is an `adjustment` ledger row).
- **revenue_audit_logs** — every financial movement: allocations,
  reversals, adjustments, rule create/close, payout transitions,
  balance maturation. Nothing financial happens silently.

## 3. Revenue Engine (`revenue-engine.service.ts`)

`allocateForOrder(order, {paymentId})` — called from the single order
completion path (webhook-verified payments AND admin mark-paid both go
through it):

1. Basis = order total **net of tax** (tax is never revenue); $0 orders
   allocate nothing. Multi-item orders split the basis by unit-price
   proportion (single-item today; carts inherit this).
2. Per item: resolve the winning instructor rule (Commission Engine),
   compute the share (clamped to [0, basis]), platform takes the
   residual. **No rule → platform keeps 100%** — instructor revenue
   exists exactly when an admin configured it.
3. One transaction: insert ledger rows (`onConflictDoNothing` — replays
   insert nothing), apply balance deltas **only for rows that actually
   inserted**, write audit rows.

Shares start `pending` and mature into `available` after
`REVENUE_HOLD_DAYS` (default 14; 0 = immediate). Maturation is a lazy
sweep (`releaseMaturedBalances`) run by every balance-surfacing read and
by payout creation — no scheduler needed.

`reverseForRefund({orderId, reversalKey, refundedAmount, paidAmount})` —
proportional for partial refunds; writes negative rows keyed by the
refund id (or `order-refund:<orderId>` for admin order-level refunds, so
the two paths can never double-reverse). A share already paid out
becomes a clawback: `available` may go negative and the next payout nets
it off. Wired into all three refund paths: admin provider refund
(`PaymentService.refund`), webhook-confirmed refunds, and admin
order-level refunds.

The engine never throws into its callers — a revenue failure is logged
and re-runnable (idempotent); it can never undo an enrollment.

## 4. Commission Engine (`commissions/`)

Pure functions: `resolveCommissionRule` (most specific scope wins —
course > instructor > global; ties resolve to the most recently
effective) and `computeCommissionShare` (percentage or fixed, clamped).
`CommissionService` is the admin surface: create (auto-supersedes the
open rule on the same target), close, list with scope labels, and manual
adjustments. **Historical accuracy**: allocation rows reference the rule
that priced them forever; closed rules never disappear.

## 5. Payout lifecycle (`payouts/`)

No bank integration — architecture only. Creating a batch:

1. Mature balances, pick every positive `available` balance in the
   chosen currency (optionally restricted to specific instructors).
2. Per instructor, in one transaction: create the item, **sweep** their
   `available` allocation rows (stamp `payoutItemId` + flip to `paid` in
   one `WHERE payout_item_id IS NULL` statement — two concurrent batches
   can never both take a row), net positives against clawbacks, set the
   item amount, move balance `available → paid`.
3. The admin executes transfers out-of-band (the item shows the
   instructor's declared account), then drives
   `schedule / process / mark_paid / mark_failed / cancel`.
   `failed`/`cancelled` un-sweep: rows return to `available`, balances
   restore. Rows are never deleted.

## 6. Instructor balances

`pending` (inside the hold window) · `available` (payable) · `paid`
(swept into settled payouts) · `lifetimeEarnings` (net of reversals) ·
`refundAdjustments` (total clawed back by refunds) ·
`manualAdjustments` (admin corrections). Always per currency. The cache
is rebuildable from the ledger by definition.

## 7. Reporting (`reports/`)

All aggregates over the immutable ledger, always grouped per currency:
platform/instructor/gross revenue, refund totals + refund rate, daily
and monthly time series, top courses, top instructors, per-rule
commission summary, instructor-scoped monthly series. Export-ready:
every listing is a typed, paginated repository `search` a CSV endpoint
can reuse.

## 8. Dashboards

- **Admin** — `/admin/revenue` (summary tiles, 30-day chart, top lists),
  `/admin/revenue/allocations` (filterable ledger),
  `/admin/revenue/balances` (+ manual adjustments), `/admin/payouts`
  (+ batch detail with lifecycle actions), `/admin/commission-rules`.
- **Instructor** — `/instructor/earnings`: balance cards, 6-month
  revenue chart, recent sales, payout history, payout-account
  declaration, per-course gross revenue. Loading skeletons, empty
  states, status badges, dark-mode-token styling, and an accessible
  chart (hover tooltips + a visually-hidden data table) throughout.

## 9. Security & correctness model

- **Immutability** — ledger amounts and rule rates are never rewritten;
  corrections are new signed rows.
- **Idempotency** — partial unique indexes on sales and reversals;
  balance deltas computed only from inserted rows; payout sweep guarded
  by `payoutItemId IS NULL`.
- **Race safety** — balances move by SQL increments inside the same
  transaction as their ledger rows; no read-modify-write anywhere.
- **Authorization** — every mutation re-checks
  `requireCommerceManagementAccess` (admin) or instructor self-scope.
- **Audit** — `revenue_audit_logs` row (transactional where possible)
  for every movement.

## 10. Future extension points

- **Affiliates / partners / referrals** — new `recipientType` values +
  rules; the ledger, balances-by-recipient, and payouts generalize.
- **Marketplace sellers / team instructors / per-lesson splits** — more
  allocation inputs per item; the engine already loops recipients per
  item.
- **Subscriptions / installments** — allocations reference payments,
  not only one-shot orders.
- **Coupon-funded discounts** — today a discount reduces the shared
  basis; a "platform funds the coupon" mode is one branch in the basis
  computation.
- **Regional taxes** — the basis is already net-of-tax; per-region rates
  slot into the pricing engine.
- **Multiple payout providers** — `payout_accounts.method` +
  `PayoutService.transition` are the seam; an automated provider
  replaces the out-of-band execution step without touching the ledger.

## 11. Configuration

| Var | Default | Purpose |
| --- | --- | --- |
| `REVENUE_HOLD_DAYS` | 14 | Days a share stays `pending` before payable |

Plus: commission rules themselves are data, created in
`/admin/commission-rules` — **until one exists, the platform keeps 100%
of every sale.**

## 12. Migration

`drizzle/0026_revenue_platform.sql` — new tables/enums only (additive;
no existing table touched). Existing paid orders are NOT retroactively
allocated; allocation starts with the first completion after deploy. A
backfill (re-running `allocateForOrder` over historical paid orders) is
safe by idempotency if ever wanted.
