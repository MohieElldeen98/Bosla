import { and, desc, eq, type SQL } from "drizzle-orm";
import { getDb, type DbClient } from "@/db";
import { payoutAccounts, payoutBatches, payoutItems } from "@/db/schema/revenue";
import type { PayoutAccount, PayoutBatch, PayoutItem, PayoutStatus } from "@/commerce/types/revenue";

type AccountRow = typeof payoutAccounts.$inferSelect;
type BatchRow = typeof payoutBatches.$inferSelect;
type ItemRow = typeof payoutItems.$inferSelect;

function mapAccount(row: AccountRow): PayoutAccount {
  return {
    id: row.id,
    instructorId: row.instructorId,
    method: row.method,
    currency: row.currency,
    accountName: row.accountName,
    accountDetails: (row.accountDetails ?? {}) as Record<string, unknown>,
    isDefault: row.isDefault,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapBatch(row: BatchRow): PayoutBatch {
  return {
    id: row.id,
    status: row.status,
    currency: row.currency,
    totalAmount: row.totalAmount,
    scheduledFor: row.scheduledFor ? row.scheduledFor.toISOString() : null,
    processedAt: row.processedAt ? row.processedAt.toISOString() : null,
    notes: row.notes,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapItem(row: ItemRow): PayoutItem {
  return {
    id: row.id,
    batchId: row.batchId,
    instructorId: row.instructorId,
    payoutAccountId: row.payoutAccountId,
    status: row.status,
    amount: row.amount,
    currency: row.currency,
    failureReason: row.failureReason,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Data access for `payout_accounts`/`payout_batches`/`payout_items`.
 *  `PayoutService` is the only caller. */
export const PayoutRepository = {
  // ---- accounts ----
  async createAccount(input: {
    instructorId: string;
    method: string;
    currency: string;
    accountName: string;
    accountDetails: Record<string, unknown>;
    isDefault: boolean;
  }): Promise<PayoutAccount> {
    const [row] = await getDb()
      .insert(payoutAccounts)
      .values({ ...input, updatedAt: new Date() })
      .returning();
    return mapAccount(row);
  },

  async findAccountsByInstructor(instructorId: string): Promise<PayoutAccount[]> {
    const rows = await getDb()
      .select()
      .from(payoutAccounts)
      .where(eq(payoutAccounts.instructorId, instructorId))
      .orderBy(desc(payoutAccounts.isDefault), desc(payoutAccounts.createdAt));
    return rows.map(mapAccount);
  },

  async setAccountActive(id: string, isActive: boolean): Promise<PayoutAccount | null> {
    const [row] = await getDb()
      .update(payoutAccounts)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(payoutAccounts.id, id))
      .returning();
    return row ? mapAccount(row) : null;
  },

  async clearDefaultForInstructor(instructorId: string): Promise<void> {
    await getDb()
      .update(payoutAccounts)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(eq(payoutAccounts.instructorId, instructorId));
  },

  // ---- batches ----
  async createBatch(
    input: { currency: string; scheduledFor?: Date | null; notes?: string | null; createdByUserId: string },
    db: DbClient = getDb(),
  ): Promise<PayoutBatch> {
    const [row] = await db
      .insert(payoutBatches)
      .values({
        currency: input.currency,
        scheduledFor: input.scheduledFor ?? null,
        notes: input.notes ?? null,
        createdByUserId: input.createdByUserId,
        updatedAt: new Date(),
      })
      .returning();
    return mapBatch(row);
  },

  async findBatchById(id: string): Promise<PayoutBatch | null> {
    const [row] = await getDb().select().from(payoutBatches).where(eq(payoutBatches.id, id)).limit(1);
    return row ? mapBatch(row) : null;
  },

  async listBatches(status?: PayoutStatus): Promise<PayoutBatch[]> {
    const conditions: SQL[] = [];
    if (status) conditions.push(eq(payoutBatches.status, status));
    const rows = await getDb()
      .select()
      .from(payoutBatches)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(payoutBatches.createdAt));
    return rows.map(mapBatch);
  },

  async updateBatch(
    id: string,
    fields: { status?: PayoutStatus; totalAmount?: string; processedAt?: Date | null },
    db: DbClient = getDb(),
  ): Promise<PayoutBatch | null> {
    const [row] = await db
      .update(payoutBatches)
      .set({
        ...(fields.status !== undefined ? { status: fields.status } : {}),
        ...(fields.totalAmount !== undefined ? { totalAmount: fields.totalAmount } : {}),
        ...(fields.processedAt !== undefined ? { processedAt: fields.processedAt } : {}),
        updatedAt: new Date(),
      })
      .where(eq(payoutBatches.id, id))
      .returning();
    return row ? mapBatch(row) : null;
  },

  // ---- items ----
  async createItem(
    input: {
      batchId: string;
      instructorId: string;
      payoutAccountId: string | null;
      amount: string;
      currency: string;
    },
    db: DbClient = getDb(),
  ): Promise<PayoutItem> {
    const [row] = await db
      .insert(payoutItems)
      .values({ ...input, updatedAt: new Date() })
      .returning();
    return mapItem(row);
  },

  async deleteItem(id: string, db: DbClient = getDb()): Promise<void> {
    // Only ever called inside batch creation's own transaction to roll
    // back an item whose sweep found nothing — never on settled data.
    await db.delete(payoutItems).where(eq(payoutItems.id, id));
  },

  async findItemById(id: string): Promise<PayoutItem | null> {
    const [row] = await getDb().select().from(payoutItems).where(eq(payoutItems.id, id)).limit(1);
    return row ? mapItem(row) : null;
  },

  async findItemsByBatch(batchId: string): Promise<PayoutItem[]> {
    const rows = await getDb().select().from(payoutItems).where(eq(payoutItems.batchId, batchId));
    return rows.map(mapItem);
  },

  async findItemsByInstructor(instructorId: string, limit = 20): Promise<PayoutItem[]> {
    const rows = await getDb()
      .select()
      .from(payoutItems)
      .where(eq(payoutItems.instructorId, instructorId))
      .orderBy(desc(payoutItems.createdAt))
      .limit(limit);
    return rows.map(mapItem);
  },

  async updateItem(
    id: string,
    fields: { status?: PayoutStatus; failureReason?: string | null; amount?: string },
    db: DbClient = getDb(),
  ): Promise<PayoutItem | null> {
    const [row] = await db
      .update(payoutItems)
      .set({
        ...(fields.status !== undefined ? { status: fields.status } : {}),
        ...(fields.failureReason !== undefined ? { failureReason: fields.failureReason } : {}),
        // `amount` is only ever corrected inside batch creation's own
        // transaction (placeholder → swept net) — never after a batch
        // is visible/settled.
        ...(fields.amount !== undefined ? { amount: fields.amount } : {}),
        updatedAt: new Date(),
      })
      .where(eq(payoutItems.id, id))
      .returning();
    return row ? mapItem(row) : null;
  },
};
