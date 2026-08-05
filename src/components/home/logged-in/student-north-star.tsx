import { getTranslations } from "next-intl/server";
import { BookOpen } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { CourseCard } from "@/components/courses/CourseCard";
import { ContinueLearningHero } from "@/components/dashboard/ContinueLearningHero";
import { InstrumentDial } from "@/components/home/logged-in/instrument-dial";
import { getMyDashboardAction } from "@/learning/actions/student-dashboard.actions";
import { CourseService } from "@/courses/services/course.service";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";

/**
 * The student's "north star": for an in-progress course, the dial reads
 * real lesson-completion progress (needle settling to that fraction),
 * next to `/me`'s own `ContinueLearningHero` verbatim — same visual
 * language, zero new UI for the actionable part. For a student with
 * nothing started yet there is no honest single value to gauge, so the
 * dial is skipped entirely rather than showing a demotivating "0%":
 * just the prompt into a small recommended-courses grid.
 */
export async function StudentNorthStar({ locale }: { locale: Locale }) {
  const [t, dashboardResult] = await Promise.all([
    getTranslations({ locale, namespace: "LoggedInHome.student" }),
    getMyDashboardAction(locale),
  ]);
  const continueLearning = dashboardResult.success ? dashboardResult.data.continueLearning : [];

  if (continueLearning.length > 0) {
    const course = continueLearning[0];
    const progress = course.totalLessons > 0 ? course.completedLessons / course.totalLessons : 0;

    return (
      <div className="flex flex-col items-center gap-8">
        <InstrumentDial value={progress} reading={`${Math.round(progress * 100)}%`} label={t("progressLabel")} />
        <div className="w-full text-start">
          <ContinueLearningHero course={course} />
        </div>
      </div>
    );
  }

  const [tCard, tDifficulty, recommended] = await Promise.all([
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
