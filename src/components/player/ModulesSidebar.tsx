import { CheckCircle2, Circle, FileText, HelpCircle, PlayCircle } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { LessonType } from "@/learning/types/lesson-type";
import type { PlayerModuleSummary } from "@/learning/types/course-player";

const LESSON_TYPE_ICONS: Record<LessonType, LucideIcon> = {
  video: PlayCircle,
  reading: FileText,
  quiz: HelpCircle,
};

/**
 * The Course Player's (Step 4.4) module/lesson tree — every module and
 * lesson in the course, so the student can jump anywhere, with a
 * completion checkmark per lesson and the current lesson highlighted.
 * A plain async Server Component: every entry is a real `<Link>` to
 * `/courses/[slug]/learn/[lessonId]`, so navigation works without JS and
 * each destination re-runs its own auth/enrollment check server-side —
 * no client-side routing table to keep in sync. Mobile responsiveness is
 * pure CSS stacking (renders above the content area on narrow viewports,
 * side-by-side via the page's own grid on larger ones) rather than a
 * `Sheet` drawer — this step's scope doesn't call for that interaction.
 */
export async function ModulesSidebar({
  courseSlug,
  courseTitle,
  modules,
  currentLessonId,
  totalLessons,
  completedLessons,
  progressPercentage,
}: {
  courseSlug: string;
  courseTitle: string;
  modules: PlayerModuleSummary[];
  currentLessonId: string;
  totalLessons: number;
  completedLessons: number;
  progressPercentage: number;
}) {
  const t = await getTranslations("CoursePlayer");

  return (
    <nav aria-label={t("sidebar.title")} className="flex flex-col gap-4 rounded-2xl bg-card p-4 ring-1 ring-foreground/10 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
      <div>
        <Link
          href={`/courses/${courseSlug}`}
          className="line-clamp-2 text-sm font-semibold text-foreground hover:underline"
        >
          {courseTitle}
        </Link>
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{t("sidebar.title")}</span>
            <span className="font-medium text-foreground">{progressPercentage}%</span>
          </div>
          <Progress value={progressPercentage} aria-label={t("sidebar.title")} />
          <p className="text-xs text-muted-foreground">
            {t("sidebar.progress", { completed: completedLessons, total: totalLessons })}
          </p>
        </div>
      </div>

      <ol className="flex flex-col gap-4">
        {modules.map((courseModule) => (
          <li key={courseModule.id}>
            <p className="mb-1.5 px-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {courseModule.title}
            </p>
            <ol className="flex flex-col gap-0.5">
              {courseModule.lessons.map((lesson) => {
                const TypeIcon = LESSON_TYPE_ICONS[lesson.type];
                const isCurrent = lesson.id === currentLessonId;
                return (
                  <li key={lesson.id}>
                    <Link
                      href={`/courses/${courseSlug}/learn/${lesson.id}`}
                      aria-current={isCurrent ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors",
                        isCurrent
                          ? "bg-primary/10 font-medium text-primary"
                          : "text-foreground hover:bg-muted",
                      )}
                    >
                      {lesson.completed ? (
                        <CheckCircle2 aria-hidden="true" className="size-4 shrink-0 text-emerald-600" />
                      ) : (
                        <Circle aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                      )}
                      <TypeIcon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                      <span className="line-clamp-2">{lesson.title}</span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </li>
        ))}
      </ol>
    </nav>
  );
}
