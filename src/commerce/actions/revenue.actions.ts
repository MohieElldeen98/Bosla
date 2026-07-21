"use server";

import { SessionService } from "@/auth/services/session.service";
import { CommissionService } from "@/commerce/commissions/commission.service";
import { PayoutService } from "@/commerce/payouts/payout.service";
import {
  closeCommissionRuleSchema,
  createCommissionAdjustmentSchema,
  createCommissionRuleSchema,
  createPayoutAccountSchema,
  createPayoutBatchSchema,
  payoutTransitionSchema,
} from "@/commerce/validators/revenue.validator";
import type { CommerceActionResult } from "@/commerce/types/result";
import type { CommissionRule, PayoutAccount, PayoutBatch, RevenueAllocation } from "@/commerce/types/revenue";

function validationError(issues: { message: string }[]): CommerceActionResult<never> {
  return { success: false, code: "validation_failed", message: issues.map((issue) => issue.message).join(" ") };
}

/** Admin: create an effective-dated commission rule (supersedes the
 *  open rule on the same target). Authorization lives in the service. */
export async function createCommissionRuleAction(rawInput: unknown): Promise<CommerceActionResult<CommissionRule>> {
  const parsed = createCommissionRuleSchema.safeParse(rawInput);
  if (!parsed.success) return validationError(parsed.error.issues);
  return CommissionService.create(parsed.data);
}

export async function closeCommissionRuleAction(rawInput: unknown): Promise<CommerceActionResult<CommissionRule>> {
  const parsed = closeCommissionRuleSchema.safeParse(rawInput);
  if (!parsed.success) return validationError(parsed.error.issues);
  return CommissionService.close(parsed.data.id, parsed.data.expectedUpdatedAt);
}

export async function createCommissionAdjustmentAction(
  rawInput: unknown,
): Promise<CommerceActionResult<RevenueAllocation>> {
  const parsed = createCommissionAdjustmentSchema.safeParse(rawInput);
  if (!parsed.success) return validationError(parsed.error.issues);
  return CommissionService.createAdjustment(parsed.data);
}

export async function createPayoutBatchAction(rawInput: unknown): Promise<CommerceActionResult<PayoutBatch>> {
  const parsed = createPayoutBatchSchema.safeParse(rawInput);
  if (!parsed.success) return validationError(parsed.error.issues);
  return PayoutService.createBatch(parsed.data);
}

export async function transitionPayoutBatchAction(rawInput: unknown): Promise<CommerceActionResult<PayoutBatch>> {
  const parsed = payoutTransitionSchema.safeParse(rawInput);
  if (!parsed.success) return validationError(parsed.error.issues);
  return PayoutService.transition(parsed.data);
}

/** Instructor: declare a payout account (own instructor profile only —
 *  resolved from the session inside the service). */
export async function addOwnPayoutAccountAction(rawInput: unknown): Promise<CommerceActionResult<PayoutAccount>> {
  const actingUser = await SessionService.getCurrentUser();
  if (!actingUser) {
    return { success: false, code: "forbidden", message: "You must be signed in." };
  }
  const parsed = createPayoutAccountSchema.safeParse(rawInput);
  if (!parsed.success) return validationError(parsed.error.issues);
  return PayoutService.addOwnAccount(actingUser, parsed.data);
}
