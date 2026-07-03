/**
 * The Commerce Domain's order-level audit trail, mirroring
 * `courses/types/course-audit-log.ts`'s shape/rationale exactly. A plain
 * union, not a Postgres enum (`order_audit_logs.action` is `text`), for
 * the same reason every other audit table here is: new actions
 * shouldn't need a migration.
 */
export type OrderAuditAction = "order_created" | "order_paid" | "order_cancelled" | "order_refunded";

/** Mirrors `db/schema/commerce.ts`'s `order_audit_logs`. Write-only for
 *  now — read path added in Step 5.1 alongside the admin Orders
 *  listing's own needs. */
export interface OrderAuditLogEntry {
  id: string;
  action: OrderAuditAction;
  orderId: string;
  actorId: string | null;
  createdAt: string;
  metadata: Record<string, unknown>;
}

export interface NewOrderAuditLogInput {
  action: OrderAuditAction;
  orderId: string;
  actorId: string | null;
  metadata?: Record<string, unknown>;
}
