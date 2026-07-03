import { getTranslations } from "next-intl/server";
import { PageTitle } from "@/components/admin/PageTitle";
import { EmptyState } from "@/components/admin/EmptyState";
import { InstructorCouponEditorForm } from "@/components/instructor/coupons/InstructorCouponEditorForm";
import { SessionService } from "@/auth/services/session.service";
import { CouponService } from "@/commerce/services/coupon.service";
import { CourseService } from "@/courses/services/course.service";
import type { Locale } from "@/i18n/routing";

/** `/instructor/coupons/[id]/edit` — gated the same "collapse
 *  not-found and not-yours into the same generic empty state" way
 *  `/instructor/courses/[id]/edit` (Step 6.3) already is: a coupon that
 *  doesn't exist, or exists but isn't `scope: "course"` on one of this
 *  Instructor's own courses, renders identically. */
export default async function InstructorEditCouponPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;
  const user = await SessionService.getCurrentUser();
  if (!user) return null;

  const tEmpty = await getTranslations("Admin.emptyState");
  const notFound = <EmptyState title={tEmpty("defaultTitle")} description={tEmpty("defaultDescription")} />;

  const coupon = await CouponService.getById(id);
  if (!coupon || coupon.scope !== "course" || !coupon.scopeId) return notFound;

  const ownCourse = await CourseService.getOwnById(user, coupon.scopeId);
  if (!ownCourse) return notFound;

  const [t, courseResult] = await Promise.all([
    getTranslations("Instructor.coupons"),
    CourseService.searchResolvedForInstructor(user, { pageSize: 100 }, locale as Locale),
  ]);
  const courseOptions = courseResult.items.map((course) => ({ value: course.id, label: course.title }));

  return (
    <div className="space-y-6 px-6 py-12 lg:px-8">
      <PageTitle title={t("editTitle", { code: coupon.code })} description={t("editDescription")} />
      <InstructorCouponEditorForm mode="edit" coupon={coupon} courses={courseOptions} />
    </div>
  );
}
