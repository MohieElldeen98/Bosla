import { getTranslations } from "next-intl/server";
import { PageTitle } from "@/components/admin/PageTitle";
import { EmptyState } from "@/components/admin/EmptyState";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SessionService } from "@/auth/services/session.service";
import { OrderService } from "@/commerce/services/order.service";
import type { Locale } from "@/i18n/routing";

/**
 * `/instructor/earnings` (Phase 6, Step 6.6) — read-only, `paid` orders
 * only, no payout figure (payout automation is deliberately deferred —
 * see `InstructorEarningsSummary`'s doc comment). A course with zero
 * paid orders doesn't get a row — nothing to show yet, matching
 * `OrderService.getOwnEarningsSummary`'s own filtering.
 */
export default async function InstructorEarningsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await SessionService.getCurrentUser();
  if (!user) return null;

  const [t, summary] = await Promise.all([
    getTranslations("Instructor.earnings"),
    OrderService.getOwnEarningsSummary(user, locale as Locale),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-12 lg:px-8">
      <PageTitle title={t("title")} description={t("description")} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card size="sm">
          <CardHeader>
            <CardDescription>{t("totalRevenue")}</CardDescription>
            <CardTitle className="text-2xl">${summary.totalRevenue}</CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>{t("totalOrders")}</CardDescription>
            <CardTitle className="text-2xl">{summary.totalPaidOrders}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">{t("payoutNotice")}</p>

      <div className="rounded-2xl border border-border bg-card">
        {summary.courses.length === 0 ? (
          <div className="p-4 sm:p-6">
            <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.course")}</TableHead>
                <TableHead>{t("columns.orders")}</TableHead>
                <TableHead>{t("columns.revenue")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summary.courses.map((course) => (
                <TableRow key={course.courseId}>
                  <TableCell className="font-medium text-foreground">{course.courseTitle}</TableCell>
                  <TableCell className="text-muted-foreground">{course.paidOrderCount}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {course.totalRevenue} {course.currency}
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
