import { getTranslations } from "next-intl/server";
import { PageTitle } from "@/components/admin/PageTitle";
import { CouponEditorForm } from "@/components/admin/coupons/CouponEditorForm";
import { CourseService } from "@/courses/services/course.service";
import { SpecialtyService } from "@/courses/services/specialty.service";
import type { Locale } from "@/i18n/routing";

export default async function AdminNewCouponPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [t, courseResult, specialties] = await Promise.all([
    getTranslations("Admin.coupons"),
    CourseService.searchResolved({ pageSize: 100 }, locale as Locale),
    SpecialtyService.listResolved(locale as Locale),
  ]);

  const courseOptions = courseResult.items.map((course) => ({ value: course.id, label: course.title }));
  const specialtyOptions = specialties.map((specialty) => ({ value: specialty.id, label: specialty.name }));

  return (
    <div className="space-y-6">
      <PageTitle title={t("createTitle")} description={t("createDescription")} />
      <CouponEditorForm mode="create" coupon={null} courses={courseOptions} specialties={specialtyOptions} />
    </div>
  );
}
