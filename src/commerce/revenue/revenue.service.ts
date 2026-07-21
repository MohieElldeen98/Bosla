import "server-only";

import { RevenueEngine } from "@/commerce/revenue/revenue-engine.service";
import { RevenueAllocationRepository, type AllocationSearchFilters } from "@/commerce/repositories/revenue-allocation.repository";
import { InstructorBalanceRepository } from "@/commerce/repositories/instructor-balance.repository";
import { PayoutRepository } from "@/commerce/repositories/payout.repository";
import { OrderItemRepository } from "@/commerce/repositories/order-item.repository";
import { CourseRepository } from "@/courses/repositories/course.repository";
import { CourseInstructorRepository } from "@/courses/repositories/instructor.repository";
import { CourseService } from "@/courses/services/course.service";
import { RevenueReportService } from "@/commerce/reports/revenue-report.service";
import { isRoleAllowed } from "@/auth/utils/role.utils";
import { safeRead } from "@/commerce/utils/safe-operation";
import { resolveLocalizedText } from "@/cms/utils/resolve-localized";
import type { Locale } from "@/i18n/routing";
import type { AuthUser } from "@/auth/types/session";
import type {
  InstructorBalanceListItem,
  InstructorEarningsOverview,
  PayoutItemListItem,
  RevenueAllocation,
  RevenueAllocationListItem,
} from "@/commerce/types/revenue";

async function resolveAllocations(rows: RevenueAllocation[], locale: Locale): Promise<RevenueAllocationListItem[]> {
  if (rows.length === 0) return [];
  const orderIds = [...new Set(rows.map((row) => row.orderId).filter((id): id is string => id !== null))];
  const instructorIds = [...new Set(rows.map((row) => row.instructorId).filter((id): id is string => id !== null))];
  const [items, instructors] = await Promise.all([
    safeRead(() => OrderItemRepository.findByOrderIds(orderIds), []),
    safeRead(() => CourseInstructorRepository.findByIds(instructorIds), []),
  ]);
  const courses = await safeRead(() => CourseRepository.findByIds([...new Set(items.map((item) => item.courseId))]), []);
  const itemByOrderId = new Map(items.map((item) => [item.orderId, item]));
  const courseById = new Map(courses.map((course) => [course.id, course]));
  const instructorById = new Map(instructors.map((instructor) => [instructor.id, instructor]));

  return rows.map((row) => {
    const item = row.orderId ? itemByOrderId.get(row.orderId) : undefined;
    const course = item ? courseById.get(item.courseId) : undefined;
    const instructor = row.instructorId ? instructorById.get(row.instructorId) : undefined;
    return {
      ...row,
      instructorName: instructor ? resolveLocalizedText(instructor.name, locale) : row.recipientType === "platform" ? "Bosla" : "—",
      courseTitle: course ? resolveLocalizedText(course.title, locale) : "—",
    };
  });
}

/**
 * Read-model composition for the Revenue Platform's dashboards — the
 * same "resolve display rows at the service layer" pattern
 * `OrderService.resolveOrders` uses. Every read that surfaces balances
 * first runs the lazy maturation sweep so "available" is always
 * current without a scheduler.
 */
export const RevenueService = {
  async searchAllocationsResolved(filters: AllocationSearchFilters, locale: Locale) {
    const result = await safeRead(() => RevenueAllocationRepository.search(filters), {
      items: [] as RevenueAllocation[],
      total: 0,
      page: filters.page ?? 1,
      pageSize: filters.pageSize ?? 20,
      totalPages: 1,
    });
    const items = await resolveAllocations(result.items, locale);
    return { ...result, items };
  },

  async listBalancesResolved(locale: Locale): Promise<InstructorBalanceListItem[]> {
    await RevenueEngine.releaseMaturedBalances();
    const balances = await safeRead(() => InstructorBalanceRepository.listAll(), []);
    const instructors = await safeRead(
      () => CourseInstructorRepository.findByIds([...new Set(balances.map((balance) => balance.instructorId))]),
      [],
    );
    const instructorById = new Map(instructors.map((instructor) => [instructor.id, instructor]));
    return balances.map((balance) => ({
      ...balance,
      instructorName: instructorById.has(balance.instructorId)
        ? resolveLocalizedText(instructorById.get(balance.instructorId)!.name, locale)
        : balance.instructorId,
    }));
  },

  /** The Instructor Earnings dashboard — always the signed-in
   *  Instructor's own data, resolved through the same
   *  "own `instructors` row" scope every other `*Own` read uses. */
  async getOwnEarningsOverview(actingUser: AuthUser, locale: Locale): Promise<InstructorEarningsOverview | null> {
    if (!isRoleAllowed(actingUser.role, ["instructor"])) return null;
    const ownInstructor = await CourseService.getOwnInstructor(actingUser);
    if (!ownInstructor) return null;

    await RevenueEngine.releaseMaturedBalances(ownInstructor.id);

    const [balances, recent, monthlyRevenue, payoutRows] = await Promise.all([
      safeRead(() => InstructorBalanceRepository.findByInstructorId(ownInstructor.id), []),
      safeRead(
        () =>
          RevenueAllocationRepository.search({ instructorId: ownInstructor.id, recipientType: "instructor", pageSize: 10 }),
        { items: [] as RevenueAllocation[], total: 0, page: 1, pageSize: 10, totalPages: 1 },
      ),
      RevenueReportService.instructorMonthlySeries(ownInstructor.id, 6),
      safeRead(() => PayoutRepository.findItemsByInstructor(ownInstructor.id, 10), []),
    ]);
    const [recentAllocations, accounts] = await Promise.all([
      resolveAllocations(recent.items, locale),
      safeRead(() => PayoutRepository.findAccountsByInstructor(ownInstructor.id), []),
    ]);
    const accountById = new Map(accounts.map((account) => [account.id, account]));

    const payoutItems: PayoutItemListItem[] = payoutRows.map((item) => ({
      ...item,
      instructorName: resolveLocalizedText(ownInstructor.name, locale),
      payoutAccountName: item.payoutAccountId ? (accountById.get(item.payoutAccountId)?.accountName ?? null) : null,
    }));

    return { balances, recentAllocations, monthlyRevenue, payoutItems };
  },
};
