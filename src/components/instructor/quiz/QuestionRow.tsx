"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useLocale, useTranslations } from "next-intl";
import { GripVertical, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { resolveLocalizedText } from "@/cms/utils/resolve-localized";
import type { QuizQuestion } from "@/learning/types/quiz-question";
import type { Locale } from "@/i18n/routing";

/** One draggable question row — same `useSortable` convention as
 *  `CurriculumLessonRow` (Step 6.4), one flat list (a quiz's questions
 *  don't nest). */
export function QuestionRow({
  question,
  index,
  editable,
  onEdit,
  onDelete,
}: {
  question: QuizQuestion;
  index: number;
  editable: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const t = useTranslations("Instructor.quiz");
  const locale = useLocale() as Locale;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: question.id,
    disabled: !editable,
  });

  const prompt = resolveLocalizedText(question.prompt, locale);

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
          aria-label={t("dragQuestion")}
          className="cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
        >
          <GripVertical aria-hidden="true" className="size-4" />
        </button>
      )}
      <span className="shrink-0 text-xs font-medium text-muted-foreground">{index + 1}.</span>
      <span className="min-w-0 flex-1 truncate text-sm text-foreground">{prompt}</span>
      <Badge variant="outline">{t("choiceCount", { count: question.choices.length })}</Badge>
      {editable && (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button type="button" variant="ghost" size="icon-sm" aria-label={t("questionActionsFor", { prompt })} />}
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
