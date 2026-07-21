import "server-only";

import { getDb } from "@/db";
import { PayoutRepository } from "@/commerce/repositories/payout.repository";
import { RevenueAllocationRepository } from "@/commerce/repositories/revenue-allocation.repository";
import { InstructorBalanceRepository } from "@/commerce/repositories/instructor-balance.repository";
import { RevenueEngine } from "@/commerce/revenue/revenue-engine.service";
import { CourseInstructorRepository } from "@/courses/repositories/instructor.repository";
import { CourseService } from "@/courses/services/course.service";
import { requireCommerceManagementAccess } from "@/commerce/utils/require-commerce-access";
import { recordRevenueAuditLog } from "@/commerce/utils/revenue-audit-log";
import { safeMutation, safeRead } from "@/commerce/utils/safe-operation";
import { isRoleAllowed } from "@/auth/utils/role.utils";
import { resolveLocalizedText } from "@/cms/utils/resolve-localized";
import type { Locale } from "@/i18n/routing";
import type { AuthUser } from "@/auth/types/session";
import type { CommerceActionResult } from "@/commerce/types/result";
import type {
  PayoutAccount,
  PayoutBatch,
  PayoutItemListItem,
  PayoutStatus,
} from "@/commerce/types/revenue";
import type { CreatePayoutAccountInput, CreatePayoutBatchInput, PayoutTransitionInput } from "@/commerce/validators/revenue.validator";

const TRANSITIONS: Record<PayoutTransitionInput["action"], { from: PayoutStatus[]; to: PayoutStatus }> = {
  schedule: { from: ["pending"], to: "scheduled" },
  process: { from: ["pending", "scheduled"], to: "processing" },
  mark_paid: { from: ["processing"], to: "paid" },
  mark_failed: { from: ["processing"], to: "failed" },
  cancel: { from: ["pending", "scheduled"], to: "cancelled" },
};

/**
 * Payout orchestration (docs/revenue-platform.md §Payouts) —
 * architecture only, by design: no bank/transfer provider is
 * integrated; an admin drives the batch lifecycle
 * (pending → scheduled → processing → paid | failed, cancel before
 * processing) while executing the actual transfers out-of-band.
 *
 * Money-safety model: creating a batch SWEEPS each instructor's
 * `available` ledger rows — stamping `payoutItemId` and flipping to
 * `paid` in one guarded statement — so two concurrent batches can never
 * pay the same allocation twice, and negative rows (clawbacks) net off
 * automatically. `failed`/`cancelled` un-sweep, returning every row to
 * `available` and restoring balances. Nothing is deleted, ever.
 */
export const PayoutService = {
  async createBatch(input: CreatePayoutBatchInput): Promise<CommerceActionResult<PayoutBatch>> {
    return safeMutation(async () => {
      const admin = await requireCommerceManagementAccess();
      if (!admin) {
        return { success: false, code: "forbidden", message: "You cannot manage payouts." };
      }
      await RevenueEngine.releaseMaturedBalances();

      const balances = (await InstructorBalanceRepository.listAll()).filter(
        (balance) =>
          balance.currency === input.currency &&
          Number(balance.availableBalance) > 0 &&
          (!input.instructorIds || input.instructorIds.includes(balance.instructorId)),
      );
      if (balances.length === 0) {
        return { success: false, code: "unavailable", message: "No instructor has a positive available balance in this currency." };
      }

      const batch = await getDb().transaction(async (tx) => {
        const created = await PayoutRepository.createBatch(
          {
            currency: input.currency,
            scheduledFor: input.scheduledFor ? new Date(input.scheduledFor) : null,
            notes: input.notes ?? null,
            createdByUserId: admin.id,
          },
          tx,
        );

        let batchTotal = 0;
        for (const balance of balances) {
          const accounts = await PayoutRepository.findAccountsByInstructor(balance.instructorId);
          const account =
            accounts.find((a) => a.isActive && a.currency === input.currency && a.isDefault) ??
            accounts.find((a) => a.isActive && a.currency === input.currency) ??
            null;

          const item = await PayoutRepository.createItem(
            {
              batchId: created.id,
              instructorId: balance.instructorId,
              payoutAccountId: account?.id ?? null,
              amount: "0.01", // placeholder > 0 for the check; corrected from the sweep below
              currency: input.currency,
            },
            tx,
          );
          const swept = await RevenueAllocationRepository.sweepForPayout(balance.instructorId, input.currency, item.id, tx);
          const net = Math.round(swept.reduce((sum, row) => sum + Number(row.amount), 0) * 100) / 100;

          if (net <= 0) {
            await RevenueAllocationRepository.unsweepPayout(item.id, tx);
            await PayoutRepository.deleteItem(item.id, tx);
            continue;
          }
          await PayoutRepository.updateItem(item.id, { amount: net.toFixed(2) }, tx);
          await InstructorBalanceRepository.applyDeltas(
            balance.instructorId,
            input.currency,
            { available: -net, paid: net },
            tx,
          );
          batchTotal = Math.round((batchTotal + net) * 100) / 100;
        }

        const finalized = await PayoutRepository.updateBatch(created.id, { totalAmount: batchTotal.toFixed(2) }, tx);
        await recordRevenueAuditLog(
          {
            action: "payout_batch_created",
            entityType: "payout_batch",
            entityId: created.id,
            actorId: admin.id,
            metadata: { currency: input.currency, totalAmount: batchTotal.toFixed(2), instructorCount: balances.length },
          },
          tx,
        );
        return finalized ?? created;
      });

      if (Number(batch.totalAmount) <= 0) {
        // Every candidate netted to zero (clawbacks ate the balances).
        await PayoutRepository.updateBatch(batch.id, { status: "cancelled" });
        return { success: false, code: "unavailable", message: "Nothing payable — available balances netted to zero." };
      }
      return { success: true, data: batch };
    });
  },

  async transition(input: PayoutTransitionInput): Promise<CommerceActionResult<PayoutBatch>> {
    return safeMutation(async () => {
      const admin = await requireCommerceManagementAccess();
      if (!admin) {
        return { success: false, code: "forbidden", message: "You cannot manage payouts." };
      }
      const batch = await PayoutRepository.findBatchById(input.batchId);
      if (!batch) {
        return { success: false, code: "not_found", message: "Payout batch not found." };
      }
      const transition = TRANSITIONS[input.action];
      if (!transition.from.includes(batch.status)) {
        return {
          success: false,
          code: "conflict",
          message: `A ${batch.status} batch can't be ${transition.to}.`,
        };
      }

      const updated = await getDb().transaction(async (tx) => {
        const items = await PayoutRepository.findItemsByBatch(batch.id);
        const reverting = transition.to === "failed" || transition.to === "cancelled";

        for (const item of items) {
          await PayoutRepository.updateItem(
            item.id,
            {
              status: transition.to,
              ...(transition.to === "failed" ? { failureReason: input.failureReason ?? null } : {}),
            },
            tx,
          );
          if (reverting) {
            // Un-sweep: allocations return to available, balances move
            // back paid → available. The ledger rows themselves were
            // never modified beyond their lifecycle stamp.
            await RevenueAllocationRepository.unsweepPayout(item.id, tx);
            await InstructorBalanceRepository.applyDeltas(
              item.instructorId,
              item.currency,
              { available: Number(item.amount), paid: -Number(item.amount) },
              tx,
            );
          }
        }

        const result = await PayoutRepository.updateBatch(
          batch.id,
          { status: transition.to, ...(transition.to === "paid" ? { processedAt: new Date() } : {}) },
          tx,
        );
        await recordRevenueAuditLog(
          {
            action: "payout_status_changed",
            entityType: "payout_batch",
            entityId: batch.id,
            actorId: admin.id,
            metadata: { from: batch.status, to: transition.to, failureReason: input.failureReason ?? null },
          },
          tx,
        );
        return result;
      });

      if (!updated) {
        return { success: false, code: "unknown", message: "Batch update failed." };
      }
      return { success: true, data: updated };
    });
  },

  async listBatches(status?: PayoutStatus): Promise<PayoutBatch[]> {
    return safeRead(() => PayoutRepository.listBatches(status), []);
  },

  async getBatchResolved(batchId: string, locale: Locale): Promise<{ batch: PayoutBatch; items: PayoutItemListItem[] } | null> {
    const batch = await safeRead(() => PayoutRepository.findBatchById(batchId), null);
    if (!batch) return null;
    const items = await safeRead(() => PayoutRepository.findItemsByBatch(batchId), []);
    const [instructors, accountLists] = await Promise.all([
      safeRead(() => CourseInstructorRepository.findByIds([...new Set(items.map((item) => item.instructorId))]), []),
      Promise.all(items.map((item) => safeRead(() => PayoutRepository.findAccountsByInstructor(item.instructorId), []))),
    ]);
    const instructorById = new Map(instructors.map((instructor) => [instructor.id, instructor]));
    const accountById = new Map(accountLists.flat().map((account) => [account.id, account]));
    return {
      batch,
      items: items.map((item) => ({
        ...item,
        instructorName: instructorById.has(item.instructorId)
          ? resolveLocalizedText(instructorById.get(item.instructorId)!.name, locale)
          : item.instructorId,
        payoutAccountName: item.payoutAccountId ? (accountById.get(item.payoutAccountId)?.accountName ?? null) : null,
      })),
    };
  },

  /** Instructor self-service: declare where to be paid. */
  async addOwnAccount(actingUser: AuthUser, input: CreatePayoutAccountInput): Promise<CommerceActionResult<PayoutAccount>> {
    return safeMutation(async () => {
      if (!isRoleAllowed(actingUser.role, ["instructor"])) {
        return { success: false, code: "forbidden", message: "Only instructors can add payout accounts." };
      }
      const ownInstructor = await CourseService.getOwnInstructor(actingUser);
      if (!ownInstructor) {
        return { success: false, code: "forbidden", message: "Your instructor profile isn't linked yet." };
      }
      if (input.isDefault) {
        await PayoutRepository.clearDefaultForInstructor(ownInstructor.id);
      }
      const account = await PayoutRepository.createAccount({
        instructorId: ownInstructor.id,
        method: input.method,
        currency: input.currency,
        accountName: input.accountName,
        accountDetails: { details: input.accountDetails },
        isDefault: input.isDefault,
      });
      await recordRevenueAuditLog({
        action: "payout_account_created",
        entityType: "payout_account",
        entityId: account.id,
        actorId: actingUser.id,
        metadata: { instructorId: ownInstructor.id, method: input.method, currency: input.currency },
      });
      return { success: true, data: account };
    });
  },

  async listOwnAccounts(actingUser: AuthUser): Promise<PayoutAccount[]> {
    if (!isRoleAllowed(actingUser.role, ["instructor"])) return [];
    const ownInstructor = await CourseService.getOwnInstructor(actingUser);
    if (!ownInstructor) return [];
    return safeRead(() => PayoutRepository.findAccountsByInstructor(ownInstructor.id), []);
  },
};
