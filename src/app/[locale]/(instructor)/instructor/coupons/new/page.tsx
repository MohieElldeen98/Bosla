import { getTranslations } from "next-intl/server";
import { PageTitle } from "@/components/admin/PageTitle";
import { InstructorCouponEditorForm } from "@/components/instructor/coupons/InstructorCouponEditorForm";
import { SessionService } from "@/auth/services/session.service";
import { CourseService } from "@/courses/services/course.service";
import type { Locale } from "@/i18n/routing";

export default async function InstructorNewCouponPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await SessionService.getCurrentUser();
  if (!user) return null;

  const [t, courseResult] = await Promise.all([
    getTranslations("Instructor.coupons"),
    CourseService.searchResolvedForInstructor(user, { pageSize: 100 }, locale as Locale),
  ]);
  const courseOptions = courseResult.items.map((course) => ({ value: course.id, label: course.title }));

  return (
    <div className="space-y-6 px-6 py-12 lg:px-8">
      <PageTitle title={t("createTitle")} description={t("createDescription")} />
      <InstructorCouponEditorForm mode="create" coupon={null} courses={courseOptions} />
    </div>
  );
}
