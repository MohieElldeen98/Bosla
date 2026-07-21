import { getTranslations } from "next-intl/server";
import { PageTitle } from "@/components/admin/PageTitle";
import { PaymentsManager } from "@/components/admin/payments/PaymentsManager";
import { PaymentService } from "@/payments/services/payment.service";
import { searchPaymentsSchema } from "@/payments/validators/payment.validator";
import type { Locale } from "@/i18n/routing";

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * `/admin/payments` — the Payment Platform's dashboard
 * (docs/payment-platform.md §Administration): every payment attempt
 * across every provider, URL-driven search/filter/sort/pagination,
 * mirroring `/admin/orders`'s exact shell. Permissions are enforced by
 * `(admin)/layout.tsx` for the route; the money-moving mutations
 * re-check via `requirePaymentManagementAccess` regardless.
 */
export default async function AdminPaymentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const rawSearchParams = await searchParams;

  const parsed = searchPaymentsSchema.safeParse({
    query: firstValue(rawSearchParams.q),
    status: firstValue(rawSearchParams.status),
    provider: firstValue(rawSearchParams.provider),
    sortBy: firstValue(rawSearchParams.sortBy),
    sortDirection: firstValue(rawSearchParams.sortDir),
    page: firstValue(rawSearchParams.page),
    pageSize: firstValue(rawSearchParams.pageSize),
  });
  const filters = parsed.success ? parsed.data : {};

  const [tNav, result] = await Promise.all([
    getTranslations("Admin.nav.payments"),
    PaymentService.searchResolved(filters, locale as Locale),
  ]);

  return (
    <div className="space-y-6">
      <PageTitle title={tNav("label")} description={tNav("description")} />
      <PaymentsManager result={result} filters={filters} />
    </div>
  );
}
