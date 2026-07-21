/**
 * The Commerce Domain's order-level audit trail — and, since the
 * Payment Lifecycle Hardening work (docs/payment-platform.md
 * §Timeline), the platform's generic **Order/Payment Timeline** too:
 * the same table now carries everything from "order_created" through
 * "payment_attempt.created", "checkout.abandoned", "revenue.allocated",
 * "invoice.generated", refunds, and beyond — one chronological feed per
 * order instead of a narrower order-status-only log plus a separate
 * timeline table.
 *
 * `OrderAuditAction` is deliberately `string`, not a closed union
 * (`order_audit_logs.action` is `text`) — a brand-new domain (emails,
 * certificates, payouts, subscriptions) appends its own event types
 * forever without a migration or touching this file. `KNOWN_...`
 * documents today's vocabulary for autocomplete/reference; it is not
 * exhaustive and never blocks a new value.
 */
export type OrderAuditAction = string;

/** Every event type a domain in this codebase writes today —
 *  documentation, not a closed set. */
export const KNOWN_ORDER_TIMELINE_EVENTS = [
  "order_created",
  "order_paid",
  "order_cancelled",
  "order_refunded",
  "checkout.started",
  "checkout.returned",
  "checkout.abandoned",
  "payment_attempt.created",
  "payment.redirected",
  "payment.authorized",
  "payment.succeeded",
  "payment.late_recovery",
  "payment.declined",
  "payment.voided",
  "payment.expired",
  "revenue.allocated",
  "enrollment.granted",
  "invoice.generated",
  "refund.requested",
  "refund.completed",
  "refund.failed",
] as const;

/** Who/what caused the event, independent of whether `actorId` is
 *  present — a `provider` webhook has no actor row; `system` is the
 *  platform acting on its own (an expiry sweep, an automatic
 *  supersession). */
export type TimelineActorType = "system" | "user" | "admin" | "provider";

/** Mirrors `db/schema/commerce.ts`'s `order_audit_logs`. Write-only,
 *  immutable, newest-last (`OrderAuditLogRepository.findByOrderId`
 *  returns chronological order) — the Admin Order Details page's
 *  Timeline section reads this directly. */
export interface OrderAuditLogEntry {
  id: string;
  action: OrderAuditAction;
  orderId: string;
  paymentId: string | null;
  actorType: TimelineActorType;
  actorId: string | null;
  message: string | null;
  createdAt: string;
  metadata: Record<string, unknown>;
}

export interface NewOrderAuditLogInput {
  action: OrderAuditAction;
  orderId: string;
  paymentId?: string | null;
  /** Defaults to `"system"` — every existing call site (order
   *  completion/cancellation/refund) omits this today and gets the
   *  right default; only user- or provider-initiated events need to
   *  pass it explicitly. */
  actorType?: TimelineActorType;
  actorId: string | null;
  message?: string | null;
  metadata?: Record<string, unknown>;
}
