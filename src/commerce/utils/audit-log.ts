import { logger } from "@/lib/logger";
import { OrderAuditLogRepository } from "@/commerce/repositories/order-audit-log.repository";
import { CouponAuditLogRepository } from "@/commerce/repositories/coupon-audit-log.repository";
import type { NewOrderAuditLogInput } from "@/commerce/types/order-audit-log";
import type { NewCouponAuditLogInput } from "@/commerce/types/coupon-audit-log";

/** Best-effort audit logging for order/coupon actions — mirrors
 *  `learning/utils/audit-log.ts`'s `recordLearningAuditLog` exactly: the
 *  mutation itself has already succeeded by the time this runs, so a
 *  logging failure must never turn a successful save into a reported
 *  error. */
export async function recordOrderAuditLog(input: NewOrderAuditLogInput): Promise<void> {
  try {
    await OrderAuditLogRepository.create(input);
  } catch (error) {
    logger.error("[commerce:order-audit]", error);
  }
}

export async function recordCouponAuditLog(input: NewCouponAuditLogInput): Promise<void> {
  try {
    await CouponAuditLogRepository.create(input);
  } catch (error) {
    logger.error("[commerce:coupon-audit]", error);
  }
}
