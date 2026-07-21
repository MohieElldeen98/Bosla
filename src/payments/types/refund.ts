/** Mirrors `db/schema/payments.ts`'s `refund_status` enum. */
export const REFUND_STATUSES = ["pending", "succeeded", "failed"] as const;
export type RefundStatus = (typeof REFUND_STATUSES)[number];

/** Mirrors `db/schema/payments.ts`'s `refunds` table — one attempt to
 *  send money back, full or partial. A payment's refund history is
 *  simply its rows here, newest first. */
export interface Refund {
  id: string;
  paymentId: string;
  provider: string;
  providerRefundId: string | null;
  status: RefundStatus;
  amount: string;
  currency: string;
  reason: string | null;
  providerResponse: Record<string, unknown>;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewRefundInput {
  paymentId: string;
  provider: string;
  amount: string;
  currency: string;
  reason?: string | null;
  createdByUserId?: string | null;
}
