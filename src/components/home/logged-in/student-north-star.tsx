import { getTranslations } from "next-intl/server";
import { BookOpen } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { CourseCard } from "@/components/courses/CourseCard";
import { ContinueLearningHero } from "@/components/dashboard/ContinueLearningHero";
import { getMyDashboardAction } from "@/learning/actions/student-dashboard.actions";
import { CourseService } from "@/courses/services/course.service";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";

/**
 * The student's "north star": pick up an in-progress course (reusing
 * `/me`'s own `ContinueLearningHero` verbatim — same visual language,
 * zero new UI for that case), or, for a student with nothing started
 * yet, a prompt into a small recommended-courses grid instead.
 */
export async function StudentNorthStar({ locale }: { locale: Locale }) {
  const dashboardResult = await getMyDashboardAction(locale);
  const continueLearning = dashboardResult.success ? dashboardResult.data.continueLearning : [];

  if (continueLearning.length > 0) {
    return <ContinueLearningHero course={continueLearning[0]} />;
  }

  const [t, tCard, tDifficulty, recommended] = await Promise.all([
    getTranslations({ locale, namespace: "LoggedInHome.student" }),
    getTranslations({ locale, namespace: "CourseCatalog.card" }),
    getTranslations({ locale, namespace: "CourseCatalog.difficulty" }),
    CourseService.searchResolved({ status: "published", onlyActive: true, pageSize: 4 }, locale),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-center gap-3">
        <p className="text-foreground/80">{t("emptyStateDescription")}</p>
        <Link href="/courses" className={cn(buttonVariants(), "gap-2")}>
          <BookOpen aria-hidden="true" className="size-4" />
          {t("browseCoursesCta")}
        </Link>
      </div>
      {recommended.items.length > 0 && (
        <div className="grid grid-cols-1 gap-5 text-start sm:grid-cols-2 lg:grid-cols-4">
          {recommended.items.map((course) => (
            <CourseCard key={course.id} course={course} locale={locale} t={tCard} tDifficulty={tDifficulty} />
          ))}
        </div>
      )}
    </div>
  );
}
