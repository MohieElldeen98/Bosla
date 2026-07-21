"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useLocale, useTranslations } from "next-intl";
import { GripVertical, MoreHorizontal, Video, FileText, HelpCircle, ListChecks } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { resolveLocalizedText } from "@/cms/utils/resolve-localized";
import type { Lesson } from "@/learning/types/lesson";
import type { Locale } from "@/i18n/routing";

const LESSON_TYPE_ICON = { video: Video, reading: FileText, quiz: HelpCircle } as const;

/** One draggable lesson row nested under `CurriculumModuleRow` — its own
 *  `useSortable`, tagged `data: {type:"lesson", moduleId}` so
 *  `CurriculumTreeEditor`'s single `onDragEnd` can tell a lesson drag
 *  apart from a module drag and knows which module's list to reorder
 *  within (Phase 6, Step 6.4 deliberately supports within-module
 *  reordering only, not moving a lesson to a different module). */
export function CurriculumLessonRow({
  lesson,
  editable,
  onEdit,
  onDelete,
  quizHrefBase,
}: {
  lesson: Lesson;
  editable: boolean;
  onEdit: () => void;
  onDelete: () => void;
  /** The quiz editor route a `"quiz"` lesson links into, minus the
   *  trailing lesson id — the caller builds it for whichever workspace it
   *  lives in (instructor id-based, or the public slug-based course
   *  pages), so this row works in both without knowing the shape. */
  quizHrefBase: string;
}) {
  const t = useTranslations("Instructor.curriculum");
  const locale = useLocale() as Locale;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lesson.id,
    data: { type: "lesson", moduleId: lesson.moduleId },
    disabled: !editable,
  });

  const Icon = LESSON_TYPE_ICON[lesson.type];
  const typeLabelKey = lesson.type === "reading" ? "resource" : lesson.type;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2"
      data-dragging={isDragging || undefined}
    >
      {editable && (
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={t("dragLesson")}
          className="cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
        >
          <GripVertical aria-hidden="true" className="size-4" />
        </button>
      )}
      <Icon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate text-sm text-foreground">
        {resolveLocalizedText(lesson.title, locale)}
      </span>
      <Badge variant="outline">{t(`lessonTypes.${typeLabelKey}`)}</Badge>
      {lesson.isPreview && <Badge variant="secondary">{t("previewBadge")}</Badge>}
      {lesson.type === "quiz" && (
        <Button
          variant="ghost"
          size="icon-sm"
          nativeButton={false}
          aria-label={t("manageQuiz")}
          render={<Link href={`${quizHrefBase}/${lesson.id}`} />}
        >
          <ListChecks aria-hidden="true" className="size-4" />
        </Button>
      )}
      {editable && (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button type="button" variant="ghost" size="icon-sm" aria-label={t("lessonActionsFor", { title: resolveLocalizedText(lesson.title, locale) })} />}
          >
            <MoreHorizontal aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>{t("edit")}</DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={onDelete}>
              {t("delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
