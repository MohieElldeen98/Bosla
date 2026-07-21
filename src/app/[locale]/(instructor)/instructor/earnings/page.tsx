import { getTranslations } from "next-intl/server";
import { Wallet, Hourglass, Banknote, TrendingUp } from "lucide-react";
import { PageTitle } from "@/components/admin/PageTitle";
import { EmptyState } from "@/components/admin/EmptyState";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { RevenueStatCard } from "@/components/admin/revenue/RevenueStatCard";
import { RevenueBarChart } from "@/components/charts/RevenueBarChart";
import { PayoutAccountSection } from "@/components/instructor/PayoutAccountSection";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SessionService } from "@/auth/services/session.service";
import { OrderService } from "@/commerce/services/order.service";
import { RevenueService } from "@/commerce/revenue/revenue.service";
import { PayoutService } from "@/commerce/payouts/payout.service";
import type { Locale } from "@/i18n/routing";

function formatMoney(amount: string, currency: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(Number(amount));
  } catch {
    return `${amount} ${currency}`;
  }
}

/**
 * `/instructor/earnings` — the Revenue Platform's instructor dashboard:
 * real ledger-backed balances (pending / available / paid / lifetime,
 * with refund adjustments), a 6-month revenue chart, recent sales
 * (each row an immutable allocation), payout history, the payout
 * account declaration, and the per-course gross revenue table. Always
 * the signed-in Instructor's own data
 * (`RevenueService.getOwnEarningsOverview`).
 */
export default async function InstructorEarningsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await SessionService.getCurrentUser();
  if (!user) return null;

  const [t, overview, accounts, courseSummary] = await Promise.all([
    getTranslations("Instructor.earnings"),
    RevenueService.getOwnEarningsOverview(user, locale as Locale),
    PayoutService.listOwnAccounts(user),
    OrderService.getOwnEarningsSummary(user, locale as Locale),
  ]);

  if (!overview) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 px-6 py-12 lg:px-8">
        <PageTitle title={t("title")} description={t("description")} />
        <EmptyState title={t("notLinkedTitle")} description={t("notLinkedDescription")} />
      </div>
    );
  }

  const primaryBalance = overview.balances[0] ?? null;
  const chartData = primaryBalance
    ? overview.monthlyRevenue
        .filter((bucket) => bucket.currency === primaryBalance.currency)
        .map((bucket) => ({ label: bucket.bucket, value: Number(bucket.instructorRevenue) }))
    : [];

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-6 py-12 lg:px-8">
      <PageTitle title={t("title")} description={t("description")} />

      {overview.balances.length === 0 ? (
        <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
      ) : (
        overview.balances.map((balance) => (
          <section key={balance.id} className="space-y-4">
            {overview.balances.length > 1 && (
              <h2 className="text-sm font-semibold text-muted-foreground">{balance.currency}</h2>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <RevenueStatCard
                label={t("cards.available")}
                value={formatMoney(balance.availableBalance, balance.currency, locale)}
                support={t("cards.availableHint")}
                icon={Wallet}
              />
              <RevenueStatCard
                label={t("cards.pending")}
                value={formatMoney(balance.pendingBalance, balance.currency, locale)}
                support={t("cards.pendingHint")}
                icon={Hourglass}
              />
              <RevenueStatCard
                label={t("cards.paid")}
                value={formatMoney(balance.paidBalance, balance.currency, locale)}
                icon={Banknote}
              />
              <RevenueStatCard
                label={t("cards.lifetime")}
                value={formatMoney(balance.lifetimeEarnings, balance.currency, locale)}
                support={
                  Number(balance.refundAdjustments) > 0
                    ? t("cards.refundsHint", {
                        amount: formatMoney(balance.refundAdjustments, balance.currency, locale),
                      })
                    : undefined
                }
                icon={TrendingUp}
              />
            </div>
          </section>
        ))
      )}

      {primaryBalance && chartData.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="mb-4 text-sm font-semibold text-foreground">
            {t("chartTitle", { currency: primaryBalance.currency })}
          </h2>
          <RevenueBarChart
            title={t("chartTitle", { currency: primaryBalance.currency })}
            data={chartData}
            currency={primaryBalance.currency}
            locale={locale}
          />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card">
          <h2 className="border-b border-border px-6 py-4 text-sm font-semibold text-foreground">{t("recentSales")}</h2>
          {overview.recentAllocations.length === 0 ? (
            <p className="px-6 py-8 text-sm text-muted-foreground">{t("recentSalesEmpty")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("columns.course")}</TableHead>
                  <TableHead>{t("columns.amount")}</TableHead>
                  <TableHead>{t("columns.date")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overview.recentAllocations.map((allocation) => (
                  <TableRow key={allocation.id}>
                    <TableCell>
                      <p className="truncate font-medium text-foreground">{allocation.courseTitle}</p>
                      {allocation.kind !== "sale" && (
                        <p className="text-xs text-muted-foreground">{t(`kind.${allocation.kind}`)}</p>
                      )}
                    </TableCell>
                    <TableCell
                      className={`tabular-nums ${Number(allocation.amount) < 0 ? "text-destructive" : "text-foreground"}`}
                    >
                      {formatMoney(allocation.amount, allocation.currency, locale)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(allocation.createdAt))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card">
          <h2 className="border-b border-border px-6 py-4 text-sm font-semibold text-foreground">{t("payouts")}</h2>
          {overview.payoutItems.length === 0 ? (
            <p className="px-6 py-8 text-sm text-muted-foreground">{t("payoutsEmpty")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("columns.amount")}</TableHead>
                  <TableHead>{t("columns.status")}</TableHead>
                  <TableHead>{t("columns.date")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overview.payoutItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="tabular-nums font-medium text-foreground">
                      {formatMoney(item.amount, item.currency, locale)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={item.status}>{t(`payoutStatus.${item.status}`)}</StatusBadge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(item.createdAt))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <PayoutAccountSection accounts={accounts} />

      <div className="rounded-2xl border border-border bg-card">
        <h2 className="border-b border-border px-6 py-4 text-sm font-semibold text-foreground">{t("byCourse")}</h2>
        {courseSummary.courses.length === 0 ? (
          <p className="px-6 py-8 text-sm text-muted-foreground">{t("emptyDescription")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.course")}</TableHead>
                <TableHead>{t("columns.orders")}</TableHead>
                <TableHead>{t("columns.grossRevenue")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courseSummary.courses.map((course) => (
                <TableRow key={course.courseId}>
                  <TableCell className="font-medium text-foreground">{course.courseTitle}</TableCell>
                  <TableCell className="text-muted-foreground">{course.paidOrderCount}</TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {formatMoney(course.totalRevenue, course.currency, locale)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
