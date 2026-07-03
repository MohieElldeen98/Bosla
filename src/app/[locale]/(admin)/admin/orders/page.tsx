import { getTranslations } from "next-intl/server";
import { PageTitle } from "@/components/admin/PageTitle";
import { OrdersManager } from "@/components/admin/orders/OrdersManager";
import { OrderService } from "@/commerce/services/order.service";
import { searchOrdersSchema } from "@/commerce/validators/order.validator";
import type { Locale } from "@/i18n/routing";

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * `/admin/orders` — the real admin Orders listing (Phase 5, Step 5.1).
 * Mirrors `/admin/enrollments`'s exact shell (Step 4.2): server-side
 * pagination/search/filter/sort, all URL-driven. Reads through
 * `OrderService.searchResolved` — no duplicated query logic. Permissions
 * are already enforced by `(admin)/layout.tsx` for every `/admin/*`
 * route; `OrderService`'s own mutations (`markPaid`/`cancel`/`refund`)
 * re-check regardless of which UI called them.
 */
export default async function AdminOrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const rawSearchParams = await searchParams;

  const parsed = searchOrdersSchema.safeParse({
    query: firstValue(rawSearchParams.q),
    status: firstValue(rawSearchParams.status),
    sortBy: firstValue(rawSearchParams.sortBy),
    sortDirection: firstValue(rawSearchParams.sortDir),
    page: firstValue(rawSearchParams.page),
    pageSize: firstValue(rawSearchParams.pageSize),
  });
  const filters = parsed.success ? parsed.data : {};

  const [tNav, result] = await Promise.all([
    getTranslations("Admin.nav.orders"),
    OrderService.searchResolved(filters, locale as Locale),
  ]);

  return (
    <div className="space-y-6">
      <PageTitle title={tNav("label")} description={tNav("description")} />
      <OrdersManager result={result} filters={filters} />
    </div>
  );
}
