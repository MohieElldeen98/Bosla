import { ChevronLeft, ChevronRight, FileQuestion } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/admin/EmptyState";
import { LessonCompletionToggle } from "@/components/player/LessonCompletionToggle";
import { LessonResourcesList } from "@/components/player/LessonResourcesList";
import { LessonTabs } from "@/components/player/LessonTabs";
import { QuizPlayer } from "@/components/player/QuizPlayer";
import { LessonVideoPlayer } from "@/components/player/LessonVideoPlayer";
import { cn } from "@/lib/utils";
import type { CoursePlayerData } from "@/learning/types/course-player";

/**
 * The Course Player's main content pane — primary content on top (video /
 * quiz / reading body), then a tab row (docs/courses-ux-spec.md §6) that
 * only exists when a tab has content: Overview carries the lesson body
 * for VIDEO lessons (a reading lesson's body IS its primary content, so
 * it gets no redundant Overview tab), Resources carries downloadable
 * attachments. A lesson with only a video renders no tab row at all.
 *
 * Content by type: real text for `"reading"`; for `"quiz"`, the real
 * `QuizPlayer` once the lesson has a `Quiz` row with questions authored,
 * otherwise a "coming soon" placeholder. The manual "Mark as Complete"
 * toggle sits by the lesson title and is hidden only once a real quiz
 * exists — completion then becomes automatic on a passing submission
 * (`QuizAttemptService.submit`).
 */
export async function LessonContentArea({
  courseSlug,
  studentId,
  studentEmail,
  lesson,
  previousLesson,
  nextLesson,
  courseTitle,
  specialtyId,
  certificateAvailable,
  totalLessons,
}: {
  courseSlug: string;
  studentId: string;
  studentEmail: string | null;
  lesson: CoursePlayerData["currentLesson"];
  previousLesson: CoursePlayerData["previousLesson"];
  nextLesson: CoursePlayerData["nextLesson"];
  courseTitle: string;
  specialtyId: string;
  certificateAvailable: boolean;
  totalLessons: number;
}) {
  const t = await getTranslations("CoursePlayer");

  const tabs: { id: string; label: string; node: React.ReactNode }[] = [];
  if (lesson.type === "video" && lesson.body) {
    tabs.push({
      id: "overview",
      label: t("tabs.overview"),
      node: <div className="prose prose-sm max-w-none whitespace-pre-wrap text-foreground">{lesson.body}</div>,
    });
  }
  if (lesson.attachments.length > 0) {
    tabs.push({
      id: "resources",
      label: t("tabs.resources"),
      node: <LessonResourcesList attachments={lesson.attachments} />,
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="border-b pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{t(`sidebar.typeLabels.${lesson.type}`)}</Badge>
            {lesson.isPreview && <Badge variant="secondary">{t("content.previewBadge")}</Badge>}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-xl">{lesson.title}</CardTitle>
            {!lesson.quiz && (
              <LessonCompletionToggle studentId={studentId} lessonId={lesson.id} initialCompleted={lesson.completed} />
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {lesson.type === "reading" && lesson.body && (
            <div className="prose prose-sm max-w-none whitespace-pre-wrap text-foreground">{lesson.body}</div>
          )}

          {lesson.type === "reading" && !lesson.body && (
            <EmptyState title={t("content.noBodyTitle")} description={t("content.noBodyDescription")} />
          )}

          {lesson.type === "video" && lesson.videoUrl && (
            <LessonVideoPlayer
              src={lesson.videoUrl}
              poster={lesson.videoPosterUrl ?? undefined}
              lessonId={lesson.id}
              studentId={studentId}
              studentEmail={studentEmail}
              initialPosition={lesson.positionSeconds}
              title={lesson.title}
              courseSlug={courseSlug}
              specialtyId={specialtyId}
              certificateAvailable={certificateAvailable}
              courseTitle={courseTitle}
              totalLessons={totalLessons}
              nextLesson={nextLesson}
            />
          )}

          {lesson.type === "video" && !lesson.videoUrl && (
            <EmptyState
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

          {lesson.type === "quiz" && lesson.quiz && <QuizPlayer studentId={studentId} quiz={lesson.quiz} />}

          {lesson.type === "quiz" && !lesson.quiz && (
            <EmptyState
              icon={FileQuestion}
              title={t("content.quizPlaceholderTitle")}
              description={t("content.quizPlaceholderDescription")}
            />
          )}

          {tabs.length > 0 && (
            <div className="mt-6">
              <LessonTabs tabs={tabs} />
            </div>
          )}
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
