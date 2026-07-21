import { and, desc, eq, gte, isNull, lt, lte, sql, type SQL } from "drizzle-orm";
import { getDb, type DbClient } from "@/db";
import { revenueAllocations } from "@/db/schema/revenue";
import type {
  NewRevenueAllocationInput,
  RevenueAllocation,
  RevenueAllocationKind,
  RevenueAllocationStatus,
} from "@/commerce/types/revenue";

type AllocationRow = typeof revenueAllocations.$inferSelect;

function mapRow(row: AllocationRow): RevenueAllocation {
  return {
    id: row.id,
    orderId: row.orderId,
    orderItemId: row.orderItemId,
    paymentId: row.paymentId,
    kind: row.kind,
    recipientType: row.recipientType,
    instructorId: row.instructorId,
    commissionRuleId: row.commissionRuleId,
    currency: row.currency,
    basisAmount: row.basisAmount,
    amount: row.amount,
    status: row.status,
    payoutItemId: row.payoutItemId,
    reversalKey: row.reversalKey,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    createdAt: row.createdAt.toISOString(),
  };
}

export interface AllocationSearchFilters {
  orderId?: string;
  instructorId?: string;
  recipientType?: string;
  kind?: RevenueAllocationKind;
  status?: RevenueAllocationStatus;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export interface AllocationSearchResult {
  items: RevenueAllocation[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Data access for the `revenue_allocations` ledger. The Revenue
 *  Engine, PayoutService, and reporting are the only callers. Amounts
 *  are immutable — the ONLY updatable columns are the payout-lifecycle
 *  `status` and the once-only `payoutItemId` stamp. */
export const RevenueAllocationRepository = {
  /** Bulk insert honoring the sale/reversal unique guards —
   *  `onConflictDoNothing` means a replayed completion or refund simply
   *  inserts nothing; the returned rows are exactly what was NEW, which
   *  is what balance deltas must be computed from. */
  async createMany(inputs: NewRevenueAllocationInput[], db: DbClient = getDb()): Promise<RevenueAllocation[]> {
    if (inputs.length === 0) return [];
    const rows = await db
      .insert(revenueAllocations)
      .values(
        inputs.map((input) => ({
          orderId: input.orderId ?? null,
          orderItemId: input.orderItemId ?? null,
          paymentId: input.paymentId ?? null,
          kind: input.kind,
          recipientType: input.recipientType,
          instructorId: input.instructorId ?? null,
          commissionRuleId: input.commissionRuleId ?? null,
          currency: input.currency,
          basisAmount: input.basisAmount,
          amount: input.amount,
          status: input.status ?? "pending",
          reversalKey: input.reversalKey ?? null,
          metadata: input.metadata ?? {},
        })),
      )
      .onConflictDoNothing()
      .returning();
    return rows.map(mapRow);
  },

  async findByOrderId(orderId: string): Promise<RevenueAllocation[]> {
    const rows = await getDb()
      .select()
      .from(revenueAllocations)
      .where(eq(revenueAllocations.orderId, orderId))
      .orderBy(desc(revenueAllocations.createdAt));
    return rows.map(mapRow);
  },

  async findSalesByOrderId(orderId: string, db: DbClient = getDb()): Promise<RevenueAllocation[]> {
    const rows = await db
      .select()
      .from(revenueAllocations)
      .where(and(eq(revenueAllocations.orderId, orderId), eq(revenueAllocations.kind, "sale")));
    return rows.map(mapRow);
  },

  async search(filters: AllocationSearchFilters): Promise<AllocationSearchResult> {
    const conditions: SQL[] = [];
    if (filters.orderId) conditions.push(eq(revenueAllocations.orderId, filters.orderId));
    if (filters.instructorId) conditions.push(eq(revenueAllocations.instructorId, filters.instructorId));
    if (filters.recipientType) conditions.push(eq(revenueAllocations.recipientType, filters.recipientType));
    if (filters.kind) conditions.push(eq(revenueAllocations.kind, filters.kind));
    if (filters.status) conditions.push(eq(revenueAllocations.status, filters.status));
    if (filters.from) conditions.push(gte(revenueAllocations.createdAt, new Date(filters.from)));
    if (filters.to) conditions.push(lte(revenueAllocations.createdAt, new Date(filters.to)));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = filters.pageSize ?? 20;

    const [rows, countRows] = await Promise.all([
      getDb()
        .select()
        .from(revenueAllocations)
        .where(whereClause)
        .orderBy(desc(revenueAllocations.createdAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      getDb()
        .select({ count: sql<number>`count(*)::int` })
        .from(revenueAllocations)
        .where(whereClause),
    ]);
    const total = countRows[0]?.count ?? 0;
    return { items: rows.map(mapRow), total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  },

  /** The lazy pending→available maturation sweep — returns what it
   *  flipped so the caller can mirror the move into the balance cache.
   *  Instructor-scoped so a dashboard read only pays for its own rows. */
  async releaseMatured(cutoff: Date, instructorId?: string, db: DbClient = getDb()): Promise<RevenueAllocation[]> {
    const conditions = [
      eq(revenueAllocations.status, "pending"),
      lt(revenueAllocations.createdAt, cutoff),
    ];
    if (instructorId) conditions.push(eq(revenueAllocations.instructorId, instructorId));
    const rows = await db
      .update(revenueAllocations)
      .set({ status: "available" })
      .where(and(...conditions))
      .returning();
    return rows.map(mapRow);
  },

  /** Sweep one instructor's payable rows into a payout item — stamps
   *  `payoutItemId` and flips to `paid` in one statement, so two
   *  concurrent batch creations can never both take the same row
   *  (`payoutItemId IS NULL` is the guard). Returns the swept rows;
   *  the item's amount is their sum. Includes negative reversal/
   *  adjustment rows that are `available` — clawbacks net against the
   *  payout, exactly as they net in the balance. */
  async sweepForPayout(
    instructorId: string,
    currency: string,
    payoutItemId: string,
    db: DbClient = getDb(),
  ): Promise<RevenueAllocation[]> {
    const rows = await db
      .update(revenueAllocations)
      .set({ status: "paid", payoutItemId })
      .where(
        and(
          eq(revenueAllocations.instructorId, instructorId),
          eq(revenueAllocations.currency, currency),
          eq(revenueAllocations.status, "available"),
          isNull(revenueAllocations.payoutItemId),
        ),
      )
      .returning();
    return rows.map(mapRow);
  },

  /** Reverse a failed/cancelled payout's sweep — rows go back to
   *  `available` and drop the stamp, ready for the next batch. */
  async unsweepPayout(payoutItemId: string, db: DbClient = getDb()): Promise<RevenueAllocation[]> {
    const rows = await db
      .update(revenueAllocations)
      .set({ status: "available", payoutItemId: null })
      .where(eq(revenueAllocations.payoutItemId, payoutItemId))
      .returning();
    return rows.map(mapRow);
  },
};
