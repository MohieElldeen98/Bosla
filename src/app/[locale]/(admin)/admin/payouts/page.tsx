import { getTranslations } from "next-intl/server";
import { PageTitle } from "@/components/admin/PageTitle";
import { PayoutsManager } from "@/components/admin/payouts/PayoutsManager";
import { PayoutService } from "@/commerce/payouts/payout.service";
import { PAYOUT_STATUSES } from "@/commerce/types/revenue";
import type { PayoutStatus } from "@/commerce/types/revenue";

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** `/admin/payouts` — batch list (status-filterable) + "create batch."
 *  No transfer provider is integrated: a batch is the work order an
 *  admin executes out-of-band, then marks paid/failed here. */
export default async function AdminPayoutsPage({
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const rawSearchParams = await searchParams;
  const statusParam = firstValue(rawSearchParams.status);
  const status = (PAYOUT_STATUSES as readonly string[]).includes(statusParam ?? "")
    ? (statusParam as PayoutStatus)
    : undefined;

  const [tNav, batches] = await Promise.all([
    getTranslations("Admin.nav.payouts"),
    PayoutService.listBatches(status),
  ]);

  return (
    <div className="space-y-6">
      <PageTitle title={tNav("label")} description={tNav("description")} />
      <PayoutsManager batches={batches} statusFilter={status} />
    </div>
  );
}
