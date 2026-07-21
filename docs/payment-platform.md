# Payment Platform

Bosla's unified, provider-agnostic payment system. There is exactly **one**
payment platform in this codebase: `src/payments/`. Business logic (checkout,
orders, enrollment, refunds, admin) never talks to Paymob, Stripe, or any
gateway directly — it talks to the `PaymentProviderAdapter` interface, and
providers are plugins behind it. The Step-5.1 "manual/simulated" payment
foundation (`payment_intents`/`payment_transactions`, `ManualPaymentGateway`,
the simulate-payment actions) was removed wholesale in migrations 0024/0025.

## 1. Architecture

```
Student
  └─ Checkout page ── startCheckoutAction
        └─ CheckoutService.start
             ├─ OrderService.createFromCheckout   (commerce: what the sale IS)
             │    ├─ CouponService.validateForCheckout   (coupon engine)
             │    └─ PricingService.compute              (pricing engine)
             ├─ $0 total → completed immediately (enrollment granted)
             └─ paid → a FRESH payments row (never a reused one — §6)
                    → ActiveProvider.createCheckout → hosted-page redirect
                       (opened in a new tab; the checkout page stays on-site
                        polling, with a "cancel and return" — §6)
Provider (hosted checkout)
  └─ Webhook ── POST /api/payments/webhooks/[provider]
        └─ WebhookService.process
             ├─ adapter.verifyWebhook   (signature, constant-time)
             ├─ payment_events insert   (immutable log + replay dedupe)
             ├─ amount/currency verification against the order
             ├─ payments status transition (forward-only, late-recovery aware — §8)
             └─ FulfillmentService.completePaidOrder
                  ├─ OrderService.completeFromVerifiedPayment
                  │    ├─ order → paid
                  │    ├─ enrollment granted / restored
                  │    ├─ coupon redemption recorded + counted
                  │    └─ in-app notifications
                  ├─ InvoiceService.issueForOrder  (INV-… via DB sequence)
                  └─ receipt email (+ PDF invoice attached)
Browser (back from provider, or the on-site tab that never left)
  └─ getCheckoutStatusAction ── polls DB truth only, sweeps expiry as it goes
```

Two hard rules hold everything together:

1. **The frontend never trusts a redirect.** The result page (and the
   on-site "waiting for payment" panel) poll `getCheckoutStatusAction`, which
   reads webhook-verified DB state. Nothing in a return URL can grant
   anything.
2. **No provider concept leaks outside `src/payments/providers/`.** The rest
   of the codebase sees only normalized types (`ProviderCheckoutSession`,
   `ProviderWebhookEvent`, …).

## 2. Folder structure

```
src/payments/
├─ providers/            The seam. provider.ts (interface), index.ts (registry)
│  └─ paymob/            Everything Paymob-shaped: client, HMAC, adapter
├─ checkout/             CheckoutService (start / getStatus / abandon),
│                        PaymentExpiryService (the expiry sweep),
│                        payment-attempt-config.ts (TTL knob)
├─ webhooks/             WebhookService (the one pipeline all providers enter)
├─ services/             PaymentService (admin ops + attempt listing),
│                        InvoiceService,
│                        FulfillmentService (verified money → delivered product)
├─ pricing/              PricingService (subtotal − discount + tax = total)
├─ repositories/         payments / payment_events / refunds / invoices
├─ emails/               Resend transport (fetch, no SDK) + HTML templates
├─ actions/              Server Actions (checkout + abandon + admin payment ops)
├─ validators/           Zod schemas
├─ security/             timing-safe comparison
├─ types/                Payment, PaymentEvent, Refund, Invoice, Checkout,
│                        currency config, result types
└─ utils/                payments-logger (structured, prod-visible),
                         safe-operation, require-payment-access
```

Commerce (`src/commerce/`) keeps what a sale *is* — orders, order items,
coupons, coupon redemptions, and (since the Payment Lifecycle Hardening work)
`order_audit_logs`, which doubles as the general **Order/Payment Timeline**
(§11). Payments keeps how it gets *paid*. Dependency direction: `payments →
commerce` for order completion and timeline events; `commerce → payments`
only for read-model resolution (latest payment status, invoice id) and the
pricing engine.

## 3. Provider abstraction

`src/payments/providers/provider.ts` — every gateway implements:

| Method | Purpose |
| --- | --- |
| `createCheckout` | Open a hosted-checkout session; returns `redirectUrl` |
| `verifyWebhook` | Authenticate a delivery (HMAC over raw bytes, constant-time) |
| `parseWebhook` | Reduce the payload to a normalized `ProviderWebhookEvent` |
| `retrievePayment` | Re-fetch authoritative state (reconciliation path) |
| `refund` / `capture` / `void` | Post-payment money operations |
| `capabilities` | `{refund, partialRefund, capture, void}` — services check before offering |

The **registry** (`providers/index.ts`) maps provider ids to factories.
`getActivePaymentProvider()` returns the adapter selected by
`PAYMENT_PROVIDER` (or `null` → paid checkout gracefully unavailable);
`getPaymentProviderById()` serves the webhook route so in-flight payments
survive a provider switch.

A provider that treats its merchant/order reference as **create-once**
(Paymob's Intention API does — a second `createCheckout` call for the same
reference is rejected) is why every checkout attempt opens a brand-new
`payments` row rather than reusing one (§6). This is a provider-shaped
constraint, but the platform's response to it — fresh attempts, not reused
sessions — is provider-agnostic and costs new adapters nothing.

### Adding a new provider (Stripe, Geidea, Fawry, …)

1. Create `src/payments/providers/<id>/` with an adapter implementing
   `PaymentProviderAdapter`. All wire formats, auth, and signature schemes
   stay inside this directory.
2. Add its env schema to `src/lib/env.ts` (own `load<X>Env`, graceful null).
3. Register one factory entry in `providers/index.ts`.
4. Configure its webhook to `POST /api/payments/webhooks/<id>`.
5. Set `PAYMENT_PROVIDER=<id>`.

No checkout, order, enrollment, webhook-pipeline, or admin code changes.

## 4. Database schema (migrations 0024, 0025, 0027)

New tables (`src/db/schema/payments.ts`):

- **payments** — one row per **attempt** to collect an order's total (never
  reused across retries — §6). `provider` is plain text (new providers need
  no migration); `providerPaymentId` / `providerTransactionId` identify it at
  the provider; `amount/capturedAmount/refundedAmount` (numeric strings);
  `idempotencyKey` (unique) guards a raced double-submit of the *same*
  attempt. `attemptNumber` is a stored ordinal (1, 2, 3…), not a derived
  count. `expiresAt`/`expiredAt` and `abandonedAt`/`abandonedReason` are the
  Payment Lifecycle Hardening additions (migration 0027 — §7). `failureReason`
  is a normalized, provider-agnostic category, never the raw provider error
  (that stays in `providerResponse`/`payment_events`). `verifiedAt` is set
  only by server-side webhook verification.
- **payment_events** — the immutable audit log. Every webhook delivery is
  stored verbatim before any decision, with `signatureVerified`,
  `processedAt`, `processingError`. Unique `(provider, providerEventId,
  eventType)` is the replay/duplicate guard. Rows are never deleted.
- **refunds** — full/partial refund attempts; a payment's refund history is
  its rows. `pending → succeeded | failed`.
- **invoices** — the receipt of record, one per completed order (unique
  `order_id`), numbered `INV-<year>-<seq>` from the `invoice_number_seq`
  Postgres sequence.
- **coupon_redemptions** (`schema/commerce.ts`) — per-user coupon usage,
  unique `(couponId, orderId)`.

Changed tables (0027): `order_audit_logs` (`schema/commerce.ts`) gained
`payment_id` (a *soft* reference — plain `uuid` + a hand-added DB-level FK,
deliberately not a Drizzle `.references()`, since `commerce.ts` already
imports FROM `payments.ts` and a relation the other way would be a circular
schema import), `actor_type` (`system | user | admin | provider`, default
`system`), and `message`. `OrderAuditAction` (the `action` column's TS type)
was widened from a closed union to plain `string` — the same "no migration to
add a value" reasoning `provider` already followed — so any future domain can
append its own timeline event types forever without touching this file.

Earlier changes (0024): `orders` + `tax_total` and enum values
`failed`/`expired` (an ORDER-level `expired`, distinct from and not yet wired
to the PAYMENT-level `expired` this doc covers — see §16); `coupons` +
`max_redemptions_per_user`, `min_subtotal`, `max_discount_amount`.

Dropped (0025): `payment_intents`, `payment_transactions`, and the
`payment_provider` / `payment_intent_status` / `payment_transaction_type`
enums.

## 5. Order lifecycle

```
pending ──(webhook-verified payment / admin markPaid)──▶ paid
pending ──(admin cancel)──▶ cancelled
paid ──(full refund settles / admin refund)──▶ refunded
```

This is the ORDER's own status, one level up from the payment ATTEMPT
lifecycle (§7) — an order can accumulate several `payments` rows (retries,
abandoned attempts, an eventual success) while itself only ever holding one
status at a time. A failed/abandoned/expired payment **attempt** leaves the
order `pending` (retryable). Completion has exactly two doors:
`OrderService.completeFromVerifiedPayment` (system path, authority = the
verified payment) and management-only `OrderService.markPaid` (out-of-band
payment override). Both are idempotent — a replayed webhook can never
double-enroll, double-redeem, or re-invoice, even if it arrives after a
*different* attempt already completed the order (§8's late-recovery case).

## 6. Checkout & retry lifecycle

1. `startCheckoutAction` (session-derived user, Zod-validated input).
2. `OrderService.createFromCheckout`: availability + duplicate-purchase
   guards, coupon validation, pricing engine, order + item + timeline event
   (`order_created`). A retry against the same course resumes the same
   `pending` order — it does NOT create a second order.
3. $0 total → completed immediately, no provider involved.
4. Otherwise `CheckoutService.start`:
   a. Any of the order's still-`pending` payments (from an earlier, unfinished
      attempt) are marked **`abandoned`**, reason `superseded_by_retry` — see
      §7. They are never marked `canceled`.
   b. A brand-new `payments` row opens — `attemptNumber` = previous attempt
      count + 1, `expiresAt` = now + `PAYMENT_ATTEMPT_TTL_MINUTES` (§13).
      **Every** `start()` call does this; a payment row is never reused for a
      second provider session, because Paymob's Intention API (and most
      hosted-checkout providers) treats the merchant reference as create-once
      (§3) — reusing one produces `"An Order with ref: ... already exists"`.
   c. The active provider opens a hosted-checkout session; our `payments.id`
      travels as its merchant reference.
   d. `checkout.started`, `payment_attempt.created`, `payment.redirected`
      timeline events are recorded (§11).
5. The client (`CheckoutFlow`) opens the provider's hosted page in a **new
   browser tab**, not a full-page redirect — the provider's page has no way
   back to Bosla on its own (it's on the provider's domain), so the original
   tab stays on-site the whole time, polling `getCheckoutStatusAction` and
   offering **"cancel and return"**. Clicking it calls
   `abandonCheckoutAction` → `CheckoutService.abandon` — same `abandoned`
   status, reason `user_cancelled`, idempotent (a no-op if the payment
   already resolved). If the browser blocks the popup, checkout falls back to
   the old full-page handoff.
6. Whichever tab is showing status polls until the webhook verdict lands
   (paid → player; failed/expired/abandoned → retry; slow → honest timeout).
   A retry from here is `startCheckoutAction` again — back to step 4, opening
   attempt N+1 against the SAME order.

## 7. Payment lifecycle & state machine

```
pending ──(webhook: payment.authorized)────────────▶ authorized
pending ──(webhook: payment.succeeded, verified)───▶ succeeded
pending ──(webhook: payment.failed)─────────────────▶ failed          [FINAL]
pending ──(webhook: payment.voided)─────────────────▶ canceled        [FINAL]
pending ──(system: superseded by a new attempt)─────▶ abandoned
pending ──(user: "cancel and return")───────────────▶ abandoned
pending ──(system: expiry sweep, past expiresAt)────▶ expired
authorized ──(admin: capture / webhook success)─────▶ succeeded
authorized ──(admin: void / webhook voided)─────────▶ canceled        [FINAL]
succeeded ──(admin/webhook: full refund)────────────▶ refunded        [FINAL]
succeeded ──(admin/webhook: partial refund)─────────▶ partially_refunded
abandoned ──(late webhook: succeeded/authorized)────▶ succeeded / authorized
abandoned ──(late webhook: failed/voided)───────────▶ failed / canceled
expired   ──(late webhook: succeeded/authorized)────▶ succeeded / authorized
expired   ──(late webhook: failed/voided)───────────▶ failed / canceled
```

**Only `failed`, `canceled`, and `refunded` are truly final**
(`FINAL_PAYMENT_STATUSES`, `src/payments/types/payment.ts`) — a provider
confirmed the outcome, or an admin took a deliberate, provider-confirmed
action (void). Nothing ever moves a payment off one of these three.

**`expired` and `abandoned` are deliberately NOT final.** Both are the
platform's own bookkeeping guesses about an attempt that stopped moving —
never a signal that money didn't move. The requirement this design satisfies:
*"do not use `canceled` for browser abandonment, and never let expiry/
abandonment silently discard a legitimate successful payment."*
`RECOVERABLE_PAYMENT_STATUSES` (`pending | authorized | expired | abandoned`)
is exactly the set the webhook pipeline still accepts a `payment.succeeded`
or `payment.authorized`/`payment.failed`/`payment.voided` event against — see
§8's late-recovery handling. A `succeeded`/`partially_refunded`/`refunded`
payment can never move to `failed`/`canceled` (the classic "late failure
must not un-succeed a settled payment" guard), independent of the
final/non-final split above.

Why two dormant states instead of one:

| | `abandoned` | `expired` |
| --- | --- | --- |
| Trigger | An explicit signal: a retry superseded it, or the student clicked "cancel and return" | Purely time-based: nobody looked at it and its deadline passed |
| Set by | `CheckoutService.start` / `CheckoutService.abandon`, immediately | `PaymentExpiryService.sweep`, lazily (§9) |
| `abandonedReason` | `superseded_by_retry` \| `user_cancelled` | — (see `expiredAt` instead) |

## 8. Late webhook behavior (the recovery path)

A webhook can legitimately arrive after the platform stopped waiting on an
attempt — the student paid on a tab we thought was abandoned, or the
`PAYMENT_ATTEMPT_TTL_MINUTES` window passed before the provider's own
(slower) confirmation landed. `WebhookService`'s `applyPaymentSuccess` and
`applyPaymentFailure` both accept `expired`/`abandoned` as valid source
states (via `RECOVERABLE_PAYMENT_STATUSES`) and process the event exactly as
they would for `pending`/`authorized` — same amount/currency verification,
same forward-only guard against a settled payment, same fulfillment
pipeline. Nothing about verification is weakened; only the "already-final"
guard's membership changed.

When a success lands on a previously `expired`/`abandoned` row, it's logged
distinctly (`webhook.late_recovery`, plus a `payment.late_recovery` timeline
event) because it's exactly the signal a **double-charge investigation**
starts from: `OrderService.completeFromVerifiedPayment` is idempotent, so
access is never double-granted even if a different attempt already paid the
order — but the provider may genuinely have charged the student twice, and
that needs a human to notice and refund. The timeline event says so
explicitly when `order.status` is already `paid`.

A late failure/void on an `expired`/`abandoned` row is recorded (accurate
history) but never triggers the "your payment failed" student notification
if the order is already `paid` by a different attempt — telling a student
their payment failed after they already have access would just be wrong.

## 9. Expiration lifecycle

Every attempt gets a real deadline at creation: `expiresAt` = now +
`PAYMENT_ATTEMPT_TTL_MINUTES` (default 30, §13) — deterministic and
auditable, a stored fact rather than "now minus some constant" computed at
read time.

**The sweep is lazy, not a hard deadline enforced mid-request or a dedicated
worker** — the same architectural choice `RevenueEngine.releaseMaturedBalances`
made for balance maturation (docs/revenue-platform.md). Every place a
payment's status is about to be shown or acted on sweeps first
(`PaymentExpiryService.sweep`):

- `CheckoutService.getStatus` — scoped to the one order being polled.
- `PaymentService.searchResolved` / `PaymentService.listByOrderId` — the
  admin Payments listing and the Order Details page's attempts table.

A swept row: `status → expired`, `expiredAt` stamped (distinct from
`expiresAt` — the gap between the two is intentional, expiry is *observed*
lazily, not enforced the instant the deadline passes), a `payment.expired`
timeline event recorded. Never touches money, never notifies the student,
never contacts the provider. `expired` is not final (§7) — a late webhook can
still resolve it (§8).

An **optional** scheduled counterpart exists for the case nothing ever reads
a truly abandoned order again: `GET /api/payments/cron/sweep-expired`, gated
by `CRON_SECRET` (`Authorization: Bearer <secret>`, 404s if unset). Wire it to
any scheduler at any interval — hourly is plenty. The platform is already
correct without it; this only affects how promptly a permanently-abandoned
order's last attempt reads `expired` instead of `pending` in a listing nobody
is looking at.

## 10. Payment attempts

Every checkout retry is a first-class row, not a mutation of a previous one
— `PaymentRepository.findByOrderId` returns every attempt, newest first. Each
exposes: `attemptNumber`, `createdAt`, `expiresAt`/`expiredAt`, `status`,
`providerPaymentId`/`providerTransactionId`, `abandonedAt`/`abandonedReason`,
`failureReason`. The Admin Order Details page's **Payment Attempts** table
(`/admin/orders/[id]`) renders exactly this — the relationship between an
order and its attempts is a straight `orderId` foreign key, no derived state.

Reporting distinguishes attempt outcomes rather than lumping everything that
isn't `succeeded` into "pending": `succeeded`, `failed`/`canceled`,
`expired`, `abandoned` are each their own bucket in the admin Payments
listing's status filter and the Payment Attempts table — an abandoned
checkout never shows as "Pending" forever.

## 11. Payment / Order Timeline

`order_audit_logs` (§4) is both the narrower order-status audit trail this
table has always been AND, since this work, the platform's generic
chronological event log per order — one feed instead of a status log plus a
separate timeline table. `OrderAuditLogRepository.findByOrderId` returns it
oldest-first, exactly the order the Admin Order Details page's **Timeline**
section renders top to bottom.

Every event carries: timestamp (`createdAt`), event type (`action` — open
vocabulary, see `KNOWN_ORDER_TIMELINE_EVENTS` in
`commerce/types/order-audit-log.ts` for what's written today), the related
payment attempt (`paymentId`, nullable — order-level events like
`order_created` have none), actor (`actorType`: `system | user | admin |
provider`, plus optional `actorId`), and free-form `metadata`. Rows are
**insert-only** — no update, no delete method exists on the repository.

Events recorded today span the full lifecycle: `order_created`,
`checkout.started`, `payment_attempt.created`, `payment.redirected`,
`checkout.returned`, `checkout.abandoned`, `payment.authorized`,
`payment.succeeded`, `payment.late_recovery`, `payment.declined`,
`payment.voided`, `payment.expired`, `revenue.allocated`,
`enrollment.granted`, `order_paid`, `invoice.generated`, `refund.requested`,
`refund.completed`, `refund.failed`, `order_cancelled`, `order_refunded`.

**Designed for extension without touching existing logic**: `action` is
plain `string`, not a closed union or Postgres enum — a brand-new domain
(emails, certificates, payouts, subscriptions) records its own event by
calling the existing `recordOrderAuditLog({ action: "certificate.issued",
orderId, actorType: "system", ... })` from `commerce/utils/audit-log.ts`.
Zero migration, zero change to this file, the schema, or any of the services
already writing to it. `paymentId` being a *soft* reference (§4) means new
event types don't need to be payment-related at all.

## 12. Cleanup strategy

**Financial history is never deleted.** Every `payments` row — including
every `expired`/`abandoned` attempt — stays exactly where it is forever; so
does every `order_audit_logs` timeline event. Deleting an attempt would erase
exactly the record a "why did this student get charged twice" investigation
(§8) or a refund-eligibility audit needs.

What "cleanup" means here instead is keeping **operational queries** honest:

- The expiry sweep (§9) means a `pending` attempt doesn't sit in that state
  forever in a listing — it becomes `expired`, a distinct, filterable bucket,
  the moment anything looks at it (or via the optional cron).
- The abandon-on-retry logic (§6) means a superseded attempt is `abandoned`,
  not indefinitely `pending`, from the moment the retry happens — no sweep
  needed for that case at all.
- Both `payments_status_idx` and the new `payments_expiry_sweep_idx`
  (`status, expires_at`) keep the sweep's own query — and every status-
  filtered listing — index-backed regardless of how many historical rows
  accumulate.

No retention job, no archival table, no TTL deletion. If storage volume ever
becomes a real concern at scale, the answer is partitioning `payments`/
`order_audit_logs` by `created_at`, not deleting rows — out of scope today.

## 13. Webhook lifecycle & security model

- **Signature verification** — per-adapter; Paymob: SHA-512 HMAC over the
  lexicographic field concatenation, compared with
  `crypto.timingSafeEqual`. Unverified deliveries are stored
  (`signatureVerified: false`), rejected with 401, and can never mutate a
  payment.
- **Replay / duplicate protection** — the `payment_events` unique slot.
  Clean replays acknowledge (200) without reprocessing; a delivery whose
  processing previously failed (`processingError` set) is resumed on retry.
- **Idempotency** — every state transition is guarded (forward-only payment
  statuses, late-recovery aware — §7/§8 — idempotent order completion,
  once-only invoice, `onConflictDoNothing` redemptions).
- **Payment verification** — a `payment.succeeded` event must match the
  payment's amount and currency to the cent, or it is logged
  (`webhook.amount_mismatch`) and **not** completed — unchanged by the
  late-recovery work; verification runs identically whether the payment was
  `pending` or `expired`/`abandoned` when the event arrived.
- **Retries** — processing failures return 5xx so the provider redelivers.
- **No secret leakage** — secrets live in server-only env (`src/lib/env.ts`
  loaders); raw payloads live in `payment_events` (access-controlled), not
  in logs.
- CSRF: checkout runs through Next.js Server Actions (origin-checked);
  webhooks are authenticated by signature, not by session.

## 14. Refund / capture / void lifecycle

`PaymentService.refund(paymentId, amount?, reason?)` — the one refund entry
point. Validates refundable remainder, provider capability
(`partialRefund`), writes the `refunds` row `pending` *before* calling the
provider (`refund.requested` timeline event), settles from the synchronous
answer or the later webhook (`refund.completed`/`refund.failed`), keeps
`payments.refundedAmount` as the settled sum, flips the payment to
`partially_refunded`/`refunded`, marks the order `refunded` when full, and
emails the student. Provider-initiated refunds arriving purely by webhook
are synthesized into `refunds` rows so history stays complete.

`capture`/`void` act on `authorized` payments; a successful capture runs the
same fulfillment pipeline a webhook success would. `void` is the one place
`canceled` is set by an admin directly — a deliberate, provider-confirmed
action, not a guess, which is exactly why it's allowed to be final while
browser abandonment (§7) is not. Adapters for providers without auth/capture
simply declare `capabilities.capture = false` — the UI hides the buttons and
the service refuses.

## 15. Coupons, pricing, currencies, taxes

- **Coupon engine** (`CouponService.validateForCheckout`): active flag,
  expiry, global limit, per-user limit (via `coupon_redemptions`), minimum
  subtotal, scope (course/specialty/sitewide), percentage or fixed discount,
  max-discount cap, never below zero / above price. Discounts are locked
  into the order at checkout, never recomputed.
- **Pricing engine** (`payments/pricing/pricing.service.ts`): the one place
  totals are computed — `total = (subtotal − discount) + tax`.
- **Taxes**: `PAYMENT_TAX_RATE_PERCENT` (default 0); stored per order in
  `tax_total`, shown on invoices/receipts. Replacing the knob with a
  per-country table touches only the pricing module.
- **Currencies** (`payments/types/currency.ts`): EGP, USD, SAR, AED with
  minor-unit conversion; adding a currency is a config entry.

## 16. Invoices & emails

`InvoiceService.issueForOrder` runs once per completed order (an
`invoice.generated` timeline event fires alongside it); the PDF (`pdf-lib`,
already a dependency) renders on demand at
`GET /api/payments/invoices/[invoiceId]/pdf` (owner or admin only) and is
attached to the receipt email. Emails (payment success + receipt, payment
failed, refund issued; enrollment confirmation rides the success email and
in-app notifications) go through Resend's REST API via `fetch` — unset
`RESEND_API_KEY` means logged no-op, never a blocked payment.

## 17. Administration

- `/admin/payments` — searchable/filterable listing (status — including
  `expired`/`abandoned` — provider, free text over our ids and the
  provider's). Sweeps expiry lazily on every load (§9).
- `/admin/payments/[id]` — full detail: amounts, identifiers, refund
  history, the webhook event log (type, signature verdict, processing
  outcome), and capability-gated Refund (full/partial + reason), Capture,
  Void actions.
- `/admin/orders` — unchanged shell, now backed by `payments` for the
  payment-status column, plus tax display and management-only Mark
  Paid/Cancel/Refund.
- `/admin/orders/[id]` — extended with the **Payment Attempts** table (§10)
  and the **Timeline** (§11): every attempt at this order, and every event
  recorded against it, in one place.
- `/api/payments/cron/sweep-expired` — optional scheduled expiry sweep (§9).
- Students: `/dashboard/orders` shows payment status and the invoice PDF
  download. Export-ready: every listing is a paginated repository `search`
  with typed filters — a CSV endpoint can reuse the same queries.

## 18. Observability

`payments-logger` emits one JSON line per lifecycle event (prod-visible by
design, unlike the dev-only `lib/logger`): `checkout.session_created`,
`webhook.payment_succeeded`, `webhook.late_recovery`,
`webhook.amount_mismatch`, `webhook.signature_rejected`, `payment.abandoned`,
`payment.expired`, `refund.succeeded`, `capture.provider_error`,
`fulfillment.completion_failed`, `email.sent`, … Grep by
`"scope":"payments"`. Identifiers and outcomes only — never secrets or full
payloads (those live in `payment_events`). The Timeline (§11) is the
complementary, per-order, human/admin-facing view of the same story the
structured logs tell in aggregate.

## 19. Environment variables

See `.env.example` for the annotated block:

| Var | Required | Purpose |
| --- | --- | --- |
| `PAYMENT_PROVIDER` | for paid checkout | Active adapter id (`paymob`) |
| `PAYMENT_TAX_RATE_PERCENT` | no (0) | Pricing-engine tax knob |
| `PAYMENT_ATTEMPT_TTL_MINUTES` | no (30) | How long an attempt stays `pending` before the expiry sweep can mark it `expired` |
| `CRON_SECRET` | no | Bearer secret for the optional `/api/payments/cron/sweep-expired` route; unset = route 404s |
| `PAYMOB_SECRET_KEY` / `PAYMOB_PUBLIC_KEY` | yes (Paymob) | Intention API + unified checkout |
| `PAYMOB_HMAC_SECRET` | yes (Paymob) | Webhook signature verification |
| `PAYMOB_INTEGRATION_IDS` | yes (Paymob) | Comma-separated integration ids offered |
| `PAYMOB_API_KEY` | for refund/capture/void | Legacy Acceptance-API token auth |
| `PAYMOB_API_BASE` | no | Defaults to `https://accept.paymob.com` |
| `NEXT_PUBLIC_SITE_URL` | production | Return-URL origin |
| `RESEND_API_KEY` / `PAYMENT_EMAIL_FROM` | no | Transactional emails |

All loaders fail gracefully (feature-off, never crash), mirroring
`mediaStorageEnv`.

## 20. Paymob dashboard configuration

1. Settings → Account Info: copy Secret Key, Public Key, HMAC secret, and
   (for refunds) the API Key into env.
2. Developers → Payment Integrations: note the integration ids to offer
   (card, mobile wallet, …) → `PAYMOB_INTEGRATION_IDS`.
3. For each integration, set the **Transaction processed callback** to
   `https://<your-domain>/api/payments/webhooks/paymob` (POST). The
   transaction *response* (redirect) URL is supplied per-intention by the
   platform — no dashboard config needed.
4. Test with Paymob's test cards in test mode before flipping live keys.

## 21. Testing strategy

Checklist (manual, staging with Paymob test mode):

- [ ] Free course checkout → immediate enrollment, no `payments` row.
- [ ] Coupon bringing total to 0 → same as free; redemption recorded once.
- [ ] Paid checkout → hosted checkout opens in a new tab → pay with test card
      → both the new tab's result page AND the original tab's waiting panel
      flip to "enrolled" only after the webhook; enrollment, invoice row,
      receipt email (+PDF) all exist.
- [ ] Click "cancel and return" mid-checkout → payment row `abandoned`
      (`user_cancelled`), original tab shows the form again, no order-level
      side effects.
- [ ] Retry the SAME order (click Continue to Payment twice) → the first
      attempt is marked `abandoned` (`superseded_by_retry`), a second
      `payments` row opens with `attemptNumber: 2` — no Paymob "already
      exists" error.
- [ ] Declined test card → payment `failed`, order stays `pending`, retry
      opens attempt N+1, failure email/notification sent.
- [ ] Let an attempt sit past `PAYMENT_ATTEMPT_TTL_MINUTES` untouched, then
      poll its order's status → it reads `expired`, `expiredAt` stamped.
- [ ] Send a `payment.succeeded` webhook for an already-`expired`/`abandoned`
      attempt → it still completes the order (or is a safe idempotent no-op
      if a different attempt already did) and a `payment.late_recovery`
      timeline event is recorded.
- [ ] Replay the same webhook body+hmac (curl) → 200, no double enrollment,
      one `payment_events` row per delivery slot.
- [ ] Tampered webhook (wrong hmac) → 401, event stored unverified, payment
      untouched.
- [ ] Amount-mismatch webhook → acknowledged, logged, NOT completed.
- [ ] Admin partial refund → `refunds` row, `partially_refunded`, email;
      second refund of the remainder → payment `refunded`, order `refunded`.
- [ ] Refund/capture/void without `PAYMOB_API_KEY` → clean error, no state
      change.
- [ ] `PAYMENT_PROVIDER` unset → paid checkout reports unavailable; free
      flow unaffected.
- [ ] Invoice PDF downloads for the owner; 404s for another student.
- [ ] `/admin/orders/[id]` shows every attempt (including abandoned/expired
      ones) and a chronological Timeline covering the whole flow.
- [ ] `pnpm lint && pnpm typecheck && pnpm build` all pass.

Future automation: adapter unit tests (HMAC vectors, payload
classification), webhook pipeline tests with a fake adapter, pricing-engine
property tests, a state-machine property test asserting no transition ever
reaches `succeeded` from a `FINAL_PAYMENT_STATUSES` source. The seams
(adapter interface, pricing module, fulfillment service, expiry service)
were cut so each is testable in isolation.

## 22. Future extension points

- New providers (§3) — Geidea/Fawry/Meeza/Stripe/Paddle as plugins.
- Multi-course carts — `order_items` already models N items; the checkout
  UI and `createFromCheckout` are the only single-course assumptions.
- Per-country tax tables — replace the pricing engine's rate knob.
- Payment-link / invoice-first flows — `payments` rows are not
  checkout-bound by schema.
- ORDER-level expiry (distinct from the payment-attempt-level expiry this
  doc covers) — `orders.status`'s `expired` enum value exists but nothing
  sweeps it yet; a stalled `pending` order with no live attempt is today's
  gap, not covered by `PaymentExpiryService`.
- CSV export — reuse repository `search` filters (payments, orders, and now
  the Timeline).
- Queue-backed email/webhook retries — `media/queue` already models the
  pattern.
- The Timeline (§11) is explicitly built for this: any of the above appends
  its own event type with zero changes to `order_audit_logs`,
  `OrderAuditLogRepository`, or `recordOrderAuditLog`.
