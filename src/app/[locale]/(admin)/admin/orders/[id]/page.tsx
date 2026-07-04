import { getTranslations } from "next-intl/server";
import { PageTitle } from "@/components/admin/PageTitle";
import { EmptyState } from "@/components/admin/EmptyState";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { OrderRowActions } from "@/components/admin/orders/OrderRowActions";
import { BreadcrumbTrail } from "@/components/layout/breadcrumb-trail";
import { OrderService } from "@/commerce/services/order.service";
import { SessionService } from "@/auth/services/session.service";
import type { Locale } from "@/i18n/routing";

function formatMoney(amount: string, currency: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(Number(amount));
  } catch {
    return `${amount} ${currency}`;
  }
}

/** `/admin/orders/[id]` — the "View order details" action (Phase 5,
 *  Step 5.1): a read-only detail view with the same Mark Paid/Cancel/
 *  Refund row action the listing uses, reused as-is. */
export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;
  const actingUser = await SessionService.getCurrentUser();
  const result = actingUser
    ? await OrderService.getResolvedById(actingUser, id, locale as Locale)
    : { success: false as const, code: "forbidden" as const, message: "You must be signed in." };

  if (!result.success) {
    const t = await getTranslations("Admin.emptyState");
    return <EmptyState title={t("defaultTitle")} description={t("defaultDescription")} />;
  }

  const order = result.data;
  const [t, tFields] = await Promise.all([
    getTranslations("Admin.orders"),
    getTranslations("Admin.orders.columns"),
  ]);

  return (
    <div className="space-y-6">
      <BreadcrumbTrail segments={[{ label: order.studentName }]} />
      <PageTitle
        title={t("detailTitle", { name: order.studentName })}
        description={order.courseTitle}
        actions={<OrderRowActions order={order} />}
      />

      <div className="max-w-lg rounded-2xl border border-border bg-card p-6">
        <dl className="space-y-4 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">{tFields("student")}</dt>
            <dd className="text-end font-medium text-foreground">
              {order.studentName}
              {order.studentEmail && <span className="block text-xs font-normal text-muted-foreground">{order.studentEmail}</span>}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">{tFields("course")}</dt>
            <dd className="font-medium text-foreground">{order.courseTitle}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">{t("fields.subtotal")}</dt>
            <dd className="font-medium text-foreground">{formatMoney(order.subtotal, order.currency, locale)}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">{t("fields.discount")}</dt>
            <dd className="font-medium text-foreground">
              {formatMoney(order.discountTotal, order.currency, locale)}
              {order.couponCode && <span className="ms-1 text-xs text-muted-foreground">({order.couponCode})</span>}
            </dd>
          </div>
          <div className="flex items-center justify-between border-t border-border pt-4">
            <dt className="text-muted-foreground">{tFields("total")}</dt>
            <dd className="font-semibold text-foreground">{formatMoney(order.total, order.currency, locale)}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">{tFields("status")}</dt>
            <dd>
              <StatusBadge status={order.status}>{t(`status.${order.status}`)}</StatusBadge>
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">{tFields("payment")}</dt>
            <dd className="font-medium text-foreground">
              {order.latestPaymentStatus ? t(`paymentStatus.${order.latestPaymentStatus}`) : t("paymentStatus.none")}
            </dd>
          </div>
          <div className="flex items-center justify-between border-t border-border pt-4">
            <dt className="text-muted-foreground">{tFields("createdAt")}</dt>
            <dd className="font-medium text-foreground">
              {new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(order.createdAt))}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">{t("fields.updatedAt")}</dt>
            <dd className="font-medium text-foreground">
              {new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(order.updatedAt))}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
