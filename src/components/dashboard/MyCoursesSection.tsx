import { getLocale, getTranslations } from "next-intl/server";
import { GraduationCap } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/admin/EmptyState";
import { CourseCard } from "@/components/courses/CourseCard";
import { DashboardCoursesFilter } from "@/components/dashboard/DashboardCoursesFilter";
import { CourseService } from "@/courses/services/course.service";
import type { Locale } from "@/i18n/routing";
import type { DashboardCourseItem } from "@/learning/types/student-dashboard";

/**
 * "My Courses" — every active enrollment as the shared `CourseCard` in
 * its enrolled variant (progress replaces price; completed shows the
 * check state), behind client-side status chips. Enrolled cards
 * deep-link to the player rather than the details page — a student who
 * owns the course wants the content, not the pitch.
 *
 * The no-enrollments state is a storefront, not a void: the same dashed
 * panel language the blog uses, plus three featured (fallback: newest)
 * published courses inline, fetched only in this branch — students with
 * enrollments never pay for the query.
 */
export async function MyCoursesSection({ courses }: { courses: DashboardCourseItem[] }) {
  const locale = (await getLocale()) as Locale;
  const [t, tCard, tDifficulty] = await Promise.all([
    getTranslations("Dashboard.myDashboard"),
    getTranslations("CourseCatalog.card"),
    getTranslations("CourseCatalog.difficulty"),
  ]);

  if (courses.length === 0) {
    const featured = await CourseService.searchResolved(
      { status: "published", onlyActive: true, featured: true, pageSize: 3 },
      locale,
    );
    const suggestions =
      featured.items.length > 0
        ? featured.items
        : (
            await CourseService.searchResolved(
              { status: "published", onlyActive: true, sortBy: "createdAt", sortDirection: "desc", pageSize: 3 },
              locale,
            )
          ).items;

    return (
      <section>
        <h2 className="text-lg font-semibold text-foreground">{t("myCoursesTitle")}</h2>
        <div className="mt-4 space-y-6">
          <EmptyState
            icon={GraduationCap}
            title={t("storefront.title")}
            description={t("storefront.description")}
            action={
              <Button size="sm" nativeButton={false} render={<Link href="/courses" />}>
                {t("browseCourses")}
              </Button>
            }
          />
          {suggestions.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {suggestions.map((course) => (
                <CourseCard key={course.id} course={course} locale={locale} t={tCard} tDifficulty={tDifficulty} />
              ))}
            </div>
          )}
        </div>
      </section>
    );
  }

  const items = courses.map((course) => ({
    key: course.enrollmentId,
    status: course.completionStatus,
    node: (
      <CourseCard
        course={course.card}
        locale={locale}
        t={tCard}
        tDifficulty={tDifficulty}
        progress={
          course.completionStatus === "completed"
            ? ("completed" as const)
            : { completed: course.completedLessons, total: course.totalLessons }
        }
        href={`/courses/${course.courseSlug}/learn`}
      />
    ),
  }));

  return (
    <section>
      <h2 className="text-lg font-semibold text-foreground">{t("myCoursesTitle")}</h2>
      <div className="mt-4">
        <DashboardCoursesFilter
          items={items}
          labels={{
            all: t("filters.all"),
            inProgress: t("filters.inProgress"),
            completed: t("filters.completed"),
            emptyFilter: t("filters.empty"),
          }}
        />
      </div>
    </section>
  );
}
