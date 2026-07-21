import { getTranslations } from "next-intl/server";
import { PageTitle } from "@/components/admin/PageTitle";
import { AllocationsManager } from "@/components/admin/revenue/AllocationsManager";
import { RevenueService } from "@/commerce/revenue/revenue.service";
import { searchAllocationsSchema } from "@/commerce/validators/revenue.validator";
import type { Locale } from "@/i18n/routing";

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** `/admin/revenue/allocations` — the raw ledger, filterable by kind/
 *  status/recipient, URL-driven like every other admin listing. */
export default async function AdminAllocationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const rawSearchParams = await searchParams;

  const parsed = searchAllocationsSchema.safeParse({
    orderId: firstValue(rawSearchParams.orderId),
    instructorId: firstValue(rawSearchParams.instructorId),
    recipientType: firstValue(rawSearchParams.recipient),
    kind: firstValue(rawSearchParams.kind),
    status: firstValue(rawSearchParams.status),
    page: firstValue(rawSearchParams.page),
    pageSize: firstValue(rawSearchParams.pageSize),
  });
  const filters = parsed.success ? parsed.data : {};

  const [t, result] = await Promise.all([
    getTranslations("Admin.revenue.allocations"),
    RevenueService.searchAllocationsResolved(filters, locale as Locale),
  ]);

  return (
    <div className="space-y-6">
      <PageTitle title={t("title")} description={t("description")} />
      <AllocationsManager result={result} filters={filters} />
    </div>
  );
}
