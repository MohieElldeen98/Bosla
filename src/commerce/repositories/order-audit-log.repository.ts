import { asc, eq } from "drizzle-orm";
import { getDb, type DbClient } from "@/db";
import { orderAuditLogs } from "@/db/schema/commerce";
import type { NewOrderAuditLogInput, OrderAuditLogEntry, TimelineActorType } from "@/commerce/types/order-audit-log";

type OrderAuditLogRow = typeof orderAuditLogs.$inferSelect;

function mapRowToEntry(row: OrderAuditLogRow): OrderAuditLogEntry {
  return {
    id: row.id,
    action: row.action,
    orderId: row.orderId,
    paymentId: row.paymentId,
    actorType: row.actorType as TimelineActorType,
    actorId: row.actorId,
    message: row.message,
    createdAt: row.createdAt.toISOString(),
    metadata: row.metadata as Record<string, unknown>,
  };
}

/** Data access for `order_audit_logs` — write-only (append), never
 *  updated or deleted; mirrors `LearningAuditLogRepository`/
 *  `CourseAuditLogRepository`'s shape. Also the Order/Payment Timeline's
 *  read path (`findByOrderId`), added alongside the Payment Lifecycle
 *  Hardening work — same table, doubling as both the narrower
 *  order-status audit trail and the general timeline
 *  (docs/payment-platform.md §Timeline). Accepts an optional `DbClient`
 *  so a future transactional caller can make the insert atomic with the
 *  write it's auditing. */
export const OrderAuditLogRepository = {
  async create(input: NewOrderAuditLogInput, db: DbClient = getDb()): Promise<OrderAuditLogEntry> {
    const [row] = await db
      .insert(orderAuditLogs)
      .values({
        action: input.action,
        orderId: input.orderId,
        paymentId: input.paymentId ?? null,
        actorType: input.actorType ?? "system",
        actorId: input.actorId,
        message: input.message ?? null,
        metadata: input.metadata ?? {},
      })
      .returning();
    return mapRowToEntry(row);
  },

  /** Chronological (oldest first) — exactly the order a Timeline reads
   *  naturally, top to bottom. */
  async findByOrderId(orderId: string): Promise<OrderAuditLogEntry[]> {
    const rows = await getDb()
      .select()
      .from(orderAuditLogs)
      .where(eq(orderAuditLogs.orderId, orderId))
      .orderBy(asc(orderAuditLogs.createdAt));
    return rows.map(mapRowToEntry);
  },
};
