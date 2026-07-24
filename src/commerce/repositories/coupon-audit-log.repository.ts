import { getDb, type DbClient } from "@/db";
import { couponAuditLogs } from "@/db/schema/commerce";
import { auditSearchOrderBy, buildAuditSearchConditions, type AuditLogSearchFilters } from "@/db/audit-search";
import { and } from "drizzle-orm";
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

/** Data access for `coupon_audit_logs` — mirrors `OrderAuditLogRepository`
 *  exactly. */
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

  async search(filters: AuditLogSearchFilters): Promise<CouponAuditLogEntry[]> {
    const columns = {
      id: couponAuditLogs.id,
      actorId: couponAuditLogs.actorId,
      action: couponAuditLogs.action,
      createdAt: couponAuditLogs.createdAt,
    };
    const conditions = buildAuditSearchConditions(columns, filters);
    const rows = await getDb()
      .select()
      .from(couponAuditLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(...auditSearchOrderBy(columns))
      .limit(filters.limit);
    return rows.map(mapRowToEntry);
  },
};
