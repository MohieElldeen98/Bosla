import { PaymentIntentRepository } from "@/commerce/repositories/payment-intent.repository";
import { PaymentTransactionRepository } from "@/commerce/repositories/payment-transaction.repository";
import { OrderRepository } from "@/commerce/repositories/order.repository";
import { canAccessStudentData } from "@/commerce/utils/require-student-access";
import { safeMutation } from "@/commerce/utils/safe-operation";
import { notify } from "@/notifications/utils/notify";
import { buildNotificationContent } from "@/notifications/utils/notification-content";
import type { AuthUser } from "@/auth/types/session";
import type { PaymentIntent } from "@/commerce/types/payment-intent";
import type { CommerceActionResult } from "@/commerce/types/result";

/** What `simulateSuccess`/`simulateFailure` hand back — the updated
 *  intent plus the `orderId` it belongs to, so the Server Action calling
 *  this can separately call `OrderService.markPaid` on success. Kept as
 *  two sequential calls at the Action layer rather than
 *  `PaymentService` importing `OrderService` itself — that would make
 *  the two services import each other (`OrderService.createFromCheckout`
 *  already calls `PaymentService.createIntent`), which this avoids by
 *  design. */
export interface SimulatedPaymentResult {
  paymentIntent: PaymentIntent;
  orderId: string;
}

async function loadIntentForActingUser(
  actingUser: AuthUser,
  paymentIntentId: string,
): Promise<CommerceActionResult<{ intent: PaymentIntent; orderId: string; studentId: string }>> {
  const intent = await PaymentIntentRepository.findById(paymentIntentId);
  if (!intent) {
    return { success: false, code: "not_found", message: "Payment not found." };
  }
  const order = await OrderRepository.findById(intent.orderId);
  if (!order) {
    return { success: false, code: "not_found", message: "Order not found." };
  }
  if (!canAccessStudentData(actingUser, order.studentId)) {
    return { success: false, code: "forbidden", message: "You cannot act on this payment." };
  }
  return { success: true, data: { intent, orderId: order.id, studentId: order.studentId } };
}

/**
 * Orchestration for `payment_intents`/`payment_transactions` — the
 * Payment foundation (Step 5.1). No real gateway exists yet
 * (`ManualPaymentGateway` is the only implementation), so
 * `simulateSuccess`/`simulateFailure` stand in for what a provider's
 * webhook would otherwise trigger — a student clicking "Simulate
 * Successful Payment" on the checkout page, or (via the same methods)
 * an admin exercising the same override. `createIntent` is
 * `OrderService`'s own dependency for starting a paid checkout; nothing
 * else calls it.
 */
export const PaymentService = {
  async createIntent(orderId: string, amount: string, currency: string): Promise<PaymentIntent> {
    const intent = await PaymentIntentRepository.create({ orderId, amount, currency, provider: "manual" });
    await PaymentTransactionRepository.create({ paymentIntentId: intent.id, type: "created", amount });
    return intent;
  },

  async getLatestForOrder(orderId: string): Promise<PaymentIntent | null> {
    const intents = await PaymentIntentRepository.findByOrderId(orderId);
    return intents[0] ?? null;
  },

  async simulateSuccess(
    actingUser: AuthUser,
    paymentIntentId: string,
  ): Promise<CommerceActionResult<SimulatedPaymentResult>> {
    return safeMutation(async () => {
      const loaded = await loadIntentForActingUser(actingUser, paymentIntentId);
      if (!loaded.success) return loaded;
      const { intent, orderId } = loaded.data;

      if (intent.status !== "pending") {
        return { success: false, code: "conflict", message: "This payment has already been resolved." };
      }

      const result = await PaymentIntentRepository.updateStatus(intent.id, "succeeded", intent.updatedAt);
      if (result.status !== "ok") {
        return { success: false, code: "conflict", message: "This payment was already updated. Reload and try again." };
      }
      await PaymentTransactionRepository.create({
        paymentIntentId: intent.id,
        type: "succeeded",
        amount: intent.amount,
        rawPayload: { simulatedBy: actingUser.id },
      });

      return { success: true, data: { paymentIntent: result.data, orderId } };
    });
  },

  async simulateFailure(
    actingUser: AuthUser,
    paymentIntentId: string,
  ): Promise<CommerceActionResult<SimulatedPaymentResult>> {
    return safeMutation(async () => {
      const loaded = await loadIntentForActingUser(actingUser, paymentIntentId);
      if (!loaded.success) return loaded;
      const { intent, orderId, studentId } = loaded.data;

      if (intent.status !== "pending") {
        return { success: false, code: "conflict", message: "This payment has already been resolved." };
      }

      const result = await PaymentIntentRepository.updateStatus(intent.id, "failed", intent.updatedAt);
      if (result.status !== "ok") {
        return { success: false, code: "conflict", message: "This payment was already updated. Reload and try again." };
      }
      await PaymentTransactionRepository.create({
        paymentIntentId: intent.id,
        type: "failed",
        amount: intent.amount,
        rawPayload: { simulatedBy: actingUser.id },
      });

      const content = await buildNotificationContent("orderFailed", { orderRef: orderId.slice(0, 8) });
      await notify({
        recipientUserId: studentId,
        type: "order_failed",
        ...content,
        data: { orderId, paymentIntentId: intent.id },
      });

      return { success: true, data: { paymentIntent: result.data, orderId } };
    });
  },
};
