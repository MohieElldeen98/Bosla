import { getTranslations } from "next-intl/server";
import { PageTitle } from "@/components/admin/PageTitle";
import { EmptyState } from "@/components/admin/EmptyState";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { OrderRowActions } from "@/components/admin/orders/OrderRowActions";
import { BreadcrumbTrail } from "@/components/layout/breadcrumb-trail";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "@/i18n/navigation";
import { OrderService } from "@/commerce/services/order.service";
import { PaymentService } from "@/payments/services/payment.service";
import { SessionService } from "@/auth/services/session.service";
import type { Locale } from "@/i18n/routing";

function formatMoney(amount: string, currency: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(Number(amount));
  } catch {
    return `${amount} ${currency}`;
  }
}

function formatDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
}

/** `/admin/orders/[id]` — the "View order details" action (Phase 5,
 *  Step 5.1): a read-only detail view with the same Mark Paid/Cancel/
 *  Refund row action the listing uses, reused as-is. Extended with the
 *  Payment Lifecycle Hardening work: a Payment Attempts table (every
 *  attempt at this order, not just the latest) and the chronological
 *  Timeline (docs/payment-platform.md §Payment Attempts, §Timeline). */
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
  const [t, tFields, tAttempts, tTimeline, payments, timelineResult] = await Promise.all([
    getTranslations("Admin.orders"),
    getTranslations("Admin.orders.columns"),
    getTranslations("Admin.orders.attempts"),
    getTranslations("Admin.orders.timeline"),
    PaymentService.listByOrderId(id),
    actingUser ? OrderService.getTimeline(actingUser, id) : Promise.resolve(null),
  ]);
  const timeline = timelineResult?.success ? timelineResult.data : [];

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
          {Number(order.taxTotal) > 0 && (
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">{t("fields.tax")}</dt>
              <dd className="font-medium text-foreground">{formatMoney(order.taxTotal, order.currency, locale)}</dd>
            </div>
          )}
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
            <dd className="font-medium text-foreground">{formatDate(order.createdAt, locale)}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">{t("fields.updatedAt")}</dt>
            <dd className="font-medium text-foreground">{formatDate(order.updatedAt, locale)}</dd>
          </div>
        </dl>
      </div>

      <div className="rounded-2xl border border-border bg-card">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-sm font-semibold text-foreground">{tAttempts("title")}</h2>
          <p className="text-xs text-muted-foreground">{tAttempts("description")}</p>
        </div>
        {payments.length === 0 ? (
          <p className="px-6 py-8 text-sm text-muted-foreground">{tAttempts("empty")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tAttempts("columns.attempt")}</TableHead>
                <TableHead>{tAttempts("columns.status")}</TableHead>
                <TableHead>{tAttempts("columns.amount")}</TableHead>
                <TableHead>{tAttempts("columns.expiresAt")}</TableHead>
                <TableHead>{tAttempts("columns.providerReference")}</TableHead>
                <TableHead>{tAttempts("columns.createdAt")}</TableHead>
                <TableHead>
                  <span className="sr-only">{tAttempts("columns.actions")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-medium text-foreground">
                    {tAttempts("attemptNumber", { number: payment.attemptNumber })}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={payment.status}>{t(`paymentStatus.${payment.status}`)}</StatusBadge>
                    {payment.failureReason && (
                      <p className="mt-0.5 text-xs text-muted-foreground">{payment.failureReason}</p>
                    )}
                    {payment.abandonedReason && (
                      <p className="mt-0.5 text-xs text-muted-foreground">{payment.abandonedReason}</p>
                    )}
                  </TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {formatMoney(payment.amount, payment.currency, locale)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {payment.status === "pending" ? formatDate(payment.expiresAt, locale) : "—"}
                  </TableCell>
                  <TableCell className="max-w-[10rem] truncate font-mono text-xs text-muted-foreground" title={payment.providerPaymentId ?? undefined}>
                    {payment.providerPaymentId ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(payment.createdAt, locale)}</TableCell>
                  <TableCell>
                    <Link
                      href={`/admin/payments/${payment.id}`}
                      className="text-sm font-medium text-primary underline-offset-2 hover:underline"
                    >
                      {tAttempts("view")}
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-1 text-sm font-semibold text-foreground">{tTimeline("title")}</h2>
        <p className="mb-4 text-xs text-muted-foreground">{tTimeline("description")}</p>
        {timeline.length === 0 ? (
          <p className="text-sm text-muted-foreground">{tTimeline("empty")}</p>
        ) : (
          <ol className="space-y-3 border-s border-border ps-4">
            {timeline.map((event) => (
              <li key={event.id} className="relative">
                <span className="absolute -start-[1.4rem] top-1.5 size-2 rounded-full bg-primary" aria-hidden="true" />
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <span className="font-mono text-xs font-medium text-foreground">{event.action}</span>
                  <span className="text-xs text-muted-foreground">{formatDate(event.createdAt, locale)}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {event.message ?? tTimeline(`actorTypeFallback.${event.actorType}`)}
                </p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
