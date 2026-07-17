"use client";

import { useState } from "react";
import { ChevronDown, Lock, Play } from "lucide-react";
import { useTranslations } from "next-intl";
import { BoslaPlayer } from "@/components/player/BoslaPlayer";
import type { CurriculumTree as CurriculumTreeData, CurriculumTreeMode } from "@/learning/types/curriculum-tree";

function formatDuration(seconds: number | null): string {
  if (!seconds) return "";
  const minutes = Math.round(seconds / 60);
  return `${minutes}m`;
}

export function CurriculumTree({
  tree,
  mode,
  previewVideoUrls = {},
}: {
  tree: CurriculumTreeData;
  mode: CurriculumTreeMode;
  previewVideoUrls?: Record<string, string>;
}) {
  const t = useTranslations("CourseCatalog.detail");
  const [openModules, setOpenModules] = useState<string[]>(tree.modules[0]?.id ? [tree.modules[0].id] : []);
  const [openPreview, setOpenPreview] = useState<string | null>(null);

  if (mode !== "marketing") {
    // Learning and summary branches will be added when their consuming surfaces are upgraded.
    return null;
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
