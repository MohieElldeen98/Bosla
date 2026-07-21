import "server-only";

import { OrderRepository } from "@/commerce/repositories/order.repository";
import { OrderService } from "@/commerce/services/order.service";
import { notify } from "@/notifications/utils/notify";
import { buildNotificationContent } from "@/notifications/utils/notification-content";
import { getPaymentProviderById } from "@/payments/providers";
import { PaymentRepository } from "@/payments/repositories/payment.repository";
import { PaymentEventRepository } from "@/payments/repositories/payment-event.repository";
import { RefundRepository } from "@/payments/repositories/refund.repository";
import { FulfillmentService } from "@/payments/services/fulfillment.service";
import { RevenueEngine } from "@/commerce/revenue/revenue-engine.service";
import { recordOrderAuditLog } from "@/commerce/utils/audit-log";
import { FINAL_PAYMENT_STATUSES, RECOVERABLE_PAYMENT_STATUSES } from "@/payments/types/payment";
import { paymentsLogger } from "@/payments/utils/payments-logger";
import type { PaymentProviderAdapter, ProviderWebhookEvent, ProviderWebhookRequest } from "@/payments/providers";
import type { Payment } from "@/payments/types/payment";

/** What the route handler turns into an HTTP status. `retry` asks the
 *  provider to redeliver (5xx); everything else acknowledges. */
export type WebhookOutcome =
  | { result: "processed" }
  | { result: "duplicate" }
  | { result: "ignored"; reason: string }
  | { result: "rejected"; reason: string }
  | { result: "retry"; reason: string };

function amountsMatch(expected: string, reported: string | null): boolean {
  if (reported === null) return false;
  return Math.round(Number(expected) * 100) === Math.round(Number(reported) * 100);
}

async function findPaymentForEvent(providerId: string, event: ProviderWebhookEvent): Promise<Payment | null> {
  // The merchant reference IS our payments.id — the strongest match.
  if (event.merchantReference) {
    const byReference = await PaymentRepository.findById(event.merchantReference).catch(() => null);
    if (byReference && byReference.provider === providerId) return byReference;
  }
  if (event.providerTransactionId) {
    const byTransaction = await PaymentRepository.findByProviderTransactionId(providerId, event.providerTransactionId);
    if (byTransaction) return byTransaction;
  }
  if (event.providerPaymentId) {
    return PaymentRepository.findByProviderPaymentId(providerId, event.providerPaymentId);
  }
  return null;
}

async function applyPaymentSuccess(payment: Payment, event: ProviderWebhookEvent): Promise<WebhookOutcome> {
  if (payment.status === "succeeded" || payment.status === "partially_refunded" || payment.status === "refunded") {
    return { result: "duplicate" };
  }
  if (FINAL_PAYMENT_STATUSES.includes(payment.status)) {
    // A success landing on a failed/canceled payment is a replayed or
    // out-of-order delivery — never resurrect a truly final state.
    return { result: "ignored", reason: `payment already ${payment.status}` };
  }
  // `pending`/`authorized` fall through as the normal case. `expired`/
  // `abandoned` ALSO fall through here — deliberately: neither is in
  // FINAL_PAYMENT_STATUSES, because both are the platform's own
  // bookkeeping guesses, not a provider-confirmed outcome. A provider
  // legitimately confirming payment after we stopped waiting is real
  // money that must still be honored (docs/payment-platform.md
  // §Lifecycle) — it's flagged as a "late recovery" below for
  // analytics/support visibility, never silently discarded.
  const isLateRecovery = payment.status === "expired" || payment.status === "abandoned";

  // THE verification step: the provider-reported amount/currency must
  // equal what the order was priced at. A tampered or partial charge
  // never grants access.
  if (!amountsMatch(payment.amount, event.amount) || (event.currency ?? "").toUpperCase() !== payment.currency.toUpperCase()) {
    paymentsLogger.error("webhook.amount_mismatch", {
      paymentId: payment.id,
      expectedAmount: payment.amount,
      expectedCurrency: payment.currency,
      reportedAmount: event.amount,
      reportedCurrency: event.currency,
    });
    return { result: "ignored", reason: "amount/currency mismatch — payment NOT completed" };
  }

  const updated = await PaymentRepository.update(payment.id, {
    status: "succeeded",
    providerTransactionId: event.providerTransactionId ?? payment.providerTransactionId,
    capturedAmount: payment.amount,
    paymentMethod: event.paymentMethod ?? payment.paymentMethod,
    providerResponse: event.raw,
    verifiedAt: new Date().toISOString(),
  });
  if (updated.status !== "ok") {
    return { result: "retry", reason: "payment row update failed" };
  }

  paymentsLogger.info("webhook.payment_succeeded", {
    paymentId: payment.id,
    orderId: payment.orderId,
    amount: payment.amount,
    currency: payment.currency,
    recoveredFromStatus: isLateRecovery ? payment.status : null,
  });

  const order = await OrderRepository.findById(payment.orderId);
  if (!order) return { result: "retry", reason: "order missing for verified payment" };

  if (isLateRecovery) {
    // Surfaced distinctly from the normal "payment.succeeded" event
    // below — this is the signal a double-charge investigation starts
    // from: the order may already be `paid` via a different attempt
    // (`completeFromVerifiedPayment` is idempotent either way, so
    // access is never double-granted, but the MONEY may genuinely have
    // moved twice and needs a human to look at it).
    paymentsLogger.warn("webhook.late_recovery", {
      paymentId: payment.id,
      orderId: payment.orderId,
      recoveredFromStatus: payment.status,
      orderAlreadyPaid: order.status === "paid",
    });
    await recordOrderAuditLog({
      action: "payment.late_recovery",
      orderId: payment.orderId,
      paymentId: payment.id,
      actorType: "provider",
      actorId: null,
      message: `Payment attempt #${payment.attemptNumber}, previously ${payment.status}, was confirmed successful by a late provider webhook.${order.status === "paid" ? " The order was already paid via a different attempt — check for a duplicate charge." : ""}`,
      metadata: { attemptNumber: payment.attemptNumber, recoveredFromStatus: payment.status, orderAlreadyPaid: order.status === "paid" },
    });
  }
  await recordOrderAuditLog({
    action: "payment.succeeded",
    orderId: payment.orderId,
    paymentId: payment.id,
    actorType: "provider",
    actorId: null,
    message: `Payment attempt #${payment.attemptNumber} confirmed by the provider.`,
    metadata: { attemptNumber: payment.attemptNumber, amount: payment.amount, currency: payment.currency },
  });

  const fulfillment = await FulfillmentService.completePaidOrder(order, payment.id);
  return fulfillment.completed ? { result: "processed" } : { result: "retry", reason: "order completion failed" };
}

async function applyPaymentFailure(
  payment: Payment,
  event: ProviderWebhookEvent,
  finalStatus: "failed" | "canceled",
): Promise<WebhookOutcome> {
  if (payment.status === finalStatus) return { result: "duplicate" };
  if (!RECOVERABLE_PAYMENT_STATUSES.includes(payment.status)) {
    // Anything already succeeded/partially_refunded/refunded (or the
    // OTHER final status) must never move to failed/canceled — this is
    // the guard that keeps a late/replayed failure from un-succeeding a
    // settled payment.
    return { result: "ignored", reason: `payment already ${payment.status}` };
  }
  // `pending`/`authorized` is the normal path. `expired`/`abandoned`
  // are also accepted here — a late "declined"/"voided" webhook on an
  // attempt we'd already stopped waiting on is still worth recording
  // accurately (it has no money/access implications either way, unlike
  // a late success), rather than silently ignored.
  const isLateRecovery = payment.status === "expired" || payment.status === "abandoned";

  const failureReason = finalStatus === "canceled" ? "provider_voided" : "provider_declined";
  const updated = await PaymentRepository.update(payment.id, {
    status: finalStatus,
    providerTransactionId: event.providerTransactionId ?? payment.providerTransactionId,
    paymentMethod: event.paymentMethod ?? payment.paymentMethod,
    providerResponse: event.raw,
    failureReason,
  });
  if (updated.status !== "ok") return { result: "retry", reason: "payment row update failed" };

  paymentsLogger.info("webhook.payment_failed", { paymentId: payment.id, orderId: payment.orderId, finalStatus, recoveredFromStatus: isLateRecovery ? payment.status : null });

  const order = await OrderRepository.findById(payment.orderId);
  await recordOrderAuditLog({
    action: finalStatus === "canceled" ? "payment.voided" : "payment.declined",
    orderId: payment.orderId,
    paymentId: payment.id,
    actorType: "provider",
    actorId: null,
    message: `Payment attempt #${payment.attemptNumber} ${finalStatus === "canceled" ? "voided" : "declined"} by the provider.`,
    metadata: { attemptNumber: payment.attemptNumber, failureReason },
  });

  // The order stays pending (retryable) — record the failure for the
  // student via in-app notification + email; never block on either.
  // Skipped once the order is already `paid`: a different attempt may
  // have already succeeded (this payment was `expired`/`abandoned`
  // precisely because a retry superseded it), and telling a student
  // "your payment failed" after they already got access is just wrong.
  if (order && finalStatus === "failed" && order.status !== "paid") {
    const content = await buildNotificationContent("orderFailed", { orderRef: order.id.slice(0, 8) });
    await notify({
      recipientUserId: order.studentId,
      type: "order_failed",
      ...content,
      data: { orderId: order.id, paymentId: payment.id },
    });
    await FulfillmentService.notifyPaymentFailed(order);
  }
  return { result: "processed" };
}

async function applyAuthorization(payment: Payment, event: ProviderWebhookEvent): Promise<WebhookOutcome> {
  if (payment.status === "authorized") return { result: "duplicate" };
  if (payment.status !== "pending" && payment.status !== "expired" && payment.status !== "abandoned") {
    return { result: "ignored", reason: `payment already ${payment.status}` };
  }
  if (!amountsMatch(payment.amount, event.amount)) {
    paymentsLogger.error("webhook.auth_amount_mismatch", { paymentId: payment.id });
    return { result: "ignored", reason: "authorization amount mismatch" };
  }
  const updated = await PaymentRepository.update(payment.id, {
    status: "authorized",
    providerTransactionId: event.providerTransactionId ?? payment.providerTransactionId,
    paymentMethod: event.paymentMethod ?? payment.paymentMethod,
    providerResponse: event.raw,
    verifiedAt: new Date().toISOString(),
  });
  if (updated.status !== "ok") return { result: "retry", reason: "payment row update failed" };
  paymentsLogger.info("webhook.payment_authorized", { paymentId: payment.id, orderId: payment.orderId });
  await recordOrderAuditLog({
    action: "payment.authorized",
    orderId: payment.orderId,
    paymentId: payment.id,
    actorType: "provider",
    actorId: null,
    message: `Payment attempt #${payment.attemptNumber} authorized by the provider.`,
    metadata: { attemptNumber: payment.attemptNumber },
  });
  return { result: "processed" };
}

async function applyRefundResult(
  payment: Payment,
  event: ProviderWebhookEvent,
  succeeded: boolean,
): Promise<WebhookOutcome> {
  // Match the oldest still-pending refund row; a provider-initiated
  // refund (made in their dashboard) may have none — synthesize one so
  // history stays complete.
  const refundRows = await RefundRepository.findByPaymentId(payment.id);
  const pending = [...refundRows].reverse().find((refund) => refund.status === "pending");
  const amount = event.amount ?? pending?.amount ?? null;

  if (!succeeded) {
    if (pending) await RefundRepository.updateStatus(pending.id, "failed", { providerResponse: event.raw });
    paymentsLogger.warn("webhook.refund_failed", { paymentId: payment.id, refundId: pending?.id ?? null });
    await recordOrderAuditLog({
      action: "refund.failed",
      orderId: payment.orderId,
      paymentId: payment.id,
      actorType: "provider",
      actorId: null,
      message: "Refund attempt failed at the provider.",
      metadata: { refundId: pending?.id ?? null },
    });
    return { result: "processed" };
  }
  if (amount === null) {
    return { result: "ignored", reason: "refund event without a resolvable amount" };
  }

  const refund =
    pending ??
    (await RefundRepository.create({
      paymentId: payment.id,
      provider: payment.provider,
      amount,
      currency: payment.currency,
      reason: "Recorded from provider webhook",
    }));
  await RefundRepository.updateStatus(refund.id, "succeeded", {
    providerRefundId: event.providerEventId,
    providerResponse: event.raw,
  });

  const settled = await RefundRepository.findByPaymentId(payment.id);
  const refundedTotal = settled
    .filter((row) => row.status === "succeeded")
    .reduce((sum, row) => sum + Number(row.amount), 0);
  const fullyRefunded = Math.round(refundedTotal * 100) >= Math.round(Number(payment.amount) * 100);

  await PaymentRepository.update(payment.id, {
    refundedAmount: refundedTotal.toFixed(2),
    status: fullyRefunded ? "refunded" : "partially_refunded",
    providerResponse: event.raw,
  });

  paymentsLogger.info("webhook.refund_succeeded", {
    paymentId: payment.id,
    refundId: refund.id,
    amount,
    fullyRefunded,
  });

  await recordOrderAuditLog({
    action: "refund.completed",
    orderId: payment.orderId,
    paymentId: payment.id,
    actorType: "provider",
    actorId: null,
    message: `Refund of ${amount} ${payment.currency} confirmed by the provider${fullyRefunded ? " (full refund)" : " (partial refund)"}.`,
    metadata: { refundId: refund.id, amount, fullyRefunded },
  });

  const order = await OrderRepository.findById(payment.orderId);
  if (order) {
    if (fullyRefunded) await OrderService.markRefundedFromVerifiedRefund(order.id);
    await RevenueEngine.reverseForRefund({
      orderId: order.id,
      reversalKey: refund.id,
      refundedAmount: amount,
      paidAmount: payment.amount,
    });
    await FulfillmentService.notifyRefundIssued(order, amount);
  }
  return { result: "processed" };
}

async function applyEvent(providerId: string, event: ProviderWebhookEvent): Promise<WebhookOutcome> {
  const payment = await findPaymentForEvent(providerId, event);
  if (!payment) {
    paymentsLogger.warn("webhook.unmatched", {
      provider: providerId,
      eventType: event.eventType,
      providerEventId: event.providerEventId,
      merchantReference: event.merchantReference,
    });
    return { result: "ignored", reason: "no matching payment" };
  }

  switch (event.eventType) {
    case "payment.succeeded":
      return applyPaymentSuccess(payment, event);
    case "payment.authorized":
      return applyAuthorization(payment, event);
    case "payment.failed":
      return applyPaymentFailure(payment, event, "failed");
    case "payment.voided":
      return applyPaymentFailure(payment, event, "canceled");
    case "refund.succeeded":
      return applyRefundResult(payment, event, true);
    case "refund.failed":
      return applyRefundResult(payment, event, false);
    case "unknown":
      return { result: "ignored", reason: "unclassified event" };
  }
}

/**
 * The one webhook pipeline every provider flows into
 * (docs/payment-platform.md §Webhooks). Order of operations is the
 * security model:
 *
 * 1. Signature verification (adapter, constant-time) — an unverified
 *    delivery is stored for audit and rejected, and can never touch a
 *    payment.
 * 2. Immutable event log insert — the `(provider, providerEventId,
 *    eventType)` unique slot makes replays/duplicate deliveries
 *    acknowledge-only.
 * 3. Normalized processing with forward-only status transitions and
 *    amount/currency verification before any grant.
 *
 * Failures inside processing return `retry` (→ 5xx) so the provider
 * redelivers; the dedupe slot then lets the retry pick up exactly where
 * a partially-processed delivery left off (every step is idempotent).
 */
export const WebhookService = {
  async process(providerId: string, request: ProviderWebhookRequest): Promise<WebhookOutcome> {
    const adapter: PaymentProviderAdapter | null = getPaymentProviderById(providerId);
    if (!adapter) {
      return { result: "rejected", reason: `unknown provider "${providerId}"` };
    }

    const verification = await adapter.verifyWebhook(request);
    const event = adapter.parseWebhook(request);

    const recorded = await PaymentEventRepository.create({
      provider: adapter.id,
      eventType: event.eventType,
      providerEventId: event.providerEventId,
      signatureVerified: verification.verified,
      payload: event.raw,
    });
    let eventRow = recorded.event;
    if (!recorded.created) {
      // This exact delivery is already in the log. A cleanly-processed
      // one is a pure replay → acknowledge. One whose processing failed
      // (recorded `processingError`) is the provider's retry doing its
      // job → resume processing below; every apply step is idempotent.
      const existing = event.providerEventId
        ? await PaymentEventRepository.findByProviderEvent(adapter.id, event.providerEventId, event.eventType)
        : null;
      if (!existing || !existing.processingError || !verification.verified) {
        paymentsLogger.info("webhook.duplicate", {
          provider: adapter.id,
          providerEventId: event.providerEventId,
          eventType: event.eventType,
        });
        return { result: "duplicate" };
      }
      eventRow = existing;
    }
    if (!eventRow) return { result: "retry", reason: "event log insert failed" };

    if (!verification.verified) {
      paymentsLogger.warn("webhook.signature_rejected", {
        provider: adapter.id,
        reason: verification.reason ?? "unspecified",
        providerEventId: event.providerEventId,
      });
      await PaymentEventRepository.markProcessed(eventRow.id, `signature rejected: ${verification.reason ?? "unspecified"}`);
      return { result: "rejected", reason: verification.reason ?? "signature verification failed" };
    }

    try {
      const outcome = await applyEvent(adapter.id, event);
      const payment = await findPaymentForEvent(adapter.id, event);
      if (payment) await PaymentEventRepository.attachPayment(eventRow.id, payment.id);
      await PaymentEventRepository.markProcessed(
        eventRow.id,
        outcome.result === "processed" || outcome.result === "duplicate" ? null : `${outcome.result}: ${"reason" in outcome ? outcome.reason : ""}`,
      );
      return outcome;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      paymentsLogger.error("webhook.processing_error", {
        provider: adapter.id,
        providerEventId: event.providerEventId,
        error: message,
      });
      await PaymentEventRepository.markProcessed(eventRow.id, message);
      return { result: "retry", reason: message };
    }
  },
};
