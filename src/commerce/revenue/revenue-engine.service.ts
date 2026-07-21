import "server-only";

import { getDb } from "@/db";
import { OrderItemRepository } from "@/commerce/repositories/order-item.repository";
import { CourseRepository } from "@/courses/repositories/course.repository";
import { CommissionRuleRepository } from "@/commerce/repositories/commission-rule.repository";
import { RevenueAllocationRepository } from "@/commerce/repositories/revenue-allocation.repository";
import { InstructorBalanceRepository } from "@/commerce/repositories/instructor-balance.repository";
import { resolveCommissionRule, computeCommissionShare } from "@/commerce/commissions/commission-engine";
import { getMaturityCutoff, getRevenueHoldDays } from "@/commerce/revenue/revenue-config";
import { recordRevenueAuditLog } from "@/commerce/utils/revenue-audit-log";
import { logger } from "@/lib/logger";
import type { Order } from "@/commerce/types/order";
import type { NewRevenueAllocationInput, RevenueAllocation } from "@/commerce/types/revenue";

function round2(value: number): string {
  return (Math.round(value * 100) / 100).toFixed(2);
}

/**
 * The Revenue Engine (docs/revenue-platform.md §Engine) — the ONE place
 * a completed sale becomes ledger rows and balances. Business logic
 * never computes a split anywhere else; rules come from
 * `commission_rules` via the Commission Engine, the platform's share is
 * always the residual, and every write is:
 *
 * - **Idempotent** — the ledger's partial unique indexes absorb
 *   replays; balance deltas are computed ONLY from rows that actually
 *   inserted, so a replayed webhook moves nothing twice.
 * - **Atomic** — allocations, balance increments, and their audit rows
 *   commit or roll back together (`getDb().transaction`).
 * - **Race-safe** — balances move via SQL-side increments, never
 *   read-modify-write.
 *
 * A sale's basis is the order total net of tax (tax is never revenue).
 * With today's default of no rules configured, the platform keeps 100%
 * — instructor shares exist exactly when an admin has created rules,
 * never by an implicit hardcoded percentage.
 */
export const RevenueEngine = {
  /** Called from the order-completion path. Skips $0 orders. Never
   *  throws — a revenue failure must not undo an enrollment; it's
   *  logged and re-runnable (idempotent) via webhook retry. */
  async allocateForOrder(order: Order, options?: { paymentId?: string | null }): Promise<RevenueAllocation[]> {
    try {
      const basisTotal = Number(order.total) - Number(order.taxTotal);
      if (!(basisTotal > 0)) return [];

      const items = await OrderItemRepository.findByOrderId(order.id);
      if (items.length === 0) return [];
      const courses = await CourseRepository.findByIds(items.map((item) => item.courseId));
      const courseById = new Map(courses.map((course) => [course.id, course]));

      // Split the basis across items in proportion to their unit
      // prices (single-item orders today; multi-course carts inherit
      // this for free). Last item takes the rounding remainder.
      const unitSum = items.reduce((sum, item) => sum + Number(item.unitPrice), 0);
      let remaining = basisTotal;
      const inputs: NewRevenueAllocationInput[] = [];
      const ruleByInput: (string | null)[] = [];

      for (let index = 0; index < items.length; index += 1) {
        const item = items[index];
        const isLast = index === items.length - 1;
        const share =
          unitSum > 0 ? (isLast ? remaining : Math.round(((Number(item.unitPrice) / unitSum) * basisTotal) * 100) / 100) : 0;
        remaining = Math.round((remaining - share) * 100) / 100;
        if (!(share > 0)) continue;

        const course = courseById.get(item.courseId);
        const instructorId = course?.instructorId ?? null;
        let instructorAmount = 0;
        let ruleId: string | null = null;

        if (instructorId) {
          const candidates = await CommissionRuleRepository.findEffectiveCandidates({
            recipientType: "instructor",
            courseId: item.courseId,
            instructorId,
            at: new Date(),
          });
          const rule = resolveCommissionRule(candidates);
          if (rule) {
            instructorAmount = Number(computeCommissionShare(rule, round2(share)));
            ruleId = rule.id;
          }
        }
        const platformAmount = Math.round((share - instructorAmount) * 100) / 100;

        const initialStatus = getRevenueHoldDays() === 0 ? "available" : "pending";
        if (instructorId && instructorAmount > 0) {
          inputs.push({
            orderId: order.id,
            orderItemId: item.id,
            paymentId: options?.paymentId ?? null,
            kind: "sale",
            recipientType: "instructor",
            instructorId,
            commissionRuleId: ruleId,
            currency: order.currency,
            basisAmount: round2(share),
            amount: round2(instructorAmount),
            status: initialStatus,
          });
          ruleByInput.push(ruleId);
        }
        if (platformAmount > 0) {
          inputs.push({
            orderId: order.id,
            orderItemId: item.id,
            paymentId: options?.paymentId ?? null,
            kind: "sale",
            recipientType: "platform",
            currency: order.currency,
            basisAmount: round2(share),
            amount: round2(platformAmount),
            // The platform's own share has no payout lifecycle.
            status: "available",
          });
          ruleByInput.push(null);
        }
      }
      if (inputs.length === 0) return [];

      return await getDb().transaction(async (tx) => {
        const created = await RevenueAllocationRepository.createMany(inputs, tx);
        for (const allocation of created) {
          if (allocation.recipientType === "instructor" && allocation.instructorId) {
            await InstructorBalanceRepository.applyDeltas(
              allocation.instructorId,
              allocation.currency,
              allocation.status === "available"
                ? { available: Number(allocation.amount), lifetime: Number(allocation.amount) }
                : { pending: Number(allocation.amount), lifetime: Number(allocation.amount) },
              tx,
            );
          }
          await recordRevenueAuditLog(
            {
              action: "allocation_created",
              entityType: "revenue_allocation",
              entityId: allocation.id,
              metadata: {
                orderId: order.id,
                recipientType: allocation.recipientType,
                instructorId: allocation.instructorId,
                amount: allocation.amount,
                currency: allocation.currency,
                commissionRuleId: allocation.commissionRuleId,
              },
            },
            tx,
          );
        }
        return created;
      });
    } catch (error) {
      logger.error("[commerce] revenue allocation failed", { orderId: order.id, error });
      return [];
    }
  },

  /**
   * Reverses a refund's worth of allocations — proportional for partial
   * refunds (`refundedAmount / paidAmount` of every sale row), as new
   * NEGATIVE ledger rows keyed by `reversalKey` (the refund's id, or a
   * synthetic key for admin order-level refunds) so a webhook replay or
   * double-click reverses nothing twice. A share already paid out
   * becomes a clawback against `available` (which may go negative —
   * the instructor owes it; the next payout nets it off).
   */
  async reverseForRefund(params: {
    orderId: string;
    reversalKey: string;
    refundedAmount: string;
    paidAmount: string;
    actorId?: string | null;
  }): Promise<RevenueAllocation[]> {
    try {
      const paid = Number(params.paidAmount);
      const factor = paid > 0 ? Math.min(Number(params.refundedAmount) / paid, 1) : 0;
      if (!(factor > 0)) return [];

      const sales = await RevenueAllocationRepository.findSalesByOrderId(params.orderId);
      if (sales.length === 0) return [];

      const inputs: NewRevenueAllocationInput[] = [];
      const saleById = new Map(sales.map((sale) => [sale.id, sale]));
      for (const sale of sales) {
        const reversal = Math.round(Number(sale.amount) * factor * 100) / 100;
        if (!(reversal > 0)) continue;
        inputs.push({
          orderId: sale.orderId,
          orderItemId: sale.orderItemId,
          paymentId: sale.paymentId,
          kind: "refund_reversal",
          recipientType: sale.recipientType,
          instructorId: sale.instructorId,
          commissionRuleId: sale.commissionRuleId,
          currency: sale.currency,
          basisAmount: sale.basisAmount,
          amount: round2(-reversal),
          // Mirrors the original's maturity so a pending negative nets
          // against the pending positive it reverses.
          status: sale.status === "pending" ? "pending" : "available",
          reversalKey: params.reversalKey,
          metadata: { reversesAllocationId: sale.id, factor: round2(factor) },
        });
      }
      if (inputs.length === 0) return [];

      return await getDb().transaction(async (tx) => {
        const created = await RevenueAllocationRepository.createMany(inputs, tx);
        for (const reversal of created) {
          if (reversal.recipientType === "instructor" && reversal.instructorId) {
            const original = saleById.get((reversal.metadata["reversesAllocationId"] as string) ?? "");
            const amount = Number(reversal.amount); // negative
            await InstructorBalanceRepository.applyDeltas(
              reversal.instructorId,
              reversal.currency,
              {
                ...(original?.status === "pending" ? { pending: amount } : { available: amount }),
                lifetime: amount,
                refund: -amount,
              },
              tx,
            );
          }
          await recordRevenueAuditLog(
            {
              action: "allocation_reversed",
              entityType: "revenue_allocation",
              entityId: reversal.id,
              actorId: params.actorId ?? null,
              metadata: {
                orderId: params.orderId,
                reversalKey: params.reversalKey,
                recipientType: reversal.recipientType,
                instructorId: reversal.instructorId,
                amount: reversal.amount,
                currency: reversal.currency,
              },
            },
            tx,
          );
        }
        return created;
      });
    } catch (error) {
      logger.error("[commerce] revenue reversal failed", { orderId: params.orderId, error });
      return [];
    }
  },

  /** Lazy pending→available maturation — safe to call from any read
   *  path (earnings page, balances page, payout creation); flips only
   *  rows older than the hold window and mirrors each flip into the
   *  balance cache atomically. */
  async releaseMaturedBalances(instructorId?: string): Promise<number> {
    try {
      const cutoff = getMaturityCutoff();
      return await getDb().transaction(async (tx) => {
        const released = await RevenueAllocationRepository.releaseMatured(cutoff, instructorId, tx);
        for (const allocation of released) {
          if (allocation.recipientType === "instructor" && allocation.instructorId) {
            const amount = Number(allocation.amount);
            await InstructorBalanceRepository.applyDeltas(
              allocation.instructorId,
              allocation.currency,
              { pending: -amount, available: amount },
              tx,
            );
          }
        }
        if (released.length > 0) {
          await recordRevenueAuditLog(
            {
              action: "balance_released",
              entityType: "revenue_allocation",
              metadata: { count: released.length, cutoff: cutoff.toISOString(), instructorId: instructorId ?? null },
            },
            tx,
          );
        }
        return released.length;
      });
    } catch (error) {
      logger.error("[commerce] balance release failed", error);
      return 0;
    }
  },
};
