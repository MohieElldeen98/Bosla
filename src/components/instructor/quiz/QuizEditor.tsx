"use client";

import { useEffect, useState } from "react";
import { useRouter, Link } from "@/i18n/navigation";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/admin/EmptyState";
import { QuizSettingsForm } from "@/components/instructor/quiz/QuizSettingsForm";
import { QuestionRow } from "@/components/instructor/quiz/QuestionRow";
import { QuestionFormSheet } from "@/components/instructor/quiz/QuestionFormSheet";
import { reorderOwnQuizQuestionsAction, deleteOwnQuizQuestionAction } from "@/learning/actions/quiz-question.actions";
import { resolveLocalizedText } from "@/cms/utils/resolve-localized";
import type { Lesson } from "@/learning/types/lesson";
import type { Quiz } from "@/learning/types/quiz";
import type { QuizQuestion } from "@/learning/types/quiz-question";
import type { Locale } from "@/i18n/routing";

/**
 * The Quiz Editor (`/instructor/courses/[id]/curriculum/quiz/[lessonId]`,
 * Phase 6, Step 6.5) — same overall shape as `CurriculumTreeEditor`
 * (Step 6.4): a `DndContext`/`SortableContext` pair for question
 * ordering, local state resynced from `initialQuestions` via `useEffect`
 * after `router.refresh()`, and a `Sheet`-based Create/Edit form. One
 * level of tree instead of two — a quiz's questions don't nest further
 * (a question's *choices* are ordered inside `QuestionFormSheet` itself,
 * via simple move-up/move-down controls rather than a second nested
 * `DndContext` — reasonable for a handful of short strings inside a
 * modal, unlike the module/lesson tree this mirrors).
 */
export function QuizEditor({
  editable,
  lesson,
  quiz,
  initialQuestions,
  curriculumHref,
}: {
  editable: boolean;
  lesson: Lesson;
  quiz: Quiz;
  initialQuestions: QuizQuestion[];
  /** The curriculum route the "back" link returns to — the caller builds
   *  it for its own workspace (instructor id-based, or the public
   *  slug-based course pages). */
  curriculumHref: string;
}) {
  const t = useTranslations("Instructor.quiz");
  const locale = useLocale() as Locale;
  const router = useRouter();

  const [questions, setQuestions] = useState(initialQuestions);
  useEffect(() => {
    setQuestions(initialQuestions);
  }, [initialQuestions]);

  const [questionSheet, setQuestionSheet] = useState<{ open: boolean; question: QuizQuestion | null }>({
    open: false,
    question: null,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function refresh() {
    router.refresh();
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = questions.findIndex((q) => q.id === active.id);
    const newIndex = questions.findIndex((q) => q.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(questions, oldIndex, newIndex);
    setQuestions(reordered);
    const result = await reorderOwnQuizQuestionsAction({ quizId: quiz.id, questionIds: reordered.map((q) => q.id) });
    if (!result.success) {
      toast.error(result.message);
      refresh();
    }
  }

  function handleDeleteQuestion(question: QuizQuestion) {
    if (!window.confirm(t("confirmDeleteQuestion", { prompt: resolveLocalizedText(question.prompt, locale) }))) return;
    startDeleteQuestion(question.id);
  }

  async function startDeleteQuestion(id: string) {
    const result = await deleteOwnQuizQuestionAction(id);
    if (!result.success) {
      toast.error(result.message);
      return;
    }
    toast.success(t("toasts.questionDeleted"));
    setQuestions((prev) => prev.filter((q) => q.id !== id));
    refresh();
  }

  return (
    <div className="space-y-6">
      <Link
        href={curriculumHref}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft aria-hidden="true" className="size-4 rtl:rotate-180" />
        {t("backToCurriculum")}
      </Link>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("title")}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{t("description")}</p>
      </div>

      {!editable && (
        <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">{t("readOnlyNotice")}</p>
      )}

      <QuizSettingsForm editable={editable} lesson={lesson} quiz={quiz} onSaved={refresh} />

      <div className="space-y-3">
        <h2 className="text-lg font-medium text-foreground">{t("questionsTitle")}</h2>
        {questions.length === 0 ? (
          <EmptyState
            title={t("noQuestionsTitle")}
            description={t("noQuestionsDescription")}
            action={
              editable ? (
                <Button type="button" size="sm" onClick={() => setQuestionSheet({ open: true, question: null })}>
                  <Plus aria-hidden="true" />
                  {t("addQuestion")}
                </Button>
              ) : undefined
            }
          />
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={questions.map((q) => q.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {questions.map((question, index) => (
                  <QuestionRow
                    key={question.id}
                    question={question}
                    index={index}
                    editable={editable}
                    onEdit={() => setQuestionSheet({ open: true, question })}
                    onDelete={() => handleDeleteQuestion(question)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
        {editable && questions.length > 0 && (
          <Button type="button" variant="outline" onClick={() => setQuestionSheet({ open: true, question: null })}>
            <Plus aria-hidden="true" />
            {t("addQuestion")}
          </Button>
        )}
      </div>

      <QuestionFormSheet
        open={questionSheet.open}
        onOpenChange={(open) => setQuestionSheet((prev) => ({ ...prev, open }))}
        quizId={quiz.id}
        question={questionSheet.question}
        onSaved={refresh}
      />
    </div>
  );
}
