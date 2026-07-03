import { getTranslations } from "next-intl/server";
import { DashboardCourseCard } from "@/components/dashboard/DashboardCourseCard";
import type { DashboardCourseItem } from "@/learning/types/student-dashboard";

/** "Continue Learning" (Step 4.3) — the in-progress subset of the
 *  student's active enrollments, most-recently-active first (already
 *  filtered/sorted/capped by `StudentDashboardService.getDashboard`).
 *  Renders nothing at all when empty (not even a heading) — every
 *  course is `"not_started"` until a Course Player (Step 4.4) exists to
 *  generate real `lesson_progress`, so this section is expected to be
 *  absent for most students today; that's correct behavior, not a bug. */
export async function ContinueLearningSection({ courses }: { courses: DashboardCourseItem[] }) {
  if (courses.length === 0) return null;

  const t = await getTranslations("Dashboard.myDashboard");

  return (
    <section>
      <h2 className="text-lg font-semibold text-foreground">{t("continueLearningTitle")}</h2>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((course) => (
          <DashboardCourseCard key={course.enrollmentId} course={course} />
        ))}
      </div>
    </section>
  );
}
