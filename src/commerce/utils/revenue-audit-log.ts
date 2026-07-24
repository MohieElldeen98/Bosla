import type { DbClient } from "@/db";
import { RevenueAuditLogRepository } from "@/commerce/repositories/revenue-audit-log.repository";
import { logger } from "@/lib/logger";
import type { NewRevenueAuditLogInput } from "@/commerce/types/revenue-audit-log";

/**
 * "Nothing financial happens silently" (docs/revenue-platform.md
 * §Audit) — one row per movement: `allocation_created`,
 * `allocation_reversed`, `adjustment_created`, `commission_rule_created`,
 * `commission_rule_closed`, `payout_batch_created`,
 * `payout_status_changed`, `balance_released`. Accepts a transaction
 * handle so a log commits/rolls back atomically with the movement it
 * describes; the non-transactional call sites degrade to best-effort
 * (a logging failure must never undo a granted enrollment).
 */
export async function recordRevenueAuditLog(entry: NewRevenueAuditLogInput, db?: DbClient): Promise<void> {
  if (db) {
    await RevenueAuditLogRepository.create(entry, db);
    return;
  }
  try {
    await RevenueAuditLogRepository.create(entry);
  } catch (error) {
    logger.error("[commerce] revenue audit log failed", error);
  }
}
