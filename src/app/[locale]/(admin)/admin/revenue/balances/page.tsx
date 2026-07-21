import { getTranslations } from "next-intl/server";
import { PageTitle } from "@/components/admin/PageTitle";
import { BalancesManager } from "@/components/admin/revenue/BalancesManager";
import { RevenueService } from "@/commerce/revenue/revenue.service";
import type { Locale } from "@/i18n/routing";

/** `/admin/revenue/balances` — every instructor's pending/available/
 *  paid/lifetime figures (the maturation sweep runs on read, so
 *  "available" is always current), plus the manual-adjustment form. */
export default async function AdminBalancesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [t, balances] = await Promise.all([
    getTranslations("Admin.revenue.balances"),
    RevenueService.listBalancesResolved(locale as Locale),
  ]);

  return (
    <div className="space-y-6">
      <PageTitle title={t("title")} description={t("description")} />
      <BalancesManager balances={balances} />
    </div>
  );
}
