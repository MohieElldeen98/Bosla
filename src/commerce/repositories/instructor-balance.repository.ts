import { eq, sql } from "drizzle-orm";
import { getDb, type DbClient } from "@/db";
import { instructorBalances } from "@/db/schema/revenue";
import type { InstructorBalance } from "@/commerce/types/revenue";

type BalanceRow = typeof instructorBalances.$inferSelect;

function mapRow(row: BalanceRow): InstructorBalance {
  return {
    id: row.id,
    instructorId: row.instructorId,
    currency: row.currency,
    pendingBalance: row.pendingBalance,
    availableBalance: row.availableBalance,
    paidBalance: row.paidBalance,
    lifetimeEarnings: row.lifetimeEarnings,
    refundAdjustments: row.refundAdjustments,
    manualAdjustments: row.manualAdjustments,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export interface BalanceDeltas {
  pending?: number;
  available?: number;
  paid?: number;
  lifetime?: number;
  refund?: number;
  manual?: number;
}

/** Data access for the `instructor_balances` cache. All movement goes
 *  through `applyDeltas` — a single upsert with SQL-side increments
 *  (never read-modify-write), so two concurrent sales/refunds can race
 *  freely and both land. The `revenue_allocations` ledger stays the
 *  source of truth; this table is what dashboards read. */
export const InstructorBalanceRepository = {
  async applyDeltas(
    instructorId: string,
    currency: string,
    deltas: BalanceDeltas,
    db: DbClient = getDb(),
  ): Promise<void> {
    const pending = (deltas.pending ?? 0).toFixed(2);
    const available = (deltas.available ?? 0).toFixed(2);
    const paid = (deltas.paid ?? 0).toFixed(2);
    const lifetime = (deltas.lifetime ?? 0).toFixed(2);
    const refund = (deltas.refund ?? 0).toFixed(2);
    const manual = (deltas.manual ?? 0).toFixed(2);

    await db
      .insert(instructorBalances)
      .values({
        instructorId,
        currency,
        pendingBalance: pending,
        availableBalance: available,
        paidBalance: paid,
        lifetimeEarnings: lifetime,
        refundAdjustments: refund,
        manualAdjustments: manual,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [instructorBalances.instructorId, instructorBalances.currency],
        set: {
          pendingBalance: sql`${instructorBalances.pendingBalance} + ${pending}`,
          availableBalance: sql`${instructorBalances.availableBalance} + ${available}`,
          paidBalance: sql`${instructorBalances.paidBalance} + ${paid}`,
          lifetimeEarnings: sql`${instructorBalances.lifetimeEarnings} + ${lifetime}`,
          refundAdjustments: sql`${instructorBalances.refundAdjustments} + ${refund}`,
          manualAdjustments: sql`${instructorBalances.manualAdjustments} + ${manual}`,
          updatedAt: new Date(),
        },
      });
  },

  async findByInstructorId(instructorId: string): Promise<InstructorBalance[]> {
    const rows = await getDb()
      .select()
      .from(instructorBalances)
      .where(eq(instructorBalances.instructorId, instructorId));
    return rows.map(mapRow);
  },

  async findByInstructorAndCurrency(
    instructorId: string,
    currency: string,
    db: DbClient = getDb(),
  ): Promise<InstructorBalance | null> {
    const [row] = await db
      .select()
      .from(instructorBalances)
      .where(sql`${instructorBalances.instructorId} = ${instructorId} and ${instructorBalances.currency} = ${currency}`)
      .limit(1);
    return row ? mapRow(row) : null;
  },

  async listAll(): Promise<InstructorBalance[]> {
    const rows = await getDb()
      .select()
      .from(instructorBalances)
      .orderBy(sql`${instructorBalances.lifetimeEarnings} desc`);
    return rows.map(mapRow);
  },
};
