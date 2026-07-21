import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { couponRedemptions } from "@/db/schema/commerce";

export interface CouponRedemption {
  id: string;
  couponId: string;
  orderId: string;
  userId: string;
  createdAt: string;
}

type CouponRedemptionRow = typeof couponRedemptions.$inferSelect;

function mapRow(row: CouponRedemptionRow): CouponRedemption {
  return {
    id: row.id,
    couponId: row.couponId,
    orderId: row.orderId,
    userId: row.userId,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Data access for `coupon_redemptions` — the per-user usage record the
 *  coupon engine's `maxRedemptionsPerUser` check reads, written by
 *  `OrderService`'s completion path. */
export const CouponRedemptionRepository = {
  /** Idempotent per `(couponId, orderId)` — a replayed completion never
   *  double-counts. */
  async record(couponId: string, orderId: string, userId: string): Promise<CouponRedemption | null> {
    const [row] = await getDb()
      .insert(couponRedemptions)
      .values({ couponId, orderId, userId })
      .onConflictDoNothing()
      .returning();
    return row ? mapRow(row) : null;
  },

  async countByCouponAndUser(couponId: string, userId: string): Promise<number> {
    const rows = await getDb()
      .select({ count: sql<number>`count(*)::int` })
      .from(couponRedemptions)
      .where(and(eq(couponRedemptions.couponId, couponId), eq(couponRedemptions.userId, userId)));
    return rows[0]?.count ?? 0;
  },
};
