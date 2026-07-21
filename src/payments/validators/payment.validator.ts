import { z } from "zod";
import { PAYMENT_STATUSES } from "@/payments/types/payment";
import { PAYMENT_SORT_DIRECTIONS, PAYMENT_SORT_FIELDS } from "@/payments/types/payment-search";

/** Parses the admin Payments listing's URL search params — every field
 *  optional and defensively coerced, mirroring `searchOrdersSchema`. */
export const searchPaymentsSchema = z.object({
  query: z.string().trim().min(1).optional(),
  status: z.enum(PAYMENT_STATUSES).optional(),
  provider: z.string().trim().min(1).max(64).optional(),
  orderId: z.string().uuid().optional(),
  sortBy: z.enum(PAYMENT_SORT_FIELDS).optional(),
  sortDirection: z.enum(PAYMENT_SORT_DIRECTIONS).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});
export type SearchPaymentsInput = z.infer<typeof searchPaymentsSchema>;

/** The admin Refund action — omit `amount` for a full refund of what
 *  remains refundable. */
export const refundPaymentSchema = z.object({
  paymentId: z.string().uuid(),
  amount: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, "Enter a valid amount, e.g. 199.99")
    .optional(),
  reason: z.string().trim().max(500).optional(),
});
export type RefundPaymentInput = z.infer<typeof refundPaymentSchema>;

/** Capture/void act on one authorized payment. */
export const paymentIdSchema = z.object({
  paymentId: z.string().uuid(),
});
export type PaymentIdInput = z.infer<typeof paymentIdSchema>;
