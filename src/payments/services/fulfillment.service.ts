import "server-only";

import { OrderService } from "@/commerce/services/order.service";
import { OrderItemRepository } from "@/commerce/repositories/order-item.repository";
import { CourseRepository } from "@/courses/repositories/course.repository";
import { ProfileService } from "@/auth/services/profile.service";
import { resolveLocalizedText } from "@/cms/utils/resolve-localized";
import { InvoiceService } from "@/payments/services/invoice.service";
import { sendPaymentEmail } from "@/payments/emails/email-provider";
import { paymentFailedEmail, paymentSucceededEmail, refundIssuedEmail } from "@/payments/emails/templates";
import { paymentsLogger } from "@/payments/utils/payments-logger";
import { recordOrderAuditLog } from "@/commerce/utils/audit-log";
import type { Order } from "@/commerce/types/order";

interface OrderEmailRecipient {
  studentName: string;
  studentEmail: string;
  courseTitle: string;
}

async function resolveRecipient(order: Order): Promise<OrderEmailRecipient | null> {
  const [items, profiles] = await Promise.all([
    OrderItemRepository.findByOrderId(order.id),
    ProfileService.getByUserIds([order.studentId]),
  ]);
  const profile = profiles[0];
  if (!profile?.email) return null;
  const courses = await CourseRepository.findByIds(items.map((item) => item.courseId));
  const courseTitle = courses[0] ? resolveLocalizedText(courses[0].title, "en") : "your course";
  return {
    studentName: profile.displayName ?? profile.fullName ?? profile.email,
    studentEmail: profile.email,
    courseTitle,
  };
}

/**
 * The single "verified money → delivered product" pipeline
 * (docs/payment-platform.md §Fulfillment): order completion (enrollment,
 * coupon redemption, in-app notifications — all inside
 * `OrderService.completeFromVerifiedPayment`), then the invoice of
 * record, then the receipt email. Called from exactly two places — the
 * webhook pipeline's `payment.succeeded` and an admin capture that
 * settles synchronously — and idempotent end-to-end, so a replayed
 * delivery re-sends nothing and re-grants nothing.
 *
 * Invoice/email failures are logged but never bubble: the student's
 * access is already granted at that point and must stay granted.
 */
export const FulfillmentService = {
  async completePaidOrder(order: Order, paymentId?: string | null): Promise<{ completed: boolean }> {
    const completion = await OrderService.completeFromVerifiedPayment(order.id, paymentId ?? null);
    if (!completion.success) {
      paymentsLogger.error("fulfillment.completion_failed", {
        orderId: order.id,
        code: completion.code,
        message: completion.message,
      });
      return { completed: false };
    }
    const completedOrder = completion.data;

    try {
      const invoice = await InvoiceService.issueForOrder(completedOrder);
      if (invoice) {
        await recordOrderAuditLog({
          action: "invoice.generated",
          orderId: completedOrder.id,
          paymentId: paymentId ?? null,
          actorType: "system",
          actorId: null,
          message: `Invoice ${invoice.invoiceNumber} issued.`,
          metadata: { invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber },
        });
      }
      const recipient = await resolveRecipient(completedOrder);
      if (recipient) {
        const email = paymentSucceededEmail({
          studentName: recipient.studentName,
          courseTitle: recipient.courseTitle,
          orderId: completedOrder.id,
          currency: completedOrder.currency,
          subtotal: completedOrder.subtotal,
          discountTotal: completedOrder.discountTotal,
          taxTotal: completedOrder.taxTotal,
          total: completedOrder.total,
          invoiceNumber: invoice?.invoiceNumber ?? null,
        });
        const attachments = invoice
          ? [
              {
                filename: `${invoice.invoiceNumber}.pdf`,
                content: Buffer.from(
                  await InvoiceService.renderPdf(invoice, {
                    studentName: recipient.studentName,
                    studentEmail: recipient.studentEmail,
                    courseTitle: recipient.courseTitle,
                  }),
                ).toString("base64"),
              },
            ]
          : undefined;
        await sendPaymentEmail({ to: recipient.studentEmail, ...email, attachments });
      }
    } catch (error) {
      paymentsLogger.error("fulfillment.receipt_failed", {
        orderId: order.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return { completed: true };
  },

  async notifyPaymentFailed(order: Order): Promise<void> {
    try {
      const recipient = await resolveRecipient(order);
      if (!recipient) return;
      const email = paymentFailedEmail({
        studentName: recipient.studentName,
        courseTitle: recipient.courseTitle,
        orderId: order.id,
      });
      await sendPaymentEmail({ to: recipient.studentEmail, ...email });
    } catch (error) {
      paymentsLogger.warn("fulfillment.failed_email_skipped", {
        orderId: order.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },

  async notifyRefundIssued(order: Order, amount: string): Promise<void> {
    try {
      const recipient = await resolveRecipient(order);
      if (!recipient) return;
      const email = refundIssuedEmail({
        studentName: recipient.studentName,
        courseTitle: recipient.courseTitle,
        orderId: order.id,
        amount,
        currency: order.currency,
      });
      await sendPaymentEmail({ to: recipient.studentEmail, ...email });
    } catch (error) {
      paymentsLogger.warn("fulfillment.refund_email_skipped", {
        orderId: order.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },
};
