import { getTranslations } from "next-intl/server";
import { Plus } from "lucide-react";
import { PageTitle } from "@/components/admin/PageTitle";
import { EmptyState } from "@/components/admin/EmptyState";
import { CourseWorkspaceHeader } from "@/components/instructor/course-workspace/CourseWorkspaceHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "@/i18n/navigation";
import { InstructorCouponRowActions } from "@/components/instructor/coupons/InstructorCouponRowActions";
import { SessionService } from "@/auth/services/session.service";
import { CourseService } from "@/courses/services/course.service";
import { CouponService } from "@/commerce/services/coupon.service";
import { resolveLocalizedText } from "@/cms/utils/resolve-localized";
import type { Locale } from "@/i18n/routing";

/**
 * `/instructor/courses/[id]/coupons` — the Course Workspace's Coupons
 * tab. Reuses `CouponService.searchResolved` directly (the same generic
 * method `CouponService.listOwnByInstructor` itself calls internally),
 * scoped with the exact `{ scope: "course", scopeIds: [id] }` filter
 * `listOwnByInstructor` already supports — no repository/service change.
 * Ownership is verified first via `CourseService.getOwnById` (the same
 * gate every other Course Workspace tab uses), so calling the generic
 * search directly here — bypassing `listOwnByInstructor`'s own "all of
 * my courses" resolution, which would be the wrong scope for this
 * single-course page — is still safe: this page independently confirms
 * the course actually belongs to the signed-in Instructor before ever
 * querying its coupons.
 */
export default async function InstructorCourseCouponsPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;
  const user = await SessionService.getCurrentUser();
  if (!user) return null;

  const course = await CourseService.getOwnById(user, id);
  if (!course) {
    const tEmpty = await getTranslations("Admin.emptyState");
    return <EmptyState title={tEmpty("defaultTitle")} description={tEmpty("defaultDescription")} />;
  }

  const [t, tCoupons, result] = await Promise.all([
    getTranslations("Instructor.courseWorkspace.coupons"),
    getTranslations("Instructor.coupons"),
    CouponService.searchResolved({ scope: "course", scopeIds: [course.id], pageSize: 50 }, locale as Locale),
  ]);

  const courseTitle = resolveLocalizedText(course.title, locale as Locale);
  const createCta = (
    <Button size="sm" nativeButton={false} render={<Link href="/instructor/coupons/new" />}>
      <Plus aria-hidden="true" />
      {t("createCta")}
    </Button>
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-12 lg:px-8">
      <PageTitle title={t("title")} description={t("description", { courseTitle })} actions={createCta} />
      <CourseWorkspaceHeader courseId={course.id} courseTitle={courseTitle} tabLabel={t("title")} />

      <div className="rounded-2xl border border-border bg-card">
        {result.items.length === 0 ? (
          <div className="p-4 sm:p-6">
            <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} action={createCta} />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tCoupons("columns.code")}</TableHead>
                <TableHead>{tCoupons("columns.discount")}</TableHead>
                <TableHead>{tCoupons("columns.usage")}</TableHead>
                <TableHead>{tCoupons("columns.status")}</TableHead>
                <TableHead>
                  <span className="sr-only">{tCoupons("columns.actions")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.items.map((coupon) => (
                <TableRow key={coupon.id}>
                  <TableCell className="font-medium text-foreground">{coupon.code}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {coupon.discountType === "percentage" ? `${coupon.discountValue}%` : coupon.discountValue}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {coupon.redeemedCount}
                    {coupon.maxRedemptions !== null ? ` / ${coupon.maxRedemptions}` : ` ${tCoupons("unlimited")}`}
                  </TableCell>
                  <TableCell>
                    <Badge variant={coupon.isActive ? "default" : "secondary"}>
                      {coupon.isActive ? tCoupons("status.active") : tCoupons("status.inactive")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <InstructorCouponRowActions coupon={coupon} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
