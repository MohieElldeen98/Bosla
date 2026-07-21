"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Award, LayoutDashboard, Search } from "lucide-react";
import { useRouter, Link } from "@/i18n/navigation";
import { BoslaPlayer } from "@/components/player/BoslaPlayer";
import { ProgressPrimitive } from "@/components/courses/ProgressPrimitive";
import { Button, buttonVariants } from "@/components/ui/button";
import { setLessonProgressAction, updateLessonPositionAction } from "@/learning/actions/lesson-progress.actions";
import { cn } from "@/lib/utils";

const AUTOPLAY_STORAGE_KEY = "bosla:player:autoplay-next";
const AUTO_ADVANCE_SECONDS = 8;

function readAutoplayPreference(): boolean {
  try {
    return window.localStorage.getItem(AUTOPLAY_STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
}

/**
 * The video lesson's client island: BoslaPlayer plus what happens when a
 * video ends — an "Up next" card with an 8s auto-advance countdown (on by
 * default, off switch persisted), or, on the course's final lesson, the
 * one celebratory moment in the product: the completion panel
 * (docs/courses-ux-spec.md §6 — restrained, no confetti).
 */
export function LessonVideoPlayer({
  src,
  poster,
  lessonId,
  studentId,
  studentEmail,
  initialPosition,
  title,
  courseSlug,
  specialtyId,
  certificateAvailable,
  courseTitle,
  totalLessons,
  nextLesson,
}: {
  src: string;
  poster?: string;
  lessonId: string;
  studentId: string;
  studentEmail: string | null;
  initialPosition: number;
  title: string;
  courseSlug: string;
  specialtyId: string;
  certificateAvailable: boolean;
  courseTitle: string;
  totalLessons: number;
  nextLesson: { id: string; title: string } | null;
}) {
  const t = useTranslations("CoursePlayer.upNext");
  const router = useRouter();
  const [ended, setEnded] = useState(false);
  const [autoplay, setAutoplay] = useState(true);
  const [secondsLeft, setSecondsLeft] = useState(AUTO_ADVANCE_SECONDS);

  useEffect(() => {
    setAutoplay(readAutoplayPreference());
  }, []);

  useEffect(() => {
    if (!ended || !nextLesson || !autoplay) return undefined;
    if (secondsLeft <= 0) {
      router.push(`/courses/${courseSlug}/learn/${nextLesson.id}`);
      return undefined;
    }
    const timer = window.setTimeout(() => setSecondsLeft((current) => current - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [ended, nextLesson, autoplay, secondsLeft, courseSlug, router]);

  function toggleAutoplay() {
    setAutoplay((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(AUTOPLAY_STORAGE_KEY, next ? "on" : "off");
      } catch {
        // Preference persistence is best-effort; the toggle still works
        // for this session.
      }
      return next;
    });
  }

  return (
    <div className="relative">
      <BoslaPlayer
        src={src}
        poster={poster}
        title={title}
        initialPosition={initialPosition}
        watermarkText={studentEmail ?? undefined}
        lessonId={lessonId}
        onProgress={(seconds) => {
          void updateLessonPositionAction({ studentId, lessonId, positionSeconds: Math.floor(seconds) });
        }}
        onComplete={() => {
          void setLessonProgressAction({ studentId, lessonId, completed: true });
          setSecondsLeft(AUTO_ADVANCE_SECONDS);
          setEnded(true);
        }}
      />

      {ended && nextLesson && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm space-y-4 rounded-2xl bg-card p-6 text-center shadow-xl">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("label")}</p>
            <p className="line-clamp-2 text-base font-semibold text-foreground">{nextLesson.title}</p>
            {autoplay && (
              <p className="text-sm tabular-nums text-muted-foreground">{t("countdown", { seconds: secondsLeft })}</p>
            )}
            <div className="flex flex-col gap-2">
              <Link href={`/courses/${courseSlug}/learn/${nextLesson.id}`} className={cn(buttonVariants(), "w-full")}>
                {t("playNow")}
              </Link>
              <Button type="button" variant="ghost" onClick={() => setEnded(false)}>
                {t("cancel")}
              </Button>
            </div>
            <button
              type="button"
              onClick={toggleAutoplay}
              className="text-xs text-muted-foreground underline-offset-4 hover:underline"
            >
              {autoplay ? t("autoplayOff") : t("autoplayOn")}
            </button>
          </div>
        </div>
      )}

      {ended && !nextLesson && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm space-y-4 rounded-2xl bg-card p-6 text-center shadow-xl">
            <p className="text-base font-semibold text-foreground">{t("courseComplete")}</p>
            <p className="line-clamp-2 text-sm text-muted-foreground">{courseTitle}</p>
            <ProgressPrimitive completed={totalLessons} total={totalLessons} labelStyle="percent" />
            {certificateAvailable && (
              <p className="flex items-center justify-center gap-2 text-sm font-medium text-achievement">
                <Award aria-hidden="true" className="size-4" />
                {t("certificateReady")}
              </p>
            )}
            <div className="flex flex-col gap-2">
              <Link href="/dashboard" className={cn(buttonVariants(), "w-full")}>
                <LayoutDashboard aria-hidden="true" className="size-4" />
                {t("backToDashboard")}
              </Link>
              <Link
                href={`/courses?specialtyId=${specialtyId}`}
                className={cn(buttonVariants({ variant: "outline" }), "w-full")}
              >
                <Search aria-hidden="true" className="size-4" />
                {t("browseRelated")}
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
