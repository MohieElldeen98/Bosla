import { getDb, type DbClient } from "@/db";
import { revenueAuditLogs } from "@/db/schema/revenue";
import { logger } from "@/lib/logger";

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
export async function recordRevenueAuditLog(
  entry: {
    action: string;
    entityType: string;
    entityId?: string | null;
    actorId?: string | null;
    metadata?: Record<string, unknown>;
  },
  db?: DbClient,
): Promise<void> {
  const write = (client: DbClient) =>
    client.insert(revenueAuditLogs).values({
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      actorId: entry.actorId ?? null,
      metadata: entry.metadata ?? {},
    });
  if (db) {
    await write(db);
    return;
  }
  try {
    await write(getDb());
  } catch (error) {
    logger.error("[commerce] revenue audit log failed", error);
  }
}
