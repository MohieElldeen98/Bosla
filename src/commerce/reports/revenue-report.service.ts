import "server-only";

import { and, desc, eq, gte, isNotNull, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { revenueAllocations } from "@/db/schema/revenue";
import { orderItems } from "@/db/schema/commerce";
import { CourseRepository } from "@/courses/repositories/course.repository";
import { CourseInstructorRepository } from "@/courses/repositories/instructor.repository";
import { safeRead } from "@/commerce/utils/safe-operation";
import { resolveLocalizedText } from "@/cms/utils/resolve-localized";
import type { Locale } from "@/i18n/routing";
import type {
  RevenueSummary,
  RevenueTimeBucket,
  TopCourseRevenue,
  TopInstructorRevenue,
} from "@/commerce/types/revenue";

function money(value: unknown): string {
  return Number(value ?? 0).toFixed(2);
}

/**
 * Read-only aggregation over the `revenue_allocations` ledger
 * (docs/revenue-platform.md §Reporting) — every figure is derived from
 * immutable rows, so any number here can be audited back to individual
 * allocations. All groupings carry `currency`: cross-currency sums are
 * never produced. "Net" figures include refund reversals (their rows
 * are negative); the refund rate is reversed-vs-sold.
 */
export const RevenueReportService = {
  async summary(from?: Date): Promise<RevenueSummary[]> {
    return safeRead(async () => {
      const conditions: SQL[] = [];
      if (from) conditions.push(gte(revenueAllocations.createdAt, from));
      const rows = await getDb()
        .select({
          currency: revenueAllocations.currency,
          gross: sql<string>`coalesce(sum(${revenueAllocations.amount}) filter (where ${revenueAllocations.kind} = 'sale'), 0)`,
          refunded: sql<string>`coalesce(-sum(${revenueAllocations.amount}) filter (where ${revenueAllocations.kind} = 'refund_reversal'), 0)`,
          platform: sql<string>`coalesce(sum(${revenueAllocations.amount}) filter (where ${revenueAllocations.recipientType} = 'platform' and ${revenueAllocations.kind} <> 'adjustment'), 0)`,
          instructor: sql<string>`coalesce(sum(${revenueAllocations.amount}) filter (where ${revenueAllocations.recipientType} = 'instructor' and ${revenueAllocations.kind} <> 'adjustment'), 0)`,
          orderCount: sql<number>`count(distinct ${revenueAllocations.orderId}) filter (where ${revenueAllocations.kind} = 'sale')::int`,
        })
        .from(revenueAllocations)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .groupBy(revenueAllocations.currency);

      return rows.map((row) => {
        const gross = Number(row.gross);
        const refunded = Number(row.refunded);
        return {
          currency: row.currency,
          grossRevenue: money(row.gross),
          platformRevenue: money(row.platform),
          instructorRevenue: money(row.instructor),
          refundedTotal: money(row.refunded),
          refundRatePercent: gross > 0 ? ((refunded / gross) * 100).toFixed(1) : "0.0",
          orderCount: row.orderCount,
        };
      });
    }, []);
  },

  /** Net revenue per day/month bucket — feeds the dashboard charts. */
  async timeSeries(granularity: "day" | "month", buckets: number): Promise<RevenueTimeBucket[]> {
    return safeRead(async () => {
      const unit = granularity === "day" ? sql`day` : sql`month`;
      const since =
        granularity === "day"
          ? new Date(Date.now() - buckets * 24 * 60 * 60 * 1000)
          : new Date(new Date().getFullYear(), new Date().getMonth() - (buckets - 1), 1);
      const format = granularity === "day" ? "YYYY-MM-DD" : "YYYY-MM";

      const rows = await getDb()
        .select({
          bucket: sql<string>`to_char(date_trunc(${unit}, ${revenueAllocations.createdAt}), ${format})`,
          currency: revenueAllocations.currency,
          gross: sql<string>`coalesce(sum(${revenueAllocations.amount}) filter (where ${revenueAllocations.kind} <> 'adjustment'), 0)`,
          platform: sql<string>`coalesce(sum(${revenueAllocations.amount}) filter (where ${revenueAllocations.recipientType} = 'platform' and ${revenueAllocations.kind} <> 'adjustment'), 0)`,
          instructor: sql<string>`coalesce(sum(${revenueAllocations.amount}) filter (where ${revenueAllocations.recipientType} = 'instructor' and ${revenueAllocations.kind} <> 'adjustment'), 0)`,
        })
        .from(revenueAllocations)
        .where(gte(revenueAllocations.createdAt, since))
        .groupBy(sql`1`, revenueAllocations.currency)
        .orderBy(sql`1`);

      return rows.map((row) => ({
        bucket: row.bucket,
        currency: row.currency,
        grossRevenue: money(row.gross),
        platformRevenue: money(row.platform),
        instructorRevenue: money(row.instructor),
      }));
    }, []);
  },

  async topCourses(limit: number, locale: Locale): Promise<TopCourseRevenue[]> {
    return safeRead(async () => {
      const rows = await getDb()
        .select({
          courseId: orderItems.courseId,
          currency: revenueAllocations.currency,
          gross: sql<string>`coalesce(sum(${revenueAllocations.amount}) filter (where ${revenueAllocations.kind} <> 'adjustment'), 0)`,
          saleCount: sql<number>`count(*) filter (where ${revenueAllocations.kind} = 'sale' and ${revenueAllocations.recipientType} = 'platform')::int`,
        })
        .from(revenueAllocations)
        .innerJoin(orderItems, eq(orderItems.id, revenueAllocations.orderItemId))
        .groupBy(orderItems.courseId, revenueAllocations.currency)
        .orderBy(desc(sql`3`))
        .limit(limit);

      const courses = await CourseRepository.findByIds([...new Set(rows.map((row) => row.courseId))]);
      const courseById = new Map(courses.map((course) => [course.id, course]));
      return rows.map((row) => ({
        courseId: row.courseId,
        courseTitle: courseById.has(row.courseId)
          ? resolveLocalizedText(courseById.get(row.courseId)!.title, locale)
          : row.courseId,
        currency: row.currency,
        grossRevenue: money(row.gross),
        saleCount: row.saleCount,
      }));
    }, []);
  },

  async topInstructors(limit: number, locale: Locale): Promise<TopInstructorRevenue[]> {
    return safeRead(async () => {
      const rows = await getDb()
        .select({
          instructorId: revenueAllocations.instructorId,
          currency: revenueAllocations.currency,
          total: sql<string>`coalesce(sum(${revenueAllocations.amount}) filter (where ${revenueAllocations.kind} <> 'adjustment'), 0)`,
          saleCount: sql<number>`count(*) filter (where ${revenueAllocations.kind} = 'sale')::int`,
        })
        .from(revenueAllocations)
        .where(and(eq(revenueAllocations.recipientType, "instructor"), isNotNull(revenueAllocations.instructorId)))
        .groupBy(revenueAllocations.instructorId, revenueAllocations.currency)
        .orderBy(desc(sql`3`))
        .limit(limit);

      const ids = rows.map((row) => row.instructorId).filter((id): id is string => id !== null);
      const instructors = await CourseInstructorRepository.findByIds([...new Set(ids)]);
      const instructorById = new Map(instructors.map((instructor) => [instructor.id, instructor]));
      return rows
        .filter((row) => row.instructorId !== null)
        .map((row) => ({
          instructorId: row.instructorId!,
          instructorName: instructorById.has(row.instructorId!)
            ? resolveLocalizedText(instructorById.get(row.instructorId!)!.name, locale)
            : row.instructorId!,
          currency: row.currency,
          instructorRevenue: money(row.total),
          saleCount: row.saleCount,
        }));
    }, []);
  },

  /** Instructor-scoped monthly net revenue for the earnings chart. */
  async instructorMonthlySeries(instructorId: string, months: number): Promise<RevenueTimeBucket[]> {
    return safeRead(async () => {
      const since = new Date(new Date().getFullYear(), new Date().getMonth() - (months - 1), 1);
      const rows = await getDb()
        .select({
          bucket: sql<string>`to_char(date_trunc('month', ${revenueAllocations.createdAt}), 'YYYY-MM')`,
          currency: revenueAllocations.currency,
          total: sql<string>`coalesce(sum(${revenueAllocations.amount}) filter (where ${revenueAllocations.kind} <> 'adjustment'), 0)`,
        })
        .from(revenueAllocations)
        .where(
          and(
            eq(revenueAllocations.instructorId, instructorId),
            eq(revenueAllocations.recipientType, "instructor"),
            gte(revenueAllocations.createdAt, since),
          ),
        )
        .groupBy(sql`1`, revenueAllocations.currency)
        .orderBy(sql`1`);
      return rows.map((row) => ({
        bucket: row.bucket,
        currency: row.currency,
        grossRevenue: money(row.total),
        platformRevenue: "0.00",
        instructorRevenue: money(row.total),
      }));
    }, []);
  },

  /** How much each rule has allocated — the commission summary view. */
  async commissionSummary(): Promise<{ commissionRuleId: string; currency: string; totalAllocated: string; allocationCount: number }[]> {
    return safeRead(async () => {
      const rows = await getDb()
        .select({
          commissionRuleId: revenueAllocations.commissionRuleId,
          currency: revenueAllocations.currency,
          total: sql<string>`coalesce(sum(${revenueAllocations.amount}), 0)`,
          count: sql<number>`count(*)::int`,
        })
        .from(revenueAllocations)
        .where(isNotNull(revenueAllocations.commissionRuleId))
        .groupBy(revenueAllocations.commissionRuleId, revenueAllocations.currency);
      return rows
        .filter((row) => row.commissionRuleId !== null)
        .map((row) => ({
          commissionRuleId: row.commissionRuleId!,
          currency: row.currency,
          totalAllocated: money(row.total),
          allocationCount: row.count,
        }));
    }, []);
  },
};
