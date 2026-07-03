import { getDb, type DbClient } from "@/db";
import { orderAuditLogs } from "@/db/schema/commerce";
import type { NewOrderAuditLogInput, OrderAuditLogEntry } from "@/commerce/types/order-audit-log";

type OrderAuditLogRow = typeof orderAuditLogs.$inferSelect;

function mapRowToEntry(row: OrderAuditLogRow): OrderAuditLogEntry {
  return {
    id: row.id,
    action: row.action as OrderAuditLogEntry["action"],
    orderId: row.orderId,
    actorId: row.actorId,
    createdAt: row.createdAt.toISOString(),
    metadata: row.metadata as Record<string, unknown>,
  };
}

/** Data access for `order_audit_logs` — write-only, mirrors
 *  `LearningAuditLogRepository`/`CourseAuditLogRepository` exactly.
 *  Accepts an optional `DbClient` so a future transactional caller can
 *  make the insert atomic with the write it's auditing. */
export const OrderAuditLogRepository = {
  async create(input: NewOrderAuditLogInput, db: DbClient = getDb()): Promise<OrderAuditLogEntry> {
    const [row] = await db
      .insert(orderAuditLogs)
      .values({
        action: input.action,
        orderId: input.orderId,
        actorId: input.actorId,
        metadata: input.metadata ?? {},
      })
      .returning();
    return mapRowToEntry(row);
  },
};
