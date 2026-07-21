import "server-only";

import { getDb } from "@/db";
import { CommissionRuleRepository } from "@/commerce/repositories/commission-rule.repository";
import { RevenueAllocationRepository } from "@/commerce/repositories/revenue-allocation.repository";
import { InstructorBalanceRepository } from "@/commerce/repositories/instructor-balance.repository";
import { commissionAdjustments } from "@/db/schema/revenue";
import { CourseRepository } from "@/courses/repositories/course.repository";
import { CourseInstructorRepository } from "@/courses/repositories/instructor.repository";
import { requireCommerceManagementAccess } from "@/commerce/utils/require-commerce-access";
import { recordRevenueAuditLog } from "@/commerce/utils/revenue-audit-log";
import { safeMutation, safeRead } from "@/commerce/utils/safe-operation";
import { resolveLocalizedText } from "@/cms/utils/resolve-localized";
import type { Locale } from "@/i18n/routing";
import type { CommerceActionResult } from "@/commerce/types/result";
import type { CommissionRule, RevenueAllocation } from "@/commerce/types/revenue";
import type {
  CreateCommissionAdjustmentInput,
  CreateCommissionRuleInput,
} from "@/commerce/validators/revenue.validator";

export interface CommissionRuleListItem extends CommissionRule {
  scopeLabel: string;
  isActive: boolean;
}

/**
 * Admin orchestration for `commission_rules` and manual adjustments.
 * Rules are effective-dated and immutable in rate: "changing" one
 * closes the old row at the new rule's start and inserts the new — a
 * sale allocated last year keeps pointing at (and being explained by)
 * the rule that priced it. Adjustments are signed ledger rows plus an
 * action record, never edits to existing money.
 */
export const CommissionService = {
  async listResolved(locale: Locale): Promise<CommissionRuleListItem[]> {
    const rules = await safeRead(() => CommissionRuleRepository.list(), []);
    const courseIds = rules.filter((rule) => rule.scope === "course" && rule.scopeId).map((rule) => rule.scopeId!);
    const instructorIds = rules
      .filter((rule) => rule.scope === "instructor" && rule.scopeId)
      .map((rule) => rule.scopeId!);
    const [courses, instructors] = await Promise.all([
      safeRead(() => CourseRepository.findByIds([...new Set(courseIds)]), []),
      safeRead(() => CourseInstructorRepository.findByIds([...new Set(instructorIds)]), []),
    ]);
    const courseById = new Map(courses.map((course) => [course.id, course]));
    const instructorById = new Map(instructors.map((instructor) => [instructor.id, instructor]));
    const now = Date.now();

    return rules.map((rule) => {
      let scopeLabel = "Global";
      if (rule.scope === "course" && rule.scopeId) {
        const course = courseById.get(rule.scopeId);
        scopeLabel = course ? resolveLocalizedText(course.title, locale) : rule.scopeId;
      } else if (rule.scope === "instructor" && rule.scopeId) {
        const instructor = instructorById.get(rule.scopeId);
        scopeLabel = instructor ? resolveLocalizedText(instructor.name, locale) : rule.scopeId;
      }
      const isActive =
        new Date(rule.effectiveFrom).getTime() <= now &&
        (rule.effectiveTo === null || new Date(rule.effectiveTo).getTime() > now);
      return { ...rule, scopeLabel, isActive };
    });
  },

  /** Creating a rule supersedes the open rule on the same target (if
   *  any): the old one is closed at the new one's `effectiveFrom`, so
   *  windows never overlap and history stays contiguous. */
  async create(input: CreateCommissionRuleInput): Promise<CommerceActionResult<CommissionRule>> {
    return safeMutation(async () => {
      const admin = await requireCommerceManagementAccess();
      if (!admin) {
        return { success: false, code: "forbidden", message: "You cannot manage commission rules." };
      }
      const effectiveFrom = input.effectiveFrom ? new Date(input.effectiveFrom) : new Date();

      const open = (await CommissionRuleRepository.list({ activeOnly: true })).filter(
        (rule) =>
          rule.scope === input.scope &&
          (rule.scopeId ?? null) === (input.scopeId ?? null) &&
          rule.recipientType === (input.recipientType ?? "instructor") &&
          rule.effectiveTo === null,
      );
      for (const rule of open) {
        if (new Date(rule.effectiveFrom) >= effectiveFrom) {
          return {
            success: false,
            code: "conflict",
            message: "An open rule on this target starts at or after the new effective date. Close it first.",
          };
        }
        const closed = await CommissionRuleRepository.close(rule.id, effectiveFrom, rule.updatedAt);
        if (closed.status !== "ok") {
          return { success: false, code: "conflict", message: "The existing rule changed underneath you. Reload and retry." };
        }
        await recordRevenueAuditLog({
          action: "commission_rule_closed",
          entityType: "commission_rule",
          entityId: rule.id,
          actorId: admin.id,
          metadata: { supersededByNewRule: true, effectiveTo: effectiveFrom.toISOString() },
        });
      }

      const created = await CommissionRuleRepository.create({
        scope: input.scope,
        scopeId: input.scopeId ?? null,
        recipientType: input.recipientType ?? "instructor",
        rateType: input.rateType,
        rateValue: input.rateValue.toFixed(2),
        effectiveFrom: effectiveFrom.toISOString(),
        createdByUserId: admin.id,
      });
      await recordRevenueAuditLog({
        action: "commission_rule_created",
        entityType: "commission_rule",
        entityId: created.id,
        actorId: admin.id,
        metadata: {
          scope: created.scope,
          scopeId: created.scopeId,
          rateType: created.rateType,
          rateValue: created.rateValue,
          effectiveFrom: created.effectiveFrom,
        },
      });
      return { success: true, data: created };
    });
  },

  /** End a rule's window now — future sales fall through to the next
   *  most specific rule (or the platform keeps 100%). */
  async close(id: string, expectedUpdatedAt?: string): Promise<CommerceActionResult<CommissionRule>> {
    return safeMutation(async () => {
      const admin = await requireCommerceManagementAccess();
      if (!admin) {
        return { success: false, code: "forbidden", message: "You cannot manage commission rules." };
      }
      const result = await CommissionRuleRepository.close(id, new Date(), expectedUpdatedAt);
      if (result.status === "not_found") {
        return { success: false, code: "not_found", message: "Rule not found." };
      }
      if (result.status === "conflict") {
        return { success: false, code: "conflict", message: "This rule was changed (or already closed). Reload and retry." };
      }
      await recordRevenueAuditLog({
        action: "commission_rule_closed",
        entityType: "commission_rule",
        entityId: id,
        actorId: admin.id,
        metadata: { effectiveTo: result.data.effectiveTo },
      });
      return { success: true, data: result.data };
    });
  },

  /** Manual balance correction — a signed `adjustment` ledger row
   *  (immediately `available`), the matching balance movement, and the
   *  who/why record, all in one transaction. */
  async createAdjustment(input: CreateCommissionAdjustmentInput): Promise<CommerceActionResult<RevenueAllocation>> {
    return safeMutation(async () => {
      const admin = await requireCommerceManagementAccess();
      if (!admin) {
        return { success: false, code: "forbidden", message: "You cannot create adjustments." };
      }
      const instructor = await CourseInstructorRepository.findById(input.instructorId);
      if (!instructor) {
        return { success: false, code: "not_found", message: "Instructor not found." };
      }
      const amount = Number(input.amount);
      if (!Number.isFinite(amount) || amount === 0) {
        return { success: false, code: "validation_failed", message: "Adjustment amount can't be zero." };
      }

      const allocation = await getDb().transaction(async (tx) => {
        const [created] = await RevenueAllocationRepository.createMany(
          [
            {
              kind: "adjustment",
              recipientType: "instructor",
              instructorId: input.instructorId,
              currency: input.currency,
              basisAmount: "0.00",
              amount: amount.toFixed(2),
              status: "available",
              metadata: { reason: input.reason, createdBy: admin.id },
            },
          ],
          tx,
        );
        await InstructorBalanceRepository.applyDeltas(
          input.instructorId,
          input.currency,
          { available: amount, lifetime: amount, manual: amount },
          tx,
        );
        await tx.insert(commissionAdjustments).values({
          instructorId: input.instructorId,
          allocationId: created.id,
          amount: amount.toFixed(2),
          currency: input.currency,
          reason: input.reason,
          createdByUserId: admin.id,
        });
        await recordRevenueAuditLog(
          {
            action: "adjustment_created",
            entityType: "revenue_allocation",
            entityId: created.id,
            actorId: admin.id,
            metadata: { instructorId: input.instructorId, amount: amount.toFixed(2), currency: input.currency, reason: input.reason },
          },
          tx,
        );
        return created;
      });
      return { success: true, data: allocation };
    });
  },
};
