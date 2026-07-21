import { BookOpen, Clock, GraduationCap, CheckCircle2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CourseIdentityBlock } from "@/components/courses/CourseIdentityBlock";
import { PriceBlock } from "@/components/courses/PriceBlock";
import { ProgressPrimitive } from "@/components/courses/ProgressPrimitive";
import type { CourseCardData } from "@/courses/types/course-card";
import type { getTranslations } from "next-intl/server";

type Translator = Awaited<ReturnType<typeof getTranslations>>;

function formatDuration(minutes: number, locale: string): string {
  const hours = minutes / 60;
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(hours);
}

/** A catalog card with one identity, commerce, and learning-state anatomy. */
export function CourseCard({
  course,
  locale,
  t,
  tDifficulty,
  progress,
  href,
}: {
  course: CourseCardData;
  locale: string;
  t: Translator;
  tDifficulty: Translator;
  progress?: { completed: number; total: number } | "completed";
  /** Overrides the details-page link — the dashboard points enrolled
   *  cards straight at the player instead. */
  href?: string;
}) {
  const progressBlock = progress === "completed" ? (
    <span className="flex items-center gap-1 text-sm font-medium text-emerald-600 dark:text-emerald-400">
      <CheckCircle2 aria-hidden="true" className="size-4" />
      {t("completed")}
    </span>
  ) : progress ? (
    <ProgressPrimitive
      completed={progress.completed}
      total={progress.total}
      label={t("lessonProgress", { completed: progress.completed, total: progress.total })}
    />
  ) : null;

  return (
    <Link href={href ?? `/courses/${course.slug}`} className="group block h-full">
      <Card className="h-full gap-5 overflow-hidden border-none py-0 [--card-spacing:--spacing(5)] ring-1 ring-foreground/5 shadow-card transition-shadow group-hover:shadow-card-hover">
        <CourseIdentityBlock
          density="card"
          title={course.title}
          instructorName={course.instructorName}
          instructorQualification={course.instructorQualification}
          instructorAvatarUrl={course.instructorAvatarUrl}
          level={course.level}
          tLevel={tDifficulty}
          thumbnailUrl={course.coverImageUrl}
          thumbnailPlaceholder={<BookOpen aria-hidden="true" className="absolute -end-4 -bottom-4 size-28 text-primary/15" />}
          showLevel={false}
          thumbnailOverlay={
            <>
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/30 via-transparent to-transparent" />
              <div className="absolute top-3 start-3 flex max-w-[calc(100%-1.5rem)] flex-wrap gap-1.5">
                {(course.isFree || course.originalPrice && Number(course.originalPrice) > Number(course.price)) && (
                  <Badge className={course.isFree ? "border-none bg-emerald-500/90 text-white" : "border-none bg-achievement text-achievement-foreground"}>
                    {course.isFree ? t("free") : t("discount", { percentage: Math.round((1 - Number(course.price) / Number(course.originalPrice)) * 100) })}
                  </Badge>
                )}
                {course.featured && <Badge className="border-none bg-background/90 text-foreground">{t("featured")}</Badge>}
              </div>
              <span className="absolute bottom-3 start-3 rounded-full bg-background/75 px-2.5 py-1 text-xs font-medium text-foreground backdrop-blur-sm">
                {tDifficulty(course.level)}
              </span>
              {progress && progress !== "completed" && (
                <div className="absolute inset-x-0 bottom-0" aria-hidden="true">
                  <ProgressPrimitive completed={progress.completed} total={progress.total} compact />
                </div>
              )}
            </>
          }
          eyebrow={course.categoryName || course.specialtyName ? (
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {course.categoryName || course.specialtyName}
            </p>
          ) : undefined}
        />

        <CardContent className="flex flex-1 flex-col gap-3 pb-5">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {course.estimatedDurationMinutes !== null && (
              <span className="flex items-center gap-1">
                <Clock aria-hidden="true" className="size-4" />
                {t("durationHours", { hours: formatDuration(course.estimatedDurationMinutes, locale) })}
              </span>
            )}
            <span className="flex items-center gap-1">
              <BookOpen aria-hidden="true" className="size-4" />
              {t("lessonCount", { count: course.lessonCount })}
            </span>
            {course.certificateAvailable && (
              <span title={t("certificate")} aria-label={t("certificate")}>
                <GraduationCap aria-hidden="true" className="size-4 text-achievement" />
              </span>
            )}
          </div>

          {/* Rating precedes the price in this row when reviews ship —
              the slot is this flex row's first position, not reserved
              blank pixels (an invisible spacer would just read as a
              misaligned price until then). */}
          <div className="mt-auto flex min-h-9 items-center gap-3 border-t border-border pt-4">
            {progressBlock ?? (
              <PriceBlock
                price={course.price}
                originalPrice={course.originalPrice}
                currency={course.currency}
                isFree={course.isFree}
                locale={locale}
                freeLabel={t("free")}
                discountLabel={(percentage) => t("discount", { percentage })}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
