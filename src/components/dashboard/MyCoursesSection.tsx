import { getTranslations } from "next-intl/server";
import { GraduationCap } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/admin/EmptyState";
import { DashboardCourseCard } from "@/components/dashboard/DashboardCourseCard";
import type { DashboardCourseItem } from "@/learning/types/student-dashboard";

/** "My Courses" (Step 4.3) — every active enrollment, newest-enrolled
 *  first. Reuses `EmptyState` from `components/admin/` for the
 *  no-enrollments case — the same component `ComingSoonPage` (the
 *  placeholder this page replaces) already used for a student-facing
 *  route, not an admin-only one. */
export async function MyCoursesSection({ courses }: { courses: DashboardCourseItem[] }) {
  const t = await getTranslations("Dashboard.myDashboard");

  return (
    <section>
      <h2 className="text-lg font-semibold text-foreground">{t("myCoursesTitle")}</h2>
      <div className="mt-4">
        {courses.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title={t("emptyTitle")}
            description={t("emptyDescription")}
            action={
              <Button size="sm" nativeButton={false} render={<Link href="/courses" />}>
                {t("browseCourses")}
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <DashboardCourseCard key={course.enrollmentId} course={course} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
