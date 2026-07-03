import { getTranslations, getLocale } from "next-intl/server";
import { BookOpen, CheckCircle2, PlayCircle } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DashboardCourseItem } from "@/learning/types/student-dashboard";

/**
 * One enrolled course on the Student Dashboard (Step 4.3) — reuses the
 * `Card`/`Badge`/`Button` primitives and cover-image-or-placeholder
 * treatment the public catalog's `CourseCard` (Step 3.4) already
 * established, adapted for progress instead of marketing fields (price/
 * difficulty/language don't belong here; progress/last-activity/
 * completion do). A plain async Server Component, not a client one —
 * nothing here needs interactivity, the "Continue" button is just a
 * `Link` to the future Course Player route (`/courses/[slug]/learn`,
 * a placeholder until Step 4.4).
 */
export async function DashboardCourseCard({ course }: { course: DashboardCourseItem }) {
  const t = await getTranslations("Dashboard.myDashboard.card");
  const locale = await getLocale();

  return (
    <Card className="flex h-full flex-col overflow-hidden py-0">
      <div className="relative flex h-32 items-end overflow-hidden bg-gradient-to-br from-primary/15 via-primary/5 to-transparent">
        {course.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={course.coverImageUrl} alt="" className="absolute inset-0 size-full object-cover" />
        ) : (
          <BookOpen aria-hidden="true" className="absolute -end-4 -bottom-4 size-24 text-primary/15" />
        )}
        {course.completionStatus === "completed" && (
          <Badge className="absolute top-3 start-3 border-none bg-white/90 text-foreground shadow-sm">
            <CheckCircle2 aria-hidden="true" className="size-3.5 text-emerald-600" />
            {t("completed")}
          </Badge>
        )}
      </div>

      <CardHeader className="pt-4">
        <CardTitle className="line-clamp-2 text-base leading-snug">{course.courseTitle}</CardTitle>
        {course.instructorName && <CardDescription>{course.instructorName}</CardDescription>}
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-3 pb-5">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{t("progressLabel")}</span>
            <span className="font-medium text-foreground">{course.progressPercentage}%</span>
          </div>
          <Progress value={course.progressPercentage} aria-label={t("progressLabel")} />
        </div>

        {course.lastActivityAt ? (
          <p className="text-xs text-muted-foreground">
            {t("lastActivity", {
              date: new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(course.lastActivityAt)),
            })}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">{t("notStartedYet")}</p>
        )}

        <Link
          href={`/courses/${course.courseSlug}/learn`}
          className={cn(buttonVariants({ size: "sm" }), "mt-auto")}
        >
          <PlayCircle aria-hidden="true" className="size-4" />
          {course.completionStatus === "completed" ? t("review") : t("continue")}
        </Link>
      </CardContent>
    </Card>
  );
}
