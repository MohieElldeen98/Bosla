"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useLocale, useTranslations } from "next-intl";
import { ChevronDown, ChevronRight, GripVertical, MoreHorizontal, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/admin/EmptyState";
import { CurriculumLessonRow } from "@/components/instructor/curriculum/CurriculumLessonRow";
import { resolveLocalizedText } from "@/cms/utils/resolve-localized";
import type { CurriculumModule } from "@/learning/types/curriculum";
import type { Lesson } from "@/learning/types/lesson";
import type { Locale } from "@/i18n/routing";

/** One draggable module row — `useSortable` tagged `data:{type:"module"}`,
 *  same convention `CurriculumLessonRow` uses for lessons. Contains its
 *  own nested `SortableContext` for its lessons, so within-module lesson
 *  drag targets stay scoped to just this module's list. */
export function CurriculumModuleRow({
  module,
  editable,
  onEditModule,
  onDeleteModule,
  onAddLesson,
  onEditLesson,
  onDeleteLesson,
  quizHrefBase,
}: {
  module: CurriculumModule;
  editable: boolean;
  onEditModule: () => void;
  onDeleteModule: () => void;
  onAddLesson: () => void;
  onEditLesson: (lesson: Lesson) => void;
  onDeleteLesson: (lesson: Lesson) => void;
  quizHrefBase: string;
}) {
  const t = useTranslations("Instructor.curriculum");
  const locale = useLocale() as Locale;
  const [expanded, setExpanded] = useState(true);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: module.id,
    data: { type: "module" },
    disabled: !editable,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="rounded-2xl border border-border bg-card"
      data-dragging={isDragging || undefined}
    >
      <div className="flex items-center gap-2 p-3">
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-label={expanded ? t("collapseModule") : t("expandModule")}
          className="text-muted-foreground hover:text-foreground"
        >
          {expanded ? <ChevronDown aria-hidden="true" className="size-4" /> : <ChevronRight aria-hidden="true" className="size-4" />}
        </button>
        {editable && (
          <button
            type="button"
            {...attributes}
            {...listeners}
            aria-label={t("dragModule")}
            className="cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
          >
            <GripVertical aria-hidden="true" className="size-4" />
          </button>
        )}
        <span className="min-w-0 flex-1 truncate font-medium text-foreground">
          {resolveLocalizedText(module.title, locale)}
        </span>
        <span className="text-xs text-muted-foreground">{t("lessonCount", { count: module.lessons.length })}</span>
        {editable && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button type="button" variant="ghost" size="icon-sm" aria-label={t("moduleActionsFor", { title: resolveLocalizedText(module.title, locale) })} />}
            >
              <MoreHorizontal aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEditModule}>{t("edit")}</DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={onDeleteModule}>
                {t("delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {expanded && (
        <div className="space-y-2 border-t border-border p-3">
          {module.lessons.length === 0 ? (
            <EmptyState title={t("noLessonsTitle")} description={t("noLessonsDescription")} />
          ) : (
            <SortableContext items={module.lessons.map((lesson) => lesson.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {module.lessons.map((lesson) => (
                  <CurriculumLessonRow
                    key={lesson.id}
                    lesson={lesson}
                    editable={editable}
                    onEdit={() => onEditLesson(lesson)}
                    onDelete={() => onDeleteLesson(lesson)}
                    quizHrefBase={quizHrefBase}
                  />
                ))}
              </div>
            </SortableContext>
          )}
          {editable && (
            <Button type="button" variant="outline" size="sm" onClick={onAddLesson}>
              <Plus aria-hidden="true" />
              {t("addLesson")}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
