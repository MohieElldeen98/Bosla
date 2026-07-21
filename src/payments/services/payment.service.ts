import "server-only";

import { OrderRepository } from "@/commerce/repositories/order.repository";
import { OrderItemRepository } from "@/commerce/repositories/order-item.repository";
import { OrderService } from "@/commerce/services/order.service";
import { CourseRepository } from "@/courses/repositories/course.repository";
import { ProfileService } from "@/auth/services/profile.service";
import { resolveLocalizedText } from "@/cms/utils/resolve-localized";
import { getPaymentProviderById } from "@/payments/providers";
import { PaymentRepository } from "@/payments/repositories/payment.repository";
import { PaymentExpiryService } from "@/payments/checkout/payment-expiry.service";
import { PaymentEventRepository } from "@/payments/repositories/payment-event.repository";
import { RefundRepository } from "@/payments/repositories/refund.repository";
import { FulfillmentService } from "@/payments/services/fulfillment.service";
import { RevenueEngine } from "@/commerce/revenue/revenue-engine.service";
import { recordOrderAuditLog } from "@/commerce/utils/audit-log";
import { requirePaymentManagementAccess } from "@/payments/utils/require-payment-access";
import { safeMutation, safeRead } from "@/payments/utils/safe-operation";
import { paymentsLogger } from "@/payments/utils/payments-logger";
import type { Locale } from "@/i18n/routing";
import type { Payment } from "@/payments/types/payment";
import type { PaymentEvent } from "@/payments/types/payment-event";
import type { Refund } from "@/payments/types/refund";
import type { PaymentActionResult } from "@/payments/types/result";
import type { PaymentListItem, PaymentSearchFilters, PaymentSearchResult } from "@/payments/types/payment-search";

export interface PaymentDetail {
  payment: PaymentListItem;
  events: PaymentEvent[];
  refunds: Refund[];
  capabilities: { refund: boolean; partialRefund: boolean; capture: boolean; void: boolean };
}

async function resolvePayments(rows: Payment[], locale: Locale): Promise<PaymentListItem[]> {
  if (rows.length === 0) return [];
  const orderIds = [...new Set(rows.map((payment) => payment.orderId))];
  const orders = await safeRead(
    () => Promise.all(orderIds.map((id) => OrderRepository.findById(id))),
    [] as (Awaited<ReturnType<typeof OrderRepository.findById>>)[],
  );
  const orderById = new Map(orders.filter((order) => order !== null).map((order) => [order!.id, order!]));

  const [items, profiles] = await Promise.all([
    safeRead(() => OrderItemRepository.findByOrderIds(orderIds), []),
    ProfileService.getByUserIds([
      ...new Set([...orderById.values()].map((order) => order.studentId)),
    ]),
  ]);
  const courses = await safeRead(
    () => CourseRepository.findByIds([...new Set(items.map((item) => item.courseId))]),
    [],
  );
  const itemByOrderId = new Map(items.map((item) => [item.orderId, item]));
  const courseById = new Map(courses.map((course) => [course.id, course]));
  const profileByUserId = new Map(profiles.map((profile) => [profile.userId, profile]));

  return rows.map((payment): PaymentListItem => {
    const order = orderById.get(payment.orderId);
    const item = order ? itemByOrderId.get(order.id) : undefined;
    const course = item ? courseById.get(item.courseId) : undefined;
    const student = order ? profileByUserId.get(order.studentId) : undefined;
    return {
      id: payment.id,
      orderId: payment.orderId,
      provider: payment.provider,
      providerPaymentId: payment.providerPaymentId,
      providerTransactionId: payment.providerTransactionId,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      capturedAmount: payment.capturedAmount,
      refundedAmount: payment.refundedAmount,
      paymentMethod: payment.paymentMethod,
      studentName: student?.displayName ?? student?.fullName ?? student?.email ?? (order?.studentId ?? ""),
      studentEmail: student?.email ?? "",
      courseTitle: course ? resolveLocalizedText(course.title, locale) : "",
      verifiedAt: payment.verifiedAt,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  });
}

/**
 * Admin-facing orchestration for the `payments` table
 * (docs/payment-platform.md §Administration). Reads back the platform's
 * dashboard; mutations are the post-payment money operations, each
 * management-gated, capability-checked against the owning provider's
 * adapter, and audit-trailed through `refunds`/`payment_events` rows
 * plus structured logs. Webhook-driven state changes live in
 * `WebhookService`, not here.
 */
export const PaymentService = {
  async searchResolved(filters: PaymentSearchFilters, locale: Locale): Promise<PaymentSearchResult<PaymentListItem>> {
    // Lazy, global expiry sweep — the admin Payments listing is exactly
    // the kind of "surfacing read" the sweep is meant to piggyback on
    // (docs/payment-platform.md §Expiration), same pattern
    // `RevenueEngine.releaseMaturedBalances` uses for balance reads.
    await safeRead(() => PaymentExpiryService.sweep(), 0);
    const result = await safeRead(() => PaymentRepository.search(filters), {
      items: [] as Payment[],
      total: 0,
      page: filters.page ?? 1,
      pageSize: filters.pageSize ?? 20,
      totalPages: 1,
    });
    const items = await resolvePayments(result.items, locale);
    return { ...result, items };
  },

  /** Every attempt at one order, newest first — the Admin Order Details
   *  page's "Payment Attempts" table (docs/payment-platform.md
   *  §Payment Attempts). Sweeps expiry first for the same reason
   *  `searchResolved` does: this is a surfacing read. */
  async listByOrderId(orderId: string): Promise<Payment[]> {
    await safeRead(() => PaymentExpiryService.sweep({ orderId }), 0);
    return safeRead(() => PaymentRepository.findByOrderId(orderId), []);
  },

  async getResolvedById(id: string, locale: Locale): Promise<PaymentActionResult<PaymentDetail>> {
    const payment = await safeRead(() => PaymentRepository.findById(id), null);
    if (!payment) {
      return { success: false, code: "not_found", message: "Payment not found." };
    }
    const [resolved] = await resolvePayments([payment], locale);
    const [events, refundRows] = await Promise.all([
      safeRead(() => PaymentEventRepository.findByPaymentId(id), [] as PaymentEvent[]),
      safeRead(() => RefundRepository.findByPaymentId(id), [] as Refund[]),
    ]);
    const adapter = getPaymentProviderById(payment.provider);
    return {
      success: true,
      data: {
        payment: resolved,
        events,
        refunds: refundRows,
        capabilities: adapter?.capabilities ?? { refund: false, partialRefund: false, capture: false, void: false },
      },
    };
  },

  /**
   * Full or partial refund — business logic's one refund entry point:
   * `refund(paymentId)` and the platform routes it to whichever
   * provider owns the payment. The refund row is written `pending`
   * BEFORE the provider call (an attempt that errors is still history),
   * settled from the synchronous answer, and re-confirmed/settled by
   * webhook for providers that answer asynchronously.
   */
  async refund(paymentId: string, amount?: string, reason?: string): Promise<PaymentActionResult<Refund>> {
    return safeMutation(async () => {
      const admin = await requirePaymentManagementAccess();
      if (!admin) {
        return { success: false, code: "forbidden", message: "You cannot manage payments." };
      }
      const payment = await PaymentRepository.findById(paymentId);
      if (!payment) {
        return { success: false, code: "not_found", message: "Payment not found." };
      }
      if (payment.status !== "succeeded" && payment.status !== "partially_refunded") {
        return { success: false, code: "conflict", message: `A ${payment.status} payment can't be refunded.` };
      }
      if (!payment.providerTransactionId) {
        return { success: false, code: "conflict", message: "This payment has no provider transaction to refund." };
      }
      const adapter = getPaymentProviderById(payment.provider);
      if (!adapter) {
        return { success: false, code: "unavailable", message: `Provider "${payment.provider}" isn't configured.` };
      }
      if (!adapter.capabilities.refund) {
        return { success: false, code: "unavailable", message: `Provider "${payment.provider}" doesn't support refunds.` };
      }

      const refundable = Number(payment.amount) - Number(payment.refundedAmount);
      const requested = amount !== undefined ? Number(amount) : refundable;
      if (!Number.isFinite(requested) || requested <= 0) {
        return { success: false, code: "validation_failed", message: "Enter a refund amount above zero." };
      }
      if (Math.round(requested * 100) > Math.round(refundable * 100)) {
        return {
          success: false,
          code: "validation_failed",
          message: `Only ${refundable.toFixed(2)} ${payment.currency} remains refundable.`,
        };
      }
      const isPartial = Math.round(requested * 100) < Math.round(Number(payment.amount) * 100);
      if (isPartial && !adapter.capabilities.partialRefund) {
        return { success: false, code: "unavailable", message: `Provider "${payment.provider}" only supports full refunds.` };
      }

      const refundRow = await RefundRepository.create({
        paymentId: payment.id,
        provider: payment.provider,
        amount: requested.toFixed(2),
        currency: payment.currency,
        reason: reason ?? null,
        createdByUserId: admin.id,
      });
      await recordOrderAuditLog({
        action: "refund.requested",
        orderId: payment.orderId,
        paymentId: payment.id,
        actorType: "admin",
        actorId: admin.id,
        message: `Refund of ${requested.toFixed(2)} ${payment.currency} requested.${reason ? ` Reason: ${reason}` : ""}`,
        metadata: { refundId: refundRow.id, amount: requested.toFixed(2) },
      });

      let operation;
      try {
        operation = await adapter.refund({
          providerTransactionId: payment.providerTransactionId,
          amount: requested.toFixed(2),
          currency: payment.currency,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await RefundRepository.updateStatus(refundRow.id, "failed", { providerResponse: { error: message } });
        paymentsLogger.error("refund.provider_error", { paymentId, refundId: refundRow.id, error: message });
        return { success: false, code: "provider_error", message: "The provider rejected the refund. See payment events for details." };
      }

      if (operation.status === "pending") {
        // Confirmation arrives by webhook; the row stays pending.
        paymentsLogger.info("refund.pending_confirmation", { paymentId, refundId: refundRow.id });
        return { success: true, data: refundRow };
      }

      const updated = await RefundRepository.updateStatus(refundRow.id, "succeeded", {
        providerRefundId: operation.providerReference,
        providerResponse: operation.raw,
      });

      const refundedTotal = Number(payment.refundedAmount) + requested;
      const fullyRefunded = Math.round(refundedTotal * 100) >= Math.round(Number(payment.amount) * 100);
      await PaymentRepository.update(payment.id, {
        refundedAmount: refundedTotal.toFixed(2),
        status: fullyRefunded ? "refunded" : "partially_refunded",
      });

      paymentsLogger.info("refund.succeeded", {
        paymentId,
        refundId: refundRow.id,
        amount: requested.toFixed(2),
        fullyRefunded,
        actorId: admin.id,
      });
      await recordOrderAuditLog({
        action: "refund.completed",
        orderId: payment.orderId,
        paymentId: payment.id,
        actorType: "admin",
        actorId: admin.id,
        message: `Refund of ${requested.toFixed(2)} ${payment.currency} completed${fullyRefunded ? " (full refund)" : " (partial refund)"}.`,
        metadata: { refundId: refundRow.id, amount: requested.toFixed(2), fullyRefunded },
      });

      const order = await OrderRepository.findById(payment.orderId);
      if (order) {
        if (fullyRefunded) await OrderService.markRefundedFromVerifiedRefund(order.id);
        await RevenueEngine.reverseForRefund({
          orderId: order.id,
          reversalKey: refundRow.id,
          refundedAmount: requested.toFixed(2),
          paidAmount: payment.amount,
          actorId: admin.id,
        });
        await FulfillmentService.notifyRefundIssued(order, requested.toFixed(2));
      }
      return { success: true, data: updated ?? refundRow };
    });
  },

  /** Capture a previously authorized payment — settles it and runs the
   *  same fulfillment pipeline a webhook success would. */
  async capture(paymentId: string): Promise<PaymentActionResult<Payment>> {
    return safeMutation(async () => {
      const admin = await requirePaymentManagementAccess();
      if (!admin) {
        return { success: false, code: "forbidden", message: "You cannot manage payments." };
      }
      const payment = await PaymentRepository.findById(paymentId);
      if (!payment) {
        return { success: false, code: "not_found", message: "Payment not found." };
      }
      if (payment.status !== "authorized") {
        return { success: false, code: "conflict", message: `Only an authorized payment can be captured (this one is ${payment.status}).` };
      }
      if (!payment.providerTransactionId) {
        return { success: false, code: "conflict", message: "This payment has no provider transaction to capture." };
      }
      const adapter = getPaymentProviderById(payment.provider);
      if (!adapter?.capabilities.capture) {
        return { success: false, code: "unavailable", message: `Provider "${payment.provider}" doesn't support capture.` };
      }

      let operation;
      try {
        operation = await adapter.capture({
          providerTransactionId: payment.providerTransactionId,
          amount: payment.amount,
          currency: payment.currency,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        paymentsLogger.error("capture.provider_error", { paymentId, error: message });
        return { success: false, code: "provider_error", message: "The provider rejected the capture." };
      }

      if (operation.status === "pending") {
        paymentsLogger.info("capture.pending_confirmation", { paymentId });
        return { success: true, data: payment };
      }

      const updated = await PaymentRepository.update(payment.id, {
        status: "succeeded",
        capturedAmount: payment.amount,
        providerResponse: operation.raw,
        verifiedAt: new Date().toISOString(),
      });
      if (updated.status !== "ok") {
        return { success: false, code: "conflict", message: "Payment changed while capturing. Reload and try again." };
      }
      paymentsLogger.info("capture.succeeded", { paymentId, actorId: admin.id });

      const order = await OrderRepository.findById(payment.orderId);
      if (order) await FulfillmentService.completePaidOrder(order);
      return { success: true, data: updated.data };
    });
  },

  /** Void a previously authorized, uncaptured payment. */
  async void(paymentId: string): Promise<PaymentActionResult<Payment>> {
    return safeMutation(async () => {
      const admin = await requirePaymentManagementAccess();
      if (!admin) {
        return { success: false, code: "forbidden", message: "You cannot manage payments." };
      }
      const payment = await PaymentRepository.findById(paymentId);
      if (!payment) {
        return { success: false, code: "not_found", message: "Payment not found." };
      }
      if (payment.status !== "authorized") {
        return { success: false, code: "conflict", message: `Only an authorized payment can be voided (this one is ${payment.status}).` };
      }
      if (!payment.providerTransactionId) {
        return { success: false, code: "conflict", message: "This payment has no provider transaction to void." };
      }
      const adapter = getPaymentProviderById(payment.provider);
      if (!adapter?.capabilities.void) {
        return { success: false, code: "unavailable", message: `Provider "${payment.provider}" doesn't support void.` };
      }

      let operation;
      try {
        operation = await adapter.void({ providerTransactionId: payment.providerTransactionId });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        paymentsLogger.error("void.provider_error", { paymentId, error: message });
        return { success: false, code: "provider_error", message: "The provider rejected the void." };
      }

      const updated = await PaymentRepository.update(payment.id, {
        status: "canceled",
        providerResponse: operation.raw,
      });
      if (updated.status !== "ok") {
        return { success: false, code: "conflict", message: "Payment changed while voiding. Reload and try again." };
      }
      paymentsLogger.info("void.succeeded", { paymentId, actorId: admin.id });
      return { success: true, data: updated.data };
    });
  },
};
