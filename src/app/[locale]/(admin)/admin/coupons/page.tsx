import { getTranslations } from "next-intl/server";
import { PageTitle } from "@/components/admin/PageTitle";
import { CouponsManager } from "@/components/admin/coupons/CouponsManager";
import { CouponService } from "@/commerce/services/coupon.service";
import { searchCouponsSchema } from "@/commerce/validators/coupon.validator";
import type { Locale } from "@/i18n/routing";

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** `/admin/coupons` — the real admin Coupons listing (Phase 5, Step
 *  5.1). Mirrors `/admin/orders`'s/`/admin/enrollments`'s exact shell:
 *  server-side pagination/search/filter/sort, all URL-driven. */
export default async function AdminCouponsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const rawSearchParams = await searchParams;

  const parsed = searchCouponsSchema.safeParse({
    query: firstValue(rawSearchParams.q),
    scope: firstValue(rawSearchParams.scope),
    isActive: firstValue(rawSearchParams.active),
    sortBy: firstValue(rawSearchParams.sortBy),
    sortDirection: firstValue(rawSearchParams.sortDir),
    page: firstValue(rawSearchParams.page),
    pageSize: firstValue(rawSearchParams.pageSize),
  });
  const filters = parsed.success ? parsed.data : {};

  const [tNav, result] = await Promise.all([
    getTranslations("Admin.nav.coupons"),
    CouponService.searchResolved(filters, locale as Locale),
  ]);

  return (
    <div className="space-y-6">
      <PageTitle title={tNav("label")} description={tNav("description")} />
      <CouponsManager result={result} filters={filters} />
    </div>
  );
}
