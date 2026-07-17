"use client";

import { useState } from "react";
import { CheckCircle2, ChevronDown, Circle, FileText, HelpCircle, Lock, Play, PlayCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BoslaPlayer } from "@/components/player/BoslaPlayer";
import { cn } from "@/lib/utils";
import type {
  CurriculumLessonNode,
  CurriculumTree as CurriculumTreeData,
  CurriculumTreeMode,
} from "@/learning/types/curriculum-tree";

function formatDuration(seconds: number | null): string {
  if (!seconds) return "";
  const minutes = Math.round(seconds / 60);
  return `${minutes}m`;
}

function LessonKindIcon({ lesson }: { lesson: CurriculumLessonNode }) {
  if (lesson.kind === "quiz") return <HelpCircle aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />;
  if (lesson.kind === "text") return <FileText aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />;
  return <PlayCircle aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />;
}

export function CurriculumTree({
  tree,
  mode,
  previewVideoUrls = {},
  courseSlug,
}: {
  tree: CurriculumTreeData;
  mode: CurriculumTreeMode;
  previewVideoUrls?: Record<string, string>;
  /** Learning mode only — lesson rows link to `/courses/[slug]/learn/[id]`. */
  courseSlug?: string;
}) {
  const t = useTranslations("CourseCatalog.detail");
  // Marketing opens the first module (a pitch reads top-down); learning
  // opens the module the current lesson lives in (the student is already
  // mid-course).
  const currentModuleId =
    mode === "learning"
      ? tree.modules.find((courseModule) => courseModule.lessons.some((lesson) => lesson.state === "current"))?.id
      : undefined;
  const [openModules, setOpenModules] = useState<string[]>(() => {
    const initial = currentModuleId ?? tree.modules[0]?.id;
    return initial ? [initial] : [];
  });
  const [openPreview, setOpenPreview] = useState<string | null>(null);

  if (mode === "summary") {
    // The dashboard's collapsed counts view arrives with its consuming
    // surface; the frozen contract (src/learning/types/curriculum-tree.ts)
    // already carries everything it needs.
    return null;
  }

  if (mode === "learning") {
    return (
      <ol className="flex flex-col gap-1">
        {tree.modules.map((courseModule) => {
          const isOpen = openModules.includes(courseModule.id);
          const completedCount = courseModule.lessons.filter((lesson) => lesson.state === "completed").length;
          return (
            <li key={courseModule.id}>
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() =>
                  setOpenModules((current) =>
                    isOpen ? current.filter((id) => id !== courseModule.id) : [...current, courseModule.id],
                  )
                }
                className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-2 py-2 text-start text-sm font-medium hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="line-clamp-2">{courseModule.title}</span>
                <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                  <span className="tabular-nums">
                    {completedCount}/{courseModule.lessonCount}
                  </span>
                  <ChevronDown
                    aria-hidden="true"
                    className={cn("size-4 transition-transform", isOpen && "rotate-180")}
                  />
                </span>
              </button>
              {isOpen && (
                <ol className="mt-0.5 flex flex-col gap-0.5">
                  {courseModule.lessons.map((lesson) => {
                    const isCurrent = lesson.state === "current";
                    return (
                      <li key={lesson.id}>
                        <Link
                          href={`/courses/${courseSlug}/learn/${lesson.id}`}
                          aria-current={isCurrent ? "page" : undefined}
                          className={cn(
                            "flex min-h-11 items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors",
                            isCurrent ? "bg-primary/10 font-medium text-primary" : "text-foreground hover:bg-muted/60",
                          )}
                        >
                          {lesson.state === "completed" ? (
                            <CheckCircle2 aria-hidden="true" className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                          ) : isCurrent ? (
                            <PlayCircle aria-hidden="true" className="size-4 shrink-0 text-primary" />
                          ) : (
                            <Circle aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                          )}
                          <LessonKindIcon lesson={lesson} />
                          <span className="min-w-0 flex-1 line-clamp-2">{lesson.title}</span>
                          {lesson.durationSeconds !== null && (
                            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                              {formatDuration(lesson.durationSeconds)}
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ol>
              )}
            </li>
          );
        })}
      </ol>
    );
  }

  const totalHours = Math.round((tree.totalDurationSeconds / 3600) * 10) / 10;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {t("curriculumSummary", { modules: tree.moduleCount, lessons: tree.lessonCount, hours: totalHours })}
      </p>
      <div className="overflow-hidden rounded-xl border border-border">
        {tree.modules.map((module) => {
          const isOpen = openModules.includes(module.id);
          return (
            <div key={module.id} className="border-b border-border last:border-b-0">
              <button
                type="button"
                className="flex min-h-14 w-full items-center justify-between gap-4 px-4 py-3 text-start hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-expanded={isOpen}
                onClick={() => setOpenModules((current) => isOpen ? current.filter((id) => id !== module.id) : [...current, module.id])}
              >
                <span className="font-medium">{module.title}</span>
                <span className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
                  <span>{t("moduleMeta", { count: module.lessonCount, duration: formatDuration(module.totalDurationSeconds) })}</span>
                  <ChevronDown className={`size-4 transition-transform ${isOpen ? "rotate-180" : ""}`} aria-hidden="true" />
                </span>
              </button>
              {isOpen && (
                <div className="border-t border-border bg-muted/20">
                  {module.lessons.map((lesson) => {
                    const previewUrl = previewVideoUrls[lesson.id];
                    const previewOpen = openPreview === lesson.id;
                    return (
                      <div key={lesson.id} className="border-b border-border last:border-b-0">
                        <button
                          type="button"
                          className="flex min-h-12 w-full items-center gap-3 px-4 py-3 text-start text-sm hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          disabled={!lesson.isPreview || !previewUrl}
                          onClick={() => setOpenPreview(previewOpen ? null : lesson.id)}
                        >
                          {lesson.isPreview && previewUrl ? <Play className="size-4 shrink-0 text-primary" aria-hidden="true" /> : <Lock className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
                          <span className="min-w-0 flex-1">{lesson.title}</span>
                          <span className="shrink-0 text-xs text-muted-foreground">{formatDuration(lesson.durationSeconds)}</span>
                          {lesson.isPreview && previewUrl && <span className="text-xs font-medium text-primary">{t("preview")}</span>}
                        </button>
                        {previewOpen && previewUrl && (
                          <div className="px-4 pb-4">
                            <BoslaPlayer src={previewUrl} title={lesson.title} poster={undefined} showBrandWatermark />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
