import { getLocale, getTranslations } from "next-intl/server";
import { Receipt } from "lucide-react";
import { listMyOrdersAction } from "@/commerce/actions/order.actions";
import { PageTitle } from "@/components/admin/PageTitle";
import { EmptyState } from "@/components/admin/EmptyState";
import { ErrorState } from "@/components/admin/ErrorState";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Locale } from "@/i18n/routing";

function formatMoney(amount: string, currency: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(Number(amount));
  } catch {
    return `${amount} ${currency}`;
  }
}

/**
 * `/me/orders` — "Orders & Billing", relocated from `/dashboard/orders`
 * as-is (linked from the Overview tab, not a workspace tab itself —
 * billing isn't frequent enough to earn one). Reads through
 * `listMyOrdersAction` → `OrderService.listForStudent`, always the
 * signed-in user's own orders.
 */
export default async function WorkspaceOrdersPage() {
  const locale = await getLocale();
  const t = await getTranslations("Dashboard.orders");

  const result = await listMyOrdersAction(locale as Locale);

  if (!result.success) {
    return (
      <div className="space-y-6">
        <PageTitle title={t("title")} description={t("description")} />
        <ErrorState title={t("errorTitle")} description={result.message} />
      </div>
    );
  }

  const orders = result.data;

  return (
    <div className="space-y-6">
      <PageTitle title={t("title")} description={t("description")} />

      {orders.length === 0 ? (
        <EmptyState icon={Receipt} title={t("emptyTitle")} description={t("emptyDescription")} />
      ) : (
        <div className="rounded-2xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.course")}</TableHead>
                <TableHead>{t("columns.date")}</TableHead>
                <TableHead>{t("columns.total")}</TableHead>
                <TableHead>{t("columns.status")}</TableHead>
                <TableHead>{t("columns.payment")}</TableHead>
                <TableHead>
                  <span className="sr-only">{t("columns.invoice")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{order.courseTitle}</p>
                      {order.couponCode && (
                        <p className="truncate text-xs text-muted-foreground">{t("couponApplied", { code: order.couponCode })}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(order.createdAt))}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatMoney(order.total, order.currency, locale)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={order.status}>{t(`status.${order.status}`)}</StatusBadge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {order.latestPaymentStatus ? t(`paymentStatus.${order.latestPaymentStatus}`) : t("paymentStatus.none")}
                  </TableCell>
                  <TableCell>
                    {order.invoiceId && (
                      <a
                        href={`/api/payments/invoices/${order.invoiceId}/pdf`}
                        className="text-sm font-medium text-primary underline-offset-2 hover:underline"
                      >
                        {t("downloadInvoice")}
                      </a>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
