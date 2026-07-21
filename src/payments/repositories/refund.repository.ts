import { desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { refunds } from "@/db/schema/payments";
import type { NewRefundInput, Refund, RefundStatus } from "@/payments/types/refund";

type RefundRow = typeof refunds.$inferSelect;

function mapRowToRefund(row: RefundRow): Refund {
  return {
    id: row.id,
    paymentId: row.paymentId,
    provider: row.provider,
    providerRefundId: row.providerRefundId,
    status: row.status,
    amount: row.amount,
    currency: row.currency,
    reason: row.reason,
    providerResponse: (row.providerResponse ?? {}) as Record<string, unknown>,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Data access for `refunds`. `PaymentService` is the only caller. */
export const RefundRepository = {
  async create(input: NewRefundInput): Promise<Refund> {
    const [row] = await getDb()
      .insert(refunds)
      .values({
        paymentId: input.paymentId,
        provider: input.provider,
        amount: input.amount,
        currency: input.currency,
        reason: input.reason ?? null,
        createdByUserId: input.createdByUserId ?? null,
        updatedAt: new Date(),
      })
      .returning();
    return mapRowToRefund(row);
  },

  async findById(id: string): Promise<Refund | null> {
    const [row] = await getDb().select().from(refunds).where(eq(refunds.id, id)).limit(1);
    return row ? mapRowToRefund(row) : null;
  },

  /** A payment's refund history, newest first. */
  async findByPaymentId(paymentId: string): Promise<Refund[]> {
    const rows = await getDb()
      .select()
      .from(refunds)
      .where(eq(refunds.paymentId, paymentId))
      .orderBy(desc(refunds.createdAt));
    return rows.map(mapRowToRefund);
  },

  async findByPaymentIds(paymentIds: string[]): Promise<Refund[]> {
    if (paymentIds.length === 0) return [];
    const rows = await getDb()
      .select()
      .from(refunds)
      .where(inArray(refunds.paymentId, paymentIds))
      .orderBy(desc(refunds.createdAt));
    return rows.map(mapRowToRefund);
  },

  async updateStatus(
    id: string,
    status: RefundStatus,
    fields?: { providerRefundId?: string | null; providerResponse?: Record<string, unknown> },
  ): Promise<Refund | null> {
    const [row] = await getDb()
      .update(refunds)
      .set({
        status,
        ...(fields?.providerRefundId !== undefined ? { providerRefundId: fields.providerRefundId } : {}),
        ...(fields?.providerResponse !== undefined ? { providerResponse: fields.providerResponse } : {}),
        updatedAt: new Date(),
      })
      .where(eq(refunds.id, id))
      .returning();
    return row ? mapRowToRefund(row) : null;
  },
};
