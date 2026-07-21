/**
 * The Revenue Distribution & Payout Platform's shared vocabulary
 * (docs/revenue-platform.md) — mirrors `db/schema/revenue.ts` exactly.
 * Money is decimal strings throughout (Postgres `numeric` convention).
 */

/** Recipients the ledger knows today. Plain strings (not a closed
 *  enum) end-to-end so affiliates/partners/marketplace sellers are new
 *  vocabulary + rules, never a migration. */
export const KNOWN_RECIPIENT_TYPES = ["platform", "instructor"] as const;
export type RecipientType = string;

export const COMMISSION_RULE_SCOPES = ["global", "instructor", "course"] as const;
export type CommissionRuleScope = (typeof COMMISSION_RULE_SCOPES)[number];

export const COMMISSION_RATE_TYPES = ["percentage", "fixed_amount"] as const;
export type CommissionRateType = (typeof COMMISSION_RATE_TYPES)[number];

export interface CommissionRule {
  id: string;
  scope: CommissionRuleScope;
  scopeId: string | null;
  recipientType: RecipientType;
  rateType: CommissionRateType;
  rateValue: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewCommissionRuleInput {
  scope: CommissionRuleScope;
  scopeId?: string | null;
  recipientType?: RecipientType;
  rateType: CommissionRateType;
  rateValue: string;
  effectiveFrom?: string;
  createdByUserId?: string | null;
}

export const REVENUE_ALLOCATION_KINDS = ["sale", "refund_reversal", "adjustment"] as const;
export type RevenueAllocationKind = (typeof REVENUE_ALLOCATION_KINDS)[number];

export const REVENUE_ALLOCATION_STATUSES = ["pending", "available", "paid"] as const;
export type RevenueAllocationStatus = (typeof REVENUE_ALLOCATION_STATUSES)[number];

export interface RevenueAllocation {
  id: string;
  /** NULL only on manual `adjustment` rows. */
  orderId: string | null;
  orderItemId: string | null;
  paymentId: string | null;
  kind: RevenueAllocationKind;
  recipientType: RecipientType;
  instructorId: string | null;
  commissionRuleId: string | null;
  currency: string;
  basisAmount: string;
  /** Signed: `sale` positive, `refund_reversal` negative,
   *  `adjustment` either. Immutable once written. */
  amount: string;
  status: RevenueAllocationStatus;
  payoutItemId: string | null;
  reversalKey: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface NewRevenueAllocationInput {
  orderId?: string | null;
  orderItemId?: string | null;
  paymentId?: string | null;
  kind: RevenueAllocationKind;
  recipientType: RecipientType;
  instructorId?: string | null;
  commissionRuleId?: string | null;
  currency: string;
  basisAmount: string;
  amount: string;
  status?: RevenueAllocationStatus;
  reversalKey?: string | null;
  metadata?: Record<string, unknown>;
}

export interface InstructorBalance {
  id: string;
  instructorId: string;
  currency: string;
  pendingBalance: string;
  availableBalance: string;
  paidBalance: string;
  lifetimeEarnings: string;
  refundAdjustments: string;
  manualAdjustments: string;
  updatedAt: string;
}

export const PAYOUT_STATUSES = ["pending", "scheduled", "processing", "paid", "failed", "cancelled"] as const;
export type PayoutStatus = (typeof PAYOUT_STATUSES)[number];

export interface PayoutAccount {
  id: string;
  instructorId: string;
  method: string;
  currency: string;
  accountName: string;
  accountDetails: Record<string, unknown>;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PayoutBatch {
  id: string;
  status: PayoutStatus;
  currency: string;
  totalAmount: string;
  scheduledFor: string | null;
  processedAt: string | null;
  notes: string | null;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PayoutItem {
  id: string;
  batchId: string;
  instructorId: string;
  payoutAccountId: string | null;
  status: PayoutStatus;
  amount: string;
  currency: string;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CommissionAdjustment {
  id: string;
  instructorId: string;
  allocationId: string;
  amount: string;
  currency: string;
  reason: string;
  createdByUserId: string | null;
  createdAt: string;
}

/** Display-ready rows composed at the service layer (same pattern as
 *  `OrderListItem`). */
export interface RevenueAllocationListItem extends RevenueAllocation {
  instructorName: string;
  courseTitle: string;
}

export interface InstructorBalanceListItem extends InstructorBalance {
  instructorName: string;
}

export interface PayoutItemListItem extends PayoutItem {
  instructorName: string;
  payoutAccountName: string | null;
}

/** Reporting shapes (`src/commerce/reports/`). All grouped per
 *  currency — cross-currency sums are meaningless. */
export interface RevenueSummary {
  currency: string;
  grossRevenue: string;
  platformRevenue: string;
  instructorRevenue: string;
  refundedTotal: string;
  refundRatePercent: string;
  orderCount: number;
}

export interface RevenueTimeBucket {
  bucket: string; // ISO date (day) or YYYY-MM (month)
  currency: string;
  grossRevenue: string;
  platformRevenue: string;
  instructorRevenue: string;
}

export interface TopCourseRevenue {
  courseId: string;
  courseTitle: string;
  currency: string;
  grossRevenue: string;
  saleCount: number;
}

export interface TopInstructorRevenue {
  instructorId: string;
  instructorName: string;
  currency: string;
  instructorRevenue: string;
  saleCount: number;
}

export interface InstructorEarningsOverview {
  balances: InstructorBalance[];
  recentAllocations: RevenueAllocationListItem[];
  monthlyRevenue: RevenueTimeBucket[];
  payoutItems: PayoutItemListItem[];
}
