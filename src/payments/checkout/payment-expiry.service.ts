import "server-only";

import { PaymentRepository } from "@/payments/repositories/payment.repository";
import { recordOrderAuditLog } from "@/commerce/utils/audit-log";
import { paymentsLogger } from "@/payments/utils/payments-logger";
import type { Payment } from "@/payments/types/payment";

/**
 * The expiry sweep (docs/payment-platform.md §Expiration). Deliberately
 * lazy, not a hard deadline enforced mid-request or a dedicated worker —
 * same "sweep opportunistically on the read paths that already care"
 * choice `RevenueEngine.releaseMaturedBalances` made for balance
 * maturation. Every place a payment's status is about to be shown or
 * acted on (`CheckoutService.getStatus`, the admin Payments listing,
 * `CheckoutService.start`'s own superseding logic) sweeps first, so a
 * stale `pending` row is *observed* as `expired` almost as soon as
 * anything looks at it — without a scheduler.
 *
 * `sweep()` is also exposed as a plain function any real cron (Vercel
 * Cron, a GitHub Actions schedule, …) can call for the case NOTHING
 * ever reads a truly abandoned order again — see
 * `src/app/api/payments/cron/sweep-expired/route.ts` for the wiring;
 * running it is optional, the lazy sweep is what keeps the platform
 * correct even if no cron is ever configured.
 *
 * Expiring a payment is purely a bookkeeping transition: `expired` is
 * NOT in `FINAL_PAYMENT_STATUSES`, so a late webhook can still resolve
 * an expired row into `succeeded`/`failed` — see `WebhookService`'s
 * late-recovery handling. This sweep never touches money, never
 * notifies the student, and never contacts the provider.
 */
export const PaymentExpiryService = {
  /** Sweeps every `pending` row past its `expiresAt`, optionally scoped
   *  to one order (the cheap, targeted call from a read path already
   *  holding an `orderId`). Returns how many rows were flipped. */
  async sweep(options?: { orderId?: string }): Promise<number> {
    const due = await PaymentRepository.findExpiredPending({ orderId: options?.orderId });
    if (due.length === 0) return 0;

    let swept = 0;
    for (const payment of due) {
      swept += (await expireOne(payment)) ? 1 : 0;
    }
    return swept;
  },
};

async function expireOne(payment: Payment): Promise<boolean> {
  const now = new Date().toISOString();
  const updated = await PaymentRepository.update(payment.id, {
    status: "expired",
    expiredAt: now,
  });
  if (updated.status !== "ok") {
    // Lost a race with a webhook/another sweep resolving this row first
    // — not an error, just nothing left to do.
    return false;
  }

  paymentsLogger.info("payment.expired", {
    paymentId: payment.id,
    orderId: payment.orderId,
    attemptNumber: payment.attemptNumber,
  });
  await recordOrderAuditLog({
    action: "payment.expired",
    orderId: payment.orderId,
    paymentId: payment.id,
    actorType: "system",
    actorId: null,
    message: `Payment attempt #${payment.attemptNumber} expired without a provider response.`,
    metadata: { attemptNumber: payment.attemptNumber, expiresAt: payment.expiresAt },
  });
  return true;
}
