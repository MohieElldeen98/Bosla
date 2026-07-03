import { getTranslations } from "next-intl/server";
import { PageTitle } from "@/components/admin/PageTitle";
import { InstructorCouponsManager } from "@/components/instructor/coupons/InstructorCouponsManager";
import { SessionService } from "@/auth/services/session.service";
import { CouponService } from "@/commerce/services/coupon.service";
import { searchCouponsSchema } from "@/commerce/validators/coupon.validator";
import type { Locale } from "@/i18n/routing";

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** `/instructor/coupons` — the Instructor Coupons listing (Phase 6, Step
 *  6.6). Mirrors `/admin/coupons`'s exact shell (server-side pagination/
 *  search/filter, URL-driven), scoped to the signed-in Instructor's own
 *  courses via `CouponService.listOwnByInstructor`. */
export default async function InstructorCouponsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const rawSearchParams = await searchParams;
  const user = await SessionService.getCurrentUser();
  if (!user) return null;

  const parsed = searchCouponsSchema.safeParse({
    query: firstValue(rawSearchParams.q),
    isActive: firstValue(rawSearchParams.active),
    sortBy: firstValue(rawSearchParams.sortBy),
    sortDirection: firstValue(rawSearchParams.sortDir),
    page: firstValue(rawSearchParams.page),
    pageSize: firstValue(rawSearchParams.pageSize),
  });
  const filters = parsed.success ? parsed.data : {};

  const [t, result] = await Promise.all([
    getTranslations("Instructor.coupons"),
    CouponService.listOwnByInstructor(user, filters, locale as Locale),
  ]);

  return (
    <div className="space-y-6 px-6 py-12 lg:px-8">
      <PageTitle title={t("title")} description={t("description")} />
      <InstructorCouponsManager result={result} filters={filters} />
    </div>
  );
}
