import { getDb, type DbClient } from "@/db";
import { couponAuditLogs } from "@/db/schema/commerce";
import type { CouponAuditLogEntry, NewCouponAuditLogInput } from "@/commerce/types/coupon-audit-log";

type CouponAuditLogRow = typeof couponAuditLogs.$inferSelect;

function mapRowToEntry(row: CouponAuditLogRow): CouponAuditLogEntry {
  return {
    id: row.id,
    action: row.action as CouponAuditLogEntry["action"],
    couponId: row.couponId,
    actorId: row.actorId,
    createdAt: row.createdAt.toISOString(),
    metadata: row.metadata as Record<string, unknown>,
  };
}

/** Data access for `coupon_audit_logs` — write-only, mirrors
 *  `OrderAuditLogRepository` exactly. */
export const CouponAuditLogRepository = {
  async create(input: NewCouponAuditLogInput, db: DbClient = getDb()): Promise<CouponAuditLogEntry> {
    const [row] = await db
      .insert(couponAuditLogs)
      .values({
        action: input.action,
        couponId: input.couponId,
        actorId: input.actorId,
        metadata: input.metadata ?? {},
      })
      .returning();
    return mapRowToEntry(row);
  },
};
