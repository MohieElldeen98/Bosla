import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { paymentIntents } from "@/db/schema/commerce";
import type { NewPaymentIntentInput, PaymentIntent, PaymentIntentStatus } from "@/commerce/types/payment-intent";
import type { OptimisticUpdateResult } from "@/commerce/types/repository-result";

type PaymentIntentRow = typeof paymentIntents.$inferSelect;

function mapRowToPaymentIntent(row: PaymentIntentRow): PaymentIntent {
  return {
    id: row.id,
    orderId: row.orderId,
    provider: row.provider,
    status: row.status,
    amount: row.amount,
    currency: row.currency,
    providerReference: row.providerReference,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Data access for `payment_intents`. `PaymentService`/`OrderService`
 *  are the only callers. */
export const PaymentIntentRepository = {
  async create(input: NewPaymentIntentInput): Promise<PaymentIntent> {
    const [row] = await getDb()
      .insert(paymentIntents)
      .values({
        orderId: input.orderId,
        provider: input.provider ?? "manual",
        status: input.status ?? "pending",
        amount: input.amount,
        currency: input.currency ?? "USD",
        providerReference: input.providerReference ?? null,
        updatedAt: new Date(),
      })
      .returning();
    return mapRowToPaymentIntent(row);
  },

  async findById(id: string): Promise<PaymentIntent | null> {
    const [row] = await getDb().select().from(paymentIntents).where(eq(paymentIntents.id, id)).limit(1);
    return row ? mapRowToPaymentIntent(row) : null;
  },

  /** Newest first — an order can have more than one attempt (a failed
   *  try, then a retry); the latest is what the checkout/Orders-listing
   *  UI cares about. */
  async findByOrderId(orderId: string): Promise<PaymentIntent[]> {
    const rows = await getDb()
      .select()
      .from(paymentIntents)
      .where(eq(paymentIntents.orderId, orderId))
      .orderBy(desc(paymentIntents.createdAt));
    return rows.map(mapRowToPaymentIntent);
  },

  /** Batch lookup across many orders — for the admin/Dashboard Orders
   *  listing's "latest payment status" column without an N+1 query.
   *  Returns every intent for every given order (newest first within
   *  each); callers reduce to "latest per order" themselves, the same
   *  "compose in the service" pattern every other resolved view uses. */
  async findByOrderIds(orderIds: string[]): Promise<PaymentIntent[]> {
    if (orderIds.length === 0) return [];
    const rows = await getDb()
      .select()
      .from(paymentIntents)
      .where(inArray(paymentIntents.orderId, orderIds))
      .orderBy(desc(paymentIntents.createdAt));
    return rows.map(mapRowToPaymentIntent);
  },

  async updateStatus(
    id: string,
    status: PaymentIntentStatus,
    expectedUpdatedAt?: string,
  ): Promise<OptimisticUpdateResult<PaymentIntent>> {
    const conditions = [eq(paymentIntents.id, id)];
    if (expectedUpdatedAt) conditions.push(eq(paymentIntents.updatedAt, new Date(expectedUpdatedAt)));

    const [row] = await getDb()
      .update(paymentIntents)
      .set({ status, updatedAt: new Date() })
      .where(and(...conditions))
      .returning();

    if (row) return { status: "ok", data: mapRowToPaymentIntent(row) };
    if (!expectedUpdatedAt) return { status: "not_found" };

    const stillExists = await PaymentIntentRepository.findById(id);
    return stillExists ? { status: "conflict" } : { status: "not_found" };
  },
};
