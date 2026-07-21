import "server-only";

import { siteUrl } from "@/lib/site-config";
import { OrderService } from "@/commerce/services/order.service";
import { OrderRepository } from "@/commerce/repositories/order.repository";
import { OrderItemRepository } from "@/commerce/repositories/order-item.repository";
import { CourseRepository } from "@/courses/repositories/course.repository";
import { ProfileService } from "@/auth/services/profile.service";
import { canAccessStudentData } from "@/commerce/utils/require-student-access";
import { resolveLocalizedText } from "@/cms/utils/resolve-localized";
import { getActivePaymentProvider } from "@/payments/providers";
import { PaymentRepository } from "@/payments/repositories/payment.repository";
import { PaymentExpiryService } from "@/payments/checkout/payment-expiry.service";
import { isSupportedCurrency } from "@/payments/types/currency";
import { safeMutation, safeRead } from "@/payments/utils/safe-operation";
import { paymentsLogger } from "@/payments/utils/payments-logger";
import { recordOrderAuditLog } from "@/commerce/utils/audit-log";
import type { AuthUser } from "@/auth/types/session";
import type { AbandonedReason, Payment } from "@/payments/types/payment";
import type { TimelineActorType } from "@/commerce/types/order-audit-log";
import type { CheckoutStart, CheckoutStatus } from "@/payments/types/checkout";
import type { PaymentActionResult } from "@/payments/types/result";
import type { StartCheckoutInput } from "@/payments/validators/checkout.validator";

function splitName(fullName: string | null, email: string): { firstName: string; lastName: string } {
  const source = (fullName ?? "").trim();
  if (!source) return { firstName: email.split("@")[0] ?? "Student", lastName: "Student" };
  const parts = source.split(/\s+/);
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") || parts[0] };
}

/** Shared by both abandonment triggers (`start()`'s automatic
 *  supersession and the explicit `abandon()` action) — one status
 *  transition, one timeline event, two reasons/actors. */
async function abandonPayment(
  payment: Payment,
  reason: AbandonedReason,
  actorType: TimelineActorType,
  actorId: string | null,
): Promise<void> {
  const now = new Date().toISOString();
  const updated = await PaymentRepository.update(payment.id, {
    status: "abandoned",
    abandonedAt: now,
    abandonedReason: reason,
  });
  if (updated.status !== "ok") return; // lost a race with a webhook resolving it first — fine, nothing to do

  paymentsLogger.info("payment.abandoned", { paymentId: payment.id, orderId: payment.orderId, reason });
  await recordOrderAuditLog({
    action: "checkout.abandoned",
    orderId: payment.orderId,
    paymentId: payment.id,
    actorType,
    actorId,
    message:
      reason === "superseded_by_retry"
        ? `Payment attempt #${payment.attemptNumber} abandoned — superseded by a new attempt.`
        : `Payment attempt #${payment.attemptNumber} abandoned by the student.`,
    metadata: { attemptNumber: payment.attemptNumber, reason },
  });
}

/**
 * The checkout pipeline's entry point (docs/payment-platform.md
 * §Checkout): order creation stays with `OrderService` (what the sale
 * IS), everything from "how it gets paid" onward starts here. `start`
 * hands back either a completed $0 order or a provider redirect; the
 * browser NEVER learns an outcome from that redirect — `getStatus`
 * reads webhook-verified DB state and is the only thing the result page
 * trusts.
 */
export const CheckoutService = {
  async start(actingUser: AuthUser, input: StartCheckoutInput): Promise<PaymentActionResult<CheckoutStart>> {
    return safeMutation<CheckoutStart>(async (): Promise<PaymentActionResult<CheckoutStart>> => {
      const checkout = await OrderService.createFromCheckout(actingUser, {
        courseId: input.courseId,
        couponCode: input.couponCode,
      });
      if (!checkout.success) {
        return { success: false, code: checkout.code === "validation_failed" ? "validation_failed" : "conflict", message: checkout.message };
      }
      const { order, isFree } = checkout.data;

      if (isFree) {
        paymentsLogger.info("checkout.completed_free", { orderId: order.id, userId: actingUser.id });
        return { success: true, data: { kind: "completed", order } };
      }

      const provider = getActivePaymentProvider();
      if (!provider) {
        return {
          success: true,
          data: {
            kind: "unavailable",
            message: "Online payments aren't available right now. Please try again later.",
          },
        };
      }
      if (!isSupportedCurrency(order.currency)) {
        paymentsLogger.error("checkout.unsupported_currency", { orderId: order.id, currency: order.currency });
        return { success: false, code: "unavailable", message: `Currency ${order.currency} isn't supported for online payment.` };
      }

      const [profiles, items] = await Promise.all([
        ProfileService.getByUserIds([actingUser.id]),
        OrderItemRepository.findByOrderId(order.id),
      ]);
      const profile = profiles[0];
      if (!profile?.email) {
        return { success: false, code: "unavailable", message: "Your profile is missing an email address." };
      }
      const courses = await CourseRepository.findByIds(items.map((item) => item.courseId));
      const courseTitle = courses[0] ? resolveLocalizedText(courses[0].title, "en") : "Bosla course";
      const courseSlug = courses[0]?.slug ?? "";

      await recordOrderAuditLog({
        action: "checkout.started",
        orderId: order.id,
        actorType: "user",
        actorId: actingUser.id,
        metadata: { provider: provider.id },
      });

      // Every `start()` call opens a fresh attempt — never reuse a
      // pending row's id for a new provider session. Paymob's Intention
      // API (and most hosted-checkout providers) treats the merchant
      // reference we pass as create-once: a second `createCheckout` for
      // the same `payment.id` is rejected ("An Order with ref: ...
      // already exists"), which is exactly what "resume the pending row"
      // used to trigger on any retry (cancel-and-return, a second click,
      // coming back from a stale tab).
      //
      // A superseded pending row is marked `abandoned` (reason
      // `superseded_by_retry`), NOT `canceled` — its hosted checkout tab
      // may still be open somewhere, and `canceled` is a
      // FINAL_PAYMENT_STATUSES value that would make a real,
      // provider-confirmed success on that tab get silently ignored
      // (money taken, access never granted). `abandoned` is NOT final:
      // a late webhook can still resolve it into `succeeded`/`failed`
      // (docs/payment-platform.md §Lifecycle, WebhookService's
      // late-recovery handling).
      const existingPayments = await PaymentRepository.findByOrderId(order.id);
      const stalePending = existingPayments.filter((existing) => existing.status === "pending");
      await Promise.all(stalePending.map((stale) => abandonPayment(stale, "superseded_by_retry", "system", null)));

      const attemptNumber = existingPayments.length + 1;
      const payment = await PaymentRepository.create({
        orderId: order.id,
        provider: provider.id,
        amount: order.total,
        currency: order.currency,
        attemptNumber,
        idempotencyKey: `order:${order.id}:attempt:${attemptNumber}`,
      });
      await recordOrderAuditLog({
        action: "payment_attempt.created",
        orderId: order.id,
        paymentId: payment.id,
        actorType: "system",
        actorId: null,
        message: `Payment attempt #${attemptNumber} created.`,
        metadata: { attemptNumber, expiresAt: payment.expiresAt },
      });

      const { firstName, lastName } = splitName(profile.fullName ?? profile.displayName, profile.email);
      const returnUrl = new URL(
        `/${input.locale}/checkout/${courseSlug}/result?orderId=${order.id}`,
        siteUrl,
      ).toString();

      const session = await provider.createCheckout({
        paymentId: payment.id,
        orderId: order.id,
        amount: order.total,
        currency: order.currency,
        description: courseTitle,
        customer: { id: actingUser.id, email: profile.email, firstName, lastName },
        returnUrl,
      });

      await PaymentRepository.update(payment.id, {
        providerPaymentId: session.providerPaymentId,
        providerResponse: session.raw,
      });

      paymentsLogger.info("checkout.session_created", {
        orderId: order.id,
        paymentId: payment.id,
        provider: provider.id,
        amount: order.total,
        currency: order.currency,
      });
      await recordOrderAuditLog({
        action: "payment.redirected",
        orderId: order.id,
        paymentId: payment.id,
        actorType: "system",
        actorId: null,
        message: "Student redirected to the provider's hosted checkout.",
        metadata: { provider: provider.id },
      });

      return {
        success: true,
        data: { kind: "redirect", order, paymentId: payment.id, redirectUrl: session.redirectUrl },
      };
    });
  },

  /** The explicit "cancel and return" action — the student, in our own
   *  UI, says they're giving up on this specific attempt (as opposed to
   *  `start()`'s automatic supersession, which infers abandonment from
   *  a retry). Same non-final `abandoned` status, different
   *  `abandonedReason`; a late webhook can still resolve it. Idempotent:
   *  abandoning an already-resolved payment is a no-op success, not an
   *  error — the student may click Cancel after it already settled. */
  async abandon(actingUser: AuthUser, paymentId: string): Promise<PaymentActionResult<{ abandoned: boolean }>> {
    return safeMutation<{ abandoned: boolean }>(async (): Promise<PaymentActionResult<{ abandoned: boolean }>> => {
      const payment = await PaymentRepository.findById(paymentId);
      if (!payment) {
        return { success: false, code: "not_found", message: "Payment not found." };
      }
      const order = await OrderRepository.findById(payment.orderId);
      if (!order || !canAccessStudentData(actingUser, order.studentId)) {
        return { success: false, code: "forbidden", message: "You cannot manage this payment." };
      }
      if (payment.status !== "pending") {
        // Already resolved (succeeded/failed/expired/etc.) or already
        // abandoned — nothing to do, and nothing to report as an error.
        return { success: true, data: { abandoned: false } };
      }
      await abandonPayment(payment, "user_cancelled", "user", actingUser.id);
      return { success: true, data: { abandoned: true } };
    });
  },

  /** The result page's polling target — DB truth only. */
  async getStatus(actingUser: AuthUser, orderId: string): Promise<PaymentActionResult<CheckoutStatus>> {
    const order = await safeRead(() => OrderRepository.findById(orderId), null);
    if (!order) {
      return { success: false, code: "not_found", message: "Order not found." };
    }
    if (!canAccessStudentData(actingUser, order.studentId)) {
      return { success: false, code: "forbidden", message: "You cannot view this order." };
    }

    // Lazy expiry sweep, scoped to this order — by the time anyone
    // polls status for a stale attempt, it should already read as
    // `expired` rather than an indefinite `pending`
    // (docs/payment-platform.md §Expiration). Best-effort: a sweep
    // failure must never break status polling.
    await safeRead(() => PaymentExpiryService.sweep({ orderId }), 0);

    const [payments, items] = await Promise.all([
      safeRead(() => PaymentRepository.findByOrderId(orderId), [] as Payment[]),
      safeRead(() => OrderItemRepository.findByOrderId(orderId), []),
    ]);
    const courses = await safeRead(() => CourseRepository.findByIds(items.map((item) => item.courseId)), []);
    const latest = payments[0] ?? null;

    // `expired`/`abandoned` read the same as `failed` to the student —
    // nothing left to wait for, retry is the only path forward — even
    // though neither is a FINAL_PAYMENT_STATUSES value server-side (a
    // late webhook can still resolve one into `succeeded`, which would
    // simply move `order.status` to `paid` and this branch would never
    // be reached again).
    const outcome: CheckoutStatus["outcome"] =
      order.status === "paid"
        ? "paid"
        : latest && (latest.status === "failed" || latest.status === "canceled" || latest.status === "expired" || latest.status === "abandoned")
          ? "failed"
          : "pending";

    return {
      success: true,
      data: { orderId: order.id, orderStatus: order.status, outcome, courseSlug: courses[0]?.slug ?? null },
    };
  },
};
