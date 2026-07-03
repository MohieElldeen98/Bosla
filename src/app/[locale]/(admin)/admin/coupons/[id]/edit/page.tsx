import { getTranslations } from "next-intl/server";
import { PageTitle } from "@/components/admin/PageTitle";
import { EmptyState } from "@/components/admin/EmptyState";
import { CouponEditorForm } from "@/components/admin/coupons/CouponEditorForm";
import { CouponService } from "@/commerce/services/coupon.service";
import { CourseService } from "@/courses/services/course.service";
import { SpecialtyService } from "@/courses/services/specialty.service";
import type { Locale } from "@/i18n/routing";

export default async function AdminEditCouponPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;
  const coupon = await CouponService.getById(id);

  if (!coupon) {
    const t = await getTranslations("Admin.emptyState");
    return <EmptyState title={t("defaultTitle")} description={t("defaultDescription")} />;
  }

  const [t, courseResult, specialties] = await Promise.all([
    getTranslations("Admin.coupons"),
    CourseService.searchResolved({ pageSize: 100 }, locale as Locale),
    SpecialtyService.listResolved(locale as Locale),
  ]);

  const courseOptions = courseResult.items.map((course) => ({ value: course.id, label: course.title }));
  const specialtyOptions = specialties.map((specialty) => ({ value: specialty.id, label: specialty.name }));

  return (
    <div className="space-y-6">
      <PageTitle title={t("editTitle", { code: coupon.code })} description={t("editDescription")} />
      <CouponEditorForm mode="edit" coupon={coupon} courses={courseOptions} specialties={specialtyOptions} />
    </div>
  );
}
