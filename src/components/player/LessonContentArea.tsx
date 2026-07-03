import { ChevronLeft, ChevronRight, FileQuestion, PlayCircle } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/admin/EmptyState";
import { LessonCompletionToggle } from "@/components/player/LessonCompletionToggle";
import { cn } from "@/lib/utils";
import type { CoursePlayerData } from "@/learning/types/course-player";

/**
 * The Course Player's (Step 4.4) main content pane — the current lesson's
 * title/type, its content (real text for `"reading"`, a clear placeholder
 * for `"video"`/`"quiz"` per this step's explicit scope: no video player,
 * no quiz UI, no new media system), the completion toggle, and Previous/
 * Next navigation. A Server Component — content is read-only render, the
 * only interactive piece (`LessonCompletionToggle`) is its own small
 * client island.
 */
export async function LessonContentArea({
  courseSlug,
  studentId,
  lesson,
  previousLesson,
  nextLesson,
}: {
  courseSlug: string;
  studentId: string;
  lesson: CoursePlayerData["currentLesson"];
  previousLesson: CoursePlayerData["previousLesson"];
  nextLesson: CoursePlayerData["nextLesson"];
}) {
  const t = await getTranslations("CoursePlayer");

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="border-b pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{t(`sidebar.typeLabels.${lesson.type}`)}</Badge>
            {lesson.isPreview && <Badge variant="secondary">{t("content.previewBadge")}</Badge>}
          </div>
          <CardTitle className="text-xl">{lesson.title}</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {lesson.type === "reading" && lesson.body && (
            <div className="prose prose-sm max-w-none whitespace-pre-wrap text-foreground">{lesson.body}</div>
          )}

          {lesson.type === "reading" && !lesson.body && (
            <EmptyState title={t("content.noBodyTitle")} description={t("content.noBodyDescription")} />
          )}

          {lesson.type === "video" && (
            <EmptyState
              icon={PlayCircle}
              title={t("content.videoPlaceholderTitle")}
              description={
                lesson.durationSeconds
                  ? `${t("content.videoPlaceholderDescription")} ${t("content.videoDuration", {
                      minutes: Math.ceil(lesson.durationSeconds / 60),
                    })}`
                  : t("content.videoPlaceholderDescription")
              }
            />
          )}

          {lesson.type === "quiz" && (
            <EmptyState
              icon={FileQuestion}
              title={t("content.quizPlaceholderTitle")}
              description={t("content.quizPlaceholderDescription")}
            />
          )}

          <div className="mt-6">
            <LessonCompletionToggle studentId={studentId} lessonId={lesson.id} initialCompleted={lesson.completed} />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-3">
        {previousLesson ? (
          <Link
            href={`/courses/${courseSlug}/learn/${previousLesson.id}`}
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            <ChevronLeft aria-hidden="true" className="rtl:rotate-180" />
            {t("content.previous")}
          </Link>
        ) : (
          <span className={cn(buttonVariants({ variant: "outline" }), "pointer-events-none opacity-50")}>
            <ChevronLeft aria-hidden="true" className="rtl:rotate-180" />
            {t("content.previous")}
          </span>
        )}

        {nextLesson ? (
          <Link
            href={`/courses/${courseSlug}/learn/${nextLesson.id}`}
            className={cn(buttonVariants({ variant: "default" }))}
          >
            {t("content.next")}
            <ChevronRight aria-hidden="true" className="rtl:rotate-180" />
          </Link>
        ) : (
          <span className={cn(buttonVariants({ variant: "default" }), "pointer-events-none opacity-50")}>
            {t("content.next")}
            <ChevronRight aria-hidden="true" className="rtl:rotate-180" />
          </span>
        )}
      </div>
    </div>
  );
}
