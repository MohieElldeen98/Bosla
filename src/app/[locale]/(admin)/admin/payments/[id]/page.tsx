import { getTranslations } from "next-intl/server";
import { PageTitle } from "@/components/admin/PageTitle";
import { EmptyState } from "@/components/admin/EmptyState";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { BreadcrumbTrail } from "@/components/layout/breadcrumb-trail";
import { PaymentDetailActions } from "@/components/admin/payments/PaymentDetailActions";
import { Link } from "@/i18n/navigation";
import { PaymentService } from "@/payments/services/payment.service";
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

/** `/admin/payments/[id]` — one payment's full story: identifiers,
 *  amounts, the refund history, and the immutable webhook event log
 *  (payloads stay in the DB; this shows type/verification/processing
 *  outcome per delivery). */
export default async function AdminPaymentDetailPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;
  const result = await PaymentService.getResolvedById(id, locale as Locale);

  if (!result.success) {
    const t = await getTranslations("Admin.emptyState");
    return <EmptyState title={t("defaultTitle")} description={t("defaultDescription")} />;
  }

  const { payment, events, refunds, capabilities } = result.data;
  const t = await getTranslations("Admin.payments");

  const identityRows: [string, string][] = [
    [t("fields.paymentId"), payment.id],
    [t("fields.orderId"), payment.orderId],
    [t("fields.provider"), payment.provider],
    [t("fields.providerPaymentId"), payment.providerPaymentId ?? "—"],
    [t("fields.providerTransactionId"), payment.providerTransactionId ?? "—"],
    [t("fields.paymentMethod"), payment.paymentMethod ?? "—"],
    [t("fields.verifiedAt"), payment.verifiedAt ? formatDate(payment.verifiedAt, locale) : "—"],
    [t("fields.createdAt"), formatDate(payment.createdAt, locale)],
  ];

  return (
    <div className="space-y-6">
      <BreadcrumbTrail segments={[{ label: payment.studentName || payment.id.slice(0, 8) }]} />
      <PageTitle
        title={t("detailTitle", { name: payment.studentName || payment.id.slice(0, 8) })}
        description={payment.courseTitle}
        actions={<PaymentDetailActions payment={payment} capabilities={capabilities} />}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="mb-4 text-sm font-semibold text-foreground">{t("sections.summary")}</h2>
          <dl className="space-y-4 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">{t("columns.status")}</dt>
              <dd>
                <StatusBadge status={payment.status}>{t(`status.${payment.status}`)}</StatusBadge>
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">{t("columns.amount")}</dt>
              <dd className="font-semibold text-foreground">{formatMoney(payment.amount, payment.currency, locale)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">{t("fields.capturedAmount")}</dt>
              <dd className="font-medium text-foreground">
                {formatMoney(payment.capturedAmount, payment.currency, locale)}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">{t("fields.refundedAmount")}</dt>
              <dd className="font-medium text-foreground">
                {formatMoney(payment.refundedAmount, payment.currency, locale)}
              </dd>
            </div>
            <div className="flex items-center justify-between border-t border-border pt-4">
              <dt className="text-muted-foreground">{t("columns.student")}</dt>
              <dd className="text-end font-medium text-foreground">
                {payment.studentName}
                {payment.studentEmail && (
                  <span className="block text-xs font-normal text-muted-foreground">{payment.studentEmail}</span>
                )}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">{t("fields.order")}</dt>
              <dd>
                <Link
                  href={`/admin/orders/${payment.orderId}`}
                  className="text-sm font-medium text-primary underline-offset-2 hover:underline"
                >
                  {t("fields.viewOrder")}
                </Link>
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="mb-4 text-sm font-semibold text-foreground">{t("sections.identifiers")}</h2>
          <dl className="space-y-3 text-sm">
            {identityRows.map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-4">
                <dt className="shrink-0 text-muted-foreground">{label}</dt>
                <dd className="truncate font-mono text-xs text-foreground" title={value}>
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-4 text-sm font-semibold text-foreground">{t("sections.refunds")}</h2>
        {refunds.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("refund.empty")}</p>
        ) : (
          <ul className="space-y-3">
            {refunds.map((refund) => (
              <li key={refund.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                <span className="font-medium text-foreground">
                  {formatMoney(refund.amount, refund.currency, locale)}
                </span>
                <StatusBadge status={refund.status === "succeeded" ? "refunded" : refund.status}>
                  {t(`refundStatus.${refund.status}`)}
                </StatusBadge>
                <span className="text-muted-foreground">{refund.reason ?? "—"}</span>
                <span className="text-xs text-muted-foreground">{formatDate(refund.createdAt, locale)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-4 text-sm font-semibold text-foreground">{t("sections.events")}</h2>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("events.empty")}</p>
        ) : (
          <ul className="space-y-3">
            {events.map((event) => (
              <li key={event.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                <span className="font-mono text-xs text-foreground">{event.eventType}</span>
                <span className={event.signatureVerified ? "text-emerald-600" : "text-destructive"}>
                  {event.signatureVerified ? t("events.verified") : t("events.unverified")}
                </span>
                <span className="text-muted-foreground">
                  {event.processingError ? event.processingError : t("events.processedOk")}
                </span>
                <span className="text-xs text-muted-foreground">{formatDate(event.createdAt, locale)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
