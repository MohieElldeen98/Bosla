import { getTranslations } from "next-intl/server";
import { Banknote, Landmark, RotateCcw, ShoppingCart } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { PageTitle } from "@/components/admin/PageTitle";
import { EmptyState } from "@/components/admin/EmptyState";
import { RevenueStatCard } from "@/components/admin/revenue/RevenueStatCard";
import { RevenueBarChart } from "@/components/charts/RevenueBarChart";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RevenueReportService } from "@/commerce/reports/revenue-report.service";
import type { Locale } from "@/i18n/routing";

function formatMoney(amount: string, currency: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(Number(amount));
  } catch {
    return `${amount} ${currency}`;
  }
}

/**
 * `/admin/revenue` — the Revenue Platform's overview
 * (docs/revenue-platform.md §Administration): per-currency summary
 * tiles, the last 30 days as a chart, and the top courses/instructors
 * leaderboards — every figure an aggregate over the immutable
 * `revenue_allocations` ledger. Deep-dives live on their own pages:
 * allocations, balances, payouts, commission rules.
 */
export default async function AdminRevenuePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [tNav, t, summaries, daily, topCourses, topInstructors] = await Promise.all([
    getTranslations("Admin.nav.revenue"),
    getTranslations("Admin.revenue"),
    RevenueReportService.summary(),
    RevenueReportService.timeSeries("day", 30),
    RevenueReportService.topCourses(5, locale as Locale),
    RevenueReportService.topInstructors(5, locale as Locale),
  ]);

  const currencies = summaries.map((summary) => summary.currency);
  const primaryCurrency = currencies[0] ?? null;
  const dailyForPrimary = primaryCurrency
    ? daily.filter((bucket) => bucket.currency === primaryCurrency)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageTitle title={tNav("label")} description={tNav("description")} />
        <div className="flex items-center gap-2 text-sm">
          <Link href="/admin/revenue/allocations" className="font-medium text-primary underline-offset-2 hover:underline">
            {t("links.allocations")}
          </Link>
          <span className="text-muted-foreground">·</span>
          <Link href="/admin/revenue/balances" className="font-medium text-primary underline-offset-2 hover:underline">
            {t("links.balances")}
          </Link>
        </div>
      </div>

      {summaries.length === 0 ? (
        <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
      ) : (
        summaries.map((summary) => (
          <section key={summary.currency} className="space-y-4">
            {summaries.length > 1 && (
              <h2 className="text-sm font-semibold text-muted-foreground">{summary.currency}</h2>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <RevenueStatCard
                label={t("cards.gross")}
                value={formatMoney(summary.grossRevenue, summary.currency, locale)}
                support={t("cards.orders", { count: summary.orderCount })}
                icon={ShoppingCart}
              />
              <RevenueStatCard
                label={t("cards.platform")}
                value={formatMoney(summary.platformRevenue, summary.currency, locale)}
                icon={Landmark}
              />
              <RevenueStatCard
                label={t("cards.instructors")}
                value={formatMoney(summary.instructorRevenue, summary.currency, locale)}
                icon={Banknote}
              />
              <RevenueStatCard
                label={t("cards.refunded")}
                value={formatMoney(summary.refundedTotal, summary.currency, locale)}
                support={t("cards.refundRate", { rate: summary.refundRatePercent })}
                icon={RotateCcw}
              />
            </div>
          </section>
        ))
      )}

      {primaryCurrency && dailyForPrimary.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="mb-4 text-sm font-semibold text-foreground">
            {t("chartTitle", { currency: primaryCurrency })}
          </h2>
          <RevenueBarChart
            title={t("chartTitle", { currency: primaryCurrency })}
            data={dailyForPrimary.map((bucket) => ({ label: bucket.bucket, value: Number(bucket.grossRevenue) }))}
            currency={primaryCurrency}
            locale={locale}
          />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card">
          <h2 className="border-b border-border px-6 py-4 text-sm font-semibold text-foreground">{t("topCourses")}</h2>
          {topCourses.length === 0 ? (
            <p className="px-6 py-8 text-sm text-muted-foreground">{t("emptyList")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("columns.course")}</TableHead>
                  <TableHead>{t("columns.sales")}</TableHead>
                  <TableHead>{t("columns.revenue")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topCourses.map((course) => (
                  <TableRow key={`${course.courseId}-${course.currency}`}>
                    <TableCell className="font-medium text-foreground">{course.courseTitle}</TableCell>
                    <TableCell className="text-muted-foreground">{course.saleCount}</TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {formatMoney(course.grossRevenue, course.currency, locale)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card">
          <h2 className="border-b border-border px-6 py-4 text-sm font-semibold text-foreground">{t("topInstructors")}</h2>
          {topInstructors.length === 0 ? (
            <p className="px-6 py-8 text-sm text-muted-foreground">{t("emptyList")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("columns.instructor")}</TableHead>
                  <TableHead>{t("columns.sales")}</TableHead>
                  <TableHead>{t("columns.earnings")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topInstructors.map((instructor) => (
                  <TableRow key={`${instructor.instructorId}-${instructor.currency}`}>
                    <TableCell className="font-medium text-foreground">{instructor.instructorName}</TableCell>
                    <TableCell className="text-muted-foreground">{instructor.saleCount}</TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {formatMoney(instructor.instructorRevenue, instructor.currency, locale)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
