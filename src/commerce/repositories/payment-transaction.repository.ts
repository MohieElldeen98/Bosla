import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { paymentTransactions } from "@/db/schema/commerce";
import type { NewPaymentTransactionInput, PaymentTransaction } from "@/commerce/types/payment-transaction";

type PaymentTransactionRow = typeof paymentTransactions.$inferSelect;

function mapRowToPaymentTransaction(row: PaymentTransactionRow): PaymentTransaction {
  return {
    id: row.id,
    paymentIntentId: row.paymentIntentId,
    type: row.type,
    amount: row.amount,
    rawPayload: row.rawPayload as Record<string, unknown>,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Data access for `payment_transactions` — append-only, mirrors every
 *  other audit-shaped table in this codebase: no `update`/`delete`.
 *  `PaymentService` is the only caller. */
export const PaymentTransactionRepository = {
  async create(input: NewPaymentTransactionInput): Promise<PaymentTransaction> {
    const [row] = await getDb()
      .insert(paymentTransactions)
      .values({
        paymentIntentId: input.paymentIntentId,
        type: input.type,
        amount: input.amount,
        rawPayload: input.rawPayload ?? {},
      })
      .returning();
    return mapRowToPaymentTransaction(row);
  },

  /** Oldest first — the natural reading order for an event timeline
   *  ("created" → "succeeded"/"failed"). */
  async findByPaymentIntentId(paymentIntentId: string): Promise<PaymentTransaction[]> {
    const rows = await getDb()
      .select()
      .from(paymentTransactions)
      .where(eq(paymentTransactions.paymentIntentId, paymentIntentId))
      .orderBy(asc(paymentTransactions.createdAt));
    return rows.map(mapRowToPaymentTransaction);
  },
};
