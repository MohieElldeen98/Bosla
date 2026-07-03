"use client";

import { useEffect } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { LoadingButton } from "@/components/auth/LoadingButton";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { LocalizedTextField } from "@/components/admin/homepage/LocalizedTextField";
import { localizedTextSchema } from "@/cms/validators/content-blocks.validator";
import { createOwnQuizQuestionAction, updateOwnQuizQuestionAction } from "@/learning/actions/quiz-question.actions";
import type { QuizQuestion } from "@/learning/types/quiz-question";

/** Mirrors `quiz-question.validator.ts`'s own
 *  `correctChoiceIndex < choices.length` refinement client-side — the
 *  same "form has its own local schema, server keeps its own" split
 *  every other Sheet form in the Curriculum Builder uses (see
 *  `LessonFormSheet`). `quizId`/`position` are never form fields —
 *  `quizId` is fixed by the page, `position` only ever changes through
 *  drag reordering. */
const questionFormSchema = z
  .object({
    prompt: localizedTextSchema,
    choices: z.array(localizedTextSchema).min(2, "A question needs at least two choices."),
    correctChoiceIndex: z.number().int().min(0),
  })
  .refine((data) => data.correctChoiceIndex < data.choices.length, {
    message: "Choose which answer is correct.",
    path: ["correctChoiceIndex"],
  });
type QuestionFormValues = z.infer<typeof questionFormSchema>;

function emptyChoice() {
  return { en: "", ar: "" };
}

function defaultQuestionFormValues(): QuestionFormValues {
  return {
    prompt: { en: "", ar: "" },
    choices: [emptyChoice(), emptyChoice()],
    correctChoiceIndex: 0,
  };
}

function questionToFormValues(question: QuizQuestion): QuestionFormValues {
  return {
    prompt: question.prompt,
    choices: question.choices,
    correctChoiceIndex: question.correctChoiceIndex,
  };
}

/**
 * Create/Edit Question (Quiz Editor, Phase 6, Step 6.5) — same
 * `Sheet`-based pattern as `ModuleFormSheet`/`LessonFormSheet`. Answer
 * choices are a `useFieldArray` (multiple choice, single correct answer
 * via a radio group bound to `correctChoiceIndex`), with move-up/
 * move-down buttons for answer ordering and add/remove for Answer
 * Choice CRUD — reordering/removing a choice keeps `correctChoiceIndex`
 * pointing at the same logical answer, not the same array slot.
 */
export function QuestionFormSheet({
  open,
  onOpenChange,
  quizId,
  question: editingQuestion,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quizId: string;
  question: QuizQuestion | null;
  onSaved: () => void;
}) {
  const t = useTranslations("Instructor.quiz.questionForm");

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<QuestionFormValues>({
    resolver: zodResolver(questionFormSchema),
    defaultValues: defaultQuestionFormValues(),
  });

  const { fields, append, remove, move } = useFieldArray({ control, name: "choices" });
  const correctChoiceIndex = useWatch({ control, name: "correctChoiceIndex" });
  const correctChoiceError = errors.correctChoiceIndex;

  useEffect(() => {
    if (open) {
      reset(editingQuestion ? questionToFormValues(editingQuestion) : defaultQuestionFormValues());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingQuestion?.id]);

  function moveChoice(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= fields.length) return;
    move(index, target);
    if (correctChoiceIndex === index) setValue("correctChoiceIndex", target);
    else if (correctChoiceIndex === target) setValue("correctChoiceIndex", index);
  }

  function removeChoice(index: number) {
    if (fields.length <= 2) return;
    remove(index);
    if (correctChoiceIndex === index) setValue("correctChoiceIndex", 0);
    else if (correctChoiceIndex > index) setValue("correctChoiceIndex", correctChoiceIndex - 1);
  }

  async function onSubmit(values: QuestionFormValues) {
    const result = editingQuestion
      ? await updateOwnQuizQuestionAction(editingQuestion.id, values, editingQuestion.updatedAt)
      : await createOwnQuizQuestionAction({ quizId, ...values });

    if (!result.success) {
      toast.error(result.message);
      if (result.code === "conflict") {
        onOpenChange(false);
        onSaved();
      }
      return;
    }
    toast.success(editingQuestion ? t("toasts.updated") : t("toasts.created"));
    onOpenChange(false);
    onSaved();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex h-full flex-col">
          <SheetHeader>
            <SheetTitle>{editingQuestion ? t("editTitle") : t("createTitle")}</SheetTitle>
          </SheetHeader>
          <div className="flex-1 space-y-4 overflow-y-auto px-4">
            <LocalizedTextField id="question-prompt" label={t("promptLabel")} name="prompt" register={register} errors={errors} multiline />

            <div className="space-y-2">
              <Label>{t("choicesLabel")}</Label>
              <p className="text-xs text-muted-foreground">{t("choicesHint")}</p>
              {correctChoiceError && (
                <p role="alert" className="text-xs text-destructive">
                  {correctChoiceError.message}
                </p>
              )}
              <div className="space-y-3">
                {fields.map((field, index) => (
                  <div key={field.id} className="space-y-2 rounded-lg border border-border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <label className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                        <input
                          type="radio"
                          value={index}
                          checked={correctChoiceIndex === index}
                          onChange={() => setValue("correctChoiceIndex", index)}
                        />
                        {t("correctAnswerLabel")}
                      </label>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t("moveChoiceUp")}
                          disabled={index === 0}
                          onClick={() => moveChoice(index, -1)}
                        >
                          <ArrowUp aria-hidden="true" className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t("moveChoiceDown")}
                          disabled={index === fields.length - 1}
                          onClick={() => moveChoice(index, 1)}
                        >
                          <ArrowDown aria-hidden="true" className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t("removeChoice")}
                          disabled={fields.length <= 2}
                          onClick={() => removeChoice(index)}
                        >
                          <Trash2 aria-hidden="true" className="size-4" />
                        </Button>
                      </div>
                    </div>
                    <LocalizedTextField
                      id={`question-choice-${index}`}
                      label={t("choiceLabel", { number: index + 1 })}
                      name={`choices.${index}`}
                      register={register}
                      errors={errors}
                    />
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => append(emptyChoice())}>
                <Plus aria-hidden="true" />
                {t("addChoice")}
              </Button>
            </div>
          </div>
          <SheetFooter>
            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t("cancel")}
              </Button>
              <LoadingButton type="submit" isLoading={isSubmitting} disabled={isSubmitting}>
                {isSubmitting ? t("saving") : t("save")}
              </LoadingButton>
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
