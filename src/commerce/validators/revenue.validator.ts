import { z } from "zod";
import {
  COMMISSION_RATE_TYPES,
  COMMISSION_RULE_SCOPES,
  REVENUE_ALLOCATION_KINDS,
  REVENUE_ALLOCATION_STATUSES,
} from "@/commerce/types/revenue";
import { SUPPORTED_CURRENCIES } from "@/payments/types/currency";

const moneyString = z
  .string()
  .trim()
  .regex(/^-?\d+(\.\d{1,2})?$/, "Enter a valid amount, e.g. 150.00");

/** The admin "New commission rule" form. `scopeId` is required exactly
 *  when the scope isn't global — same refinement pattern
 *  `createCouponSchema` uses. */
export const createCommissionRuleSchema = z
  .object({
    scope: z.enum(COMMISSION_RULE_SCOPES),
    scopeId: z.string().uuid().nullable().optional(),
    rateType: z.enum(COMMISSION_RATE_TYPES),
    rateValue: z.number().min(0),
    effectiveFrom: z.string().optional(),
    recipientType: z.literal("instructor").optional(),
  })
  .refine((data) => (data.scope === "global" ? !data.scopeId : !!data.scopeId), {
    message: "Pick a course or instructor for this scope, or choose Global.",
    path: ["scopeId"],
  })
  .refine((data) => data.rateType !== "percentage" || (data.rateValue >= 0 && data.rateValue <= 100), {
    message: "A percentage must be between 0 and 100.",
    path: ["rateValue"],
  });
export type CreateCommissionRuleInput = z.infer<typeof createCommissionRuleSchema>;

export const closeCommissionRuleSchema = z.object({
  id: z.string().uuid(),
  expectedUpdatedAt: z.string().optional(),
});
export type CloseCommissionRuleInput = z.infer<typeof closeCommissionRuleSchema>;

export const createCommissionAdjustmentSchema = z.object({
  instructorId: z.string().uuid(),
  currency: z.enum(SUPPORTED_CURRENCIES),
  amount: moneyString,
  reason: z.string().trim().min(3).max(500),
});
export type CreateCommissionAdjustmentInput = z.infer<typeof createCommissionAdjustmentSchema>;

/** The admin Allocations listing's URL params. */
export const searchAllocationsSchema = z.object({
  orderId: z.string().uuid().optional(),
  instructorId: z.string().uuid().optional(),
  recipientType: z.string().trim().min(1).max(32).optional(),
  kind: z.enum(REVENUE_ALLOCATION_KINDS).optional(),
  status: z.enum(REVENUE_ALLOCATION_STATUSES).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});
export type SearchAllocationsInput = z.infer<typeof searchAllocationsSchema>;

export const createPayoutBatchSchema = z.object({
  currency: z.enum(SUPPORTED_CURRENCIES),
  /** Restrict the batch to specific instructors; omitted = everyone
   *  with a positive available balance in this currency. */
  instructorIds: z.array(z.string().uuid()).max(200).optional(),
  scheduledFor: z.string().optional(),
  notes: z.string().trim().max(500).optional(),
});
export type CreatePayoutBatchInput = z.infer<typeof createPayoutBatchSchema>;

export const payoutTransitionSchema = z.object({
  batchId: z.string().uuid(),
  action: z.enum(["schedule", "process", "mark_paid", "mark_failed", "cancel"]),
  failureReason: z.string().trim().max(500).optional(),
});
export type PayoutTransitionInput = z.infer<typeof payoutTransitionSchema>;

export const createPayoutAccountSchema = z.object({
  method: z.enum(["bank_transfer", "mobile_wallet", "paypal", "other"]),
  currency: z.enum(SUPPORTED_CURRENCIES),
  accountName: z.string().trim().min(2).max(120),
  /** Free-form details (IBAN, wallet number…) — no transfer provider is
   *  integrated yet; an admin reads this when executing a batch. */
  accountDetails: z.string().trim().min(2).max(1000),
  isDefault: z.boolean().default(true),
});
export type CreatePayoutAccountInput = z.infer<typeof createPayoutAccountSchema>;
