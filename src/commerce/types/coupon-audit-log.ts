/**
 * The Commerce Domain's coupon-level audit trail — see
 * `order-audit-log.ts`'s doc comment for why this is a separate table/
 * type from the order trail.
 */
export type CouponAuditAction = "coupon_created" | "coupon_updated" | "coupon_activated" | "coupon_deactivated";

/** Mirrors `db/schema/commerce.ts`'s `coupon_audit_logs`. */
export interface CouponAuditLogEntry {
  id: string;
  action: CouponAuditAction;
  couponId: string;
  actorId: string | null;
  createdAt: string;
  metadata: Record<string, unknown>;
}

export interface NewCouponAuditLogInput {
  action: CouponAuditAction;
  couponId: string;
  actorId: string | null;
  metadata?: Record<string, unknown>;
}
