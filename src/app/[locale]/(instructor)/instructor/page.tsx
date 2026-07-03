import { getTranslations } from "next-intl/server";
import { BookOpen, Plus, Users, Ticket, Wallet, UserCircle } from "lucide-react";
import { PageTitle } from "@/components/admin/PageTitle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { SessionService } from "@/auth/services/session.service";
import { CourseService } from "@/courses/services/course.service";
import { COURSE_STATUSES } from "@/courses/types/course-status";

/**
 * `/instructor` — the Instructor Dashboard entry point (Phase 6, Step
 * 6.3), replacing the "coming soon" placeholder. Deliberately minimal:
 * course counts by status plus links to every other Instructor Panel
 * page — no analytics/performance overview (still-ahead, per
 * docs/roles-and-permissions.md §5's "performance overview" row). As of
 * Step 6.6, every page in that §5 inventory except Reviews (blocked —
 * the Review entity itself doesn't exist anywhere in this codebase yet)
 * is real and linked from here.
 */
export default async function InstructorHomePage() {
  const user = await SessionService.getCurrentUser();
  if (!user) return null;

  const [t, tCourses, counts] = await Promise.all([
    getTranslations("Instructor.panel"),
    getTranslations("Admin.courses"),
    CourseService.getMyCourseCounts(user),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-6 py-12 lg:px-8">
      <PageTitle
        title={t("title")}
        description={t("description")}
        actions={
          <Button size="sm" nativeButton={false} render={<Link href="/instructor/courses/new" />}>
            <Plus aria-hidden="true" />
            {tCourses("createCourse")}
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {COURSE_STATUSES.map((status) => (
          <Card key={status} size="sm">
            <CardHeader>
              <CardDescription>
                {tCourses(`status.${status === "in_review" ? "inReview" : status}`)}
              </CardDescription>
              <CardTitle className="text-2xl">{counts[status]}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen aria-hidden="true" className="size-4 text-primary" />
              {t("myCoursesTitle")}
            </CardTitle>
            <CardDescription>{t("myCoursesDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/instructor/courses" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
              {t("viewMyCourses")}
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users aria-hidden="true" className="size-4 text-primary" />
              {t("studentsTitle")}
            </CardTitle>
            <CardDescription>{t("studentsDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/instructor/students" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
              {t("viewStudents")}
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Ticket aria-hidden="true" className="size-4 text-primary" />
              {t("couponsTitle")}
            </CardTitle>
            <CardDescription>{t("couponsDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/instructor/coupons" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
              {t("viewCoupons")}
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wallet aria-hidden="true" className="size-4 text-primary" />
              {t("earningsTitle")}
            </CardTitle>
            <CardDescription>{t("earningsDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/instructor/earnings" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
              {t("viewEarnings")}
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserCircle aria-hidden="true" className="size-4 text-primary" />
              {t("profileTitle")}
            </CardTitle>
            <CardDescription>{t("profileDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/instructor/profile" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
              {t("viewProfile")}
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
