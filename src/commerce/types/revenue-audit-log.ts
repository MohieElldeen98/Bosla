/**
 * The Revenue Domain's audit trail — "nothing financial happens
 * silently" (docs/revenue-platform.md §Audit). `RevenueAuditAction` is
 * deliberately `string`, not a closed union (`revenue_audit_logs.action`
 * is `text`), same reasoning as `order-audit-log.ts`'s `OrderAuditAction`
 * — a brand-new movement type never needs a migration. `KNOWN_...`
 * documents today's vocabulary for reference; it is not exhaustive.
 */
export type RevenueAuditAction = string;

export const KNOWN_REVENUE_AUDIT_ACTIONS = [
  "allocation_created",
  "allocation_reversed",
  "adjustment_created",
  "commission_rule_created",
  "commission_rule_closed",
  "payout_batch_created",
  "payout_status_changed",
  "balance_released",
] as const;

/** Mirrors `db/schema/revenue.ts`'s `revenue_audit_logs` — the one audit
 *  table anchored on a generic `entityType`/`entityId` pair instead of a
 *  single required FK, since a financial movement can be about an
 *  allocation, a commission rule, or a payout batch. */
export interface RevenueAuditLogEntry {
  id: string;
  action: RevenueAuditAction;
  entityType: string;
  entityId: string | null;
  actorId: string | null;
  createdAt: string;
  metadata: Record<string, unknown>;
}

export interface NewRevenueAuditLogInput {
  action: RevenueAuditAction;
  entityType: string;
  entityId?: string | null;
  actorId?: string | null;
  metadata?: Record<string, unknown>;
}
