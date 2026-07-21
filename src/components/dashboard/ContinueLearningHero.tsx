import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { BookOpen, PlayCircle } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { ProgressPrimitive } from "@/components/courses/ProgressPrimitive";
import { cn } from "@/lib/utils";
import type { DashboardCourseItem } from "@/learning/types/student-dashboard";

/**
 * The dashboard's single "pick up where you left off" moment — ONE wide
 * card for the most recently active in-progress course, naming the exact
 * resume lesson and deep-linking to it. Other in-progress courses live in
 * the grid below; duplicating them here would just make two lists.
 * Renders nothing when there's nothing in progress.
 */
export async function ContinueLearningHero({ course }: { course: DashboardCourseItem | undefined }) {
  if (!course) return null;

  const t = await getTranslations("Dashboard.myDashboard.continueHero");

  const resumeHref = course.resumeLessonId
    ? `/courses/${course.courseSlug}/learn/${course.resumeLessonId}`
    : `/courses/${course.courseSlug}/learn`;

  return (
    <section aria-labelledby="continue-learning">
      <h2 id="continue-learning" className="text-lg font-semibold text-foreground">
        {t("title")}
      </h2>
      <Card className="mt-4 overflow-hidden border-none py-0 ring-1 ring-foreground/5 shadow-card">
        <div className="flex flex-col sm:flex-row">
          <div className="relative aspect-video w-full shrink-0 overflow-hidden bg-gradient-to-br from-primary/15 via-primary/5 to-transparent sm:aspect-auto sm:w-64 lg:w-80">
            {course.card.coverImageUrl ? (
              <Image
                src={course.card.coverImageUrl}
                alt=""
                fill
                sizes="(max-width: 640px) 100vw, 320px"
                className="object-cover"
              />
            ) : (
              <BookOpen aria-hidden="true" className="absolute -end-4 -bottom-4 size-24 text-primary/15" />
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-4 p-6">
            <div className="min-w-0">
              <p className="line-clamp-2 text-lg font-semibold text-foreground">{course.courseTitle}</p>
              {course.instructorName && (
                <p className="mt-1 text-sm text-muted-foreground">{course.instructorName}</p>
              )}
            </div>
            <ProgressPrimitive
              completed={course.completedLessons}
              total={course.totalLessons}
              label={t("progress", { completed: course.completedLessons, total: course.totalLessons })}
            />
            {course.resumeLessonTitle && (
              <p className="text-sm text-muted-foreground">
                {t("resume", { lesson: course.resumeLessonTitle })}
              </p>
            )}
            <div className="mt-auto">
              <Link href={resumeHref} className={cn(buttonVariants(), "w-full sm:w-auto")}>
                <PlayCircle aria-hidden="true" className="size-4" />
                {t("cta")}
              </Link>
            </div>
          </div>
        </div>
      </Card>
    </section>
  );
}
