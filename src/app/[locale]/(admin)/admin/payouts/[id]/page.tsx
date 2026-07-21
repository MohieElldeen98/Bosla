import { getTranslations } from "next-intl/server";
import { PageTitle } from "@/components/admin/PageTitle";
import { EmptyState } from "@/components/admin/EmptyState";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { BreadcrumbTrail } from "@/components/layout/breadcrumb-trail";
import { PayoutBatchActions } from "@/components/admin/payouts/PayoutBatchActions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PayoutService } from "@/commerce/payouts/payout.service";
import type { Locale } from "@/i18n/routing";

function formatMoney(amount: string, currency: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(Number(amount));
  } catch {
    return `${amount} ${currency}`;
  }
}

/** `/admin/payouts/[id]` — one batch's items (who gets how much, to
 *  which declared account) and its lifecycle actions. */
export default async function AdminPayoutBatchPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;
  const [t, resolved] = await Promise.all([
    getTranslations("Admin.payouts"),
    PayoutService.getBatchResolved(id, locale as Locale),
  ]);

  if (!resolved) {
    const tEmpty = await getTranslations("Admin.emptyState");
    return <EmptyState title={tEmpty("defaultTitle")} description={tEmpty("defaultDescription")} />;
  }
  const { batch, items } = resolved;

  return (
    <div className="space-y-6">
      <BreadcrumbTrail segments={[{ label: batch.id.slice(0, 8) }]} />
      <PageTitle
        title={t("detailTitle", { ref: batch.id.slice(0, 8) })}
        description={`${formatMoney(batch.totalAmount, batch.currency, locale)} · ${t(`status.${batch.status}`)}`}
        actions={<PayoutBatchActions batch={batch} />}
      />

      <div className="rounded-2xl border border-border bg-card">
        {items.length === 0 ? (
          <div className="p-4 sm:p-6">
            <EmptyState title={t("itemsEmptyTitle")} description={t("itemsEmptyDescription")} />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.instructor")}</TableHead>
                <TableHead>{t("columns.account")}</TableHead>
                <TableHead>{t("columns.amount")}</TableHead>
                <TableHead>{t("columns.status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium text-foreground">{item.instructorName}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {item.payoutAccountName ?? t("noAccount")}
                  </TableCell>
                  <TableCell className="tabular-nums font-medium text-foreground">
                    {formatMoney(item.amount, item.currency, locale)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={item.status}>{t(`status.${item.status}`)}</StatusBadge>
                    {item.failureReason && (
                      <p className="mt-1 text-xs text-destructive">{item.failureReason}</p>
                    )}
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
