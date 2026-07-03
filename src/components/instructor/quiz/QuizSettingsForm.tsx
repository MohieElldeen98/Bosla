"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { LoadingButton } from "@/components/auth/LoadingButton";
import { LocalizedTextField } from "@/components/admin/homepage/LocalizedTextField";
import { NumberField } from "@/components/admin/courses/NumberField";
import { localizedTextSchema, optionalLocalizedTextSchema } from "@/cms/validators/content-blocks.validator";
import { updateOwnLessonAction } from "@/learning/actions/lesson.actions";
import { updateOwnQuizAction } from "@/learning/actions/quiz.actions";
import type { Lesson } from "@/learning/types/lesson";
import type { Quiz } from "@/learning/types/quiz";

/**
 * A quiz's "title" and "description" are really its lesson's `title`
 * and `body` — the `quizzes` table has no fields of its own for either
 * (see `QuizService.updateOwn`'s doc comment). This form edits both
 * through the *existing* `updateOwnLessonAction` (Step 6.4) and the new
 * `updateOwnQuizAction` (pass threshold only) side by side, so an
 * Instructor doesn't have to bounce back to the Curriculum tree just to
 * rename their quiz — without introducing a second, duplicate title
 * field anywhere in the schema.
 */
const quizSettingsSchema = z.object({
  title: localizedTextSchema,
  body: optionalLocalizedTextSchema,
  passThresholdPercent: z.number().int().min(0).max(100),
});
type QuizSettingsValues = z.infer<typeof quizSettingsSchema>;

function toFormValues(lesson: Lesson, quiz: Quiz): QuizSettingsValues {
  return {
    title: lesson.title,
    body: lesson.body ?? undefined,
    passThresholdPercent: quiz.passThresholdPercent,
  };
}

export function QuizSettingsForm({
  editable,
  lesson,
  quiz,
  onSaved,
}: {
  editable: boolean;
  lesson: Lesson;
  quiz: Quiz;
  onSaved: () => void;
}) {
  const t = useTranslations("Instructor.quiz.settingsForm");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<QuizSettingsValues>({
    resolver: zodResolver(quizSettingsSchema),
    defaultValues: toFormValues(lesson, quiz),
  });

  useEffect(() => {
    reset(toFormValues(lesson, quiz));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson.updatedAt, quiz.updatedAt]);

  async function onSubmit(values: QuizSettingsValues) {
    const lessonResult = await updateOwnLessonAction(
      lesson.id,
      { title: values.title, body: values.body },
      lesson.updatedAt,
    );
    if (!lessonResult.success) {
      toast.error(lessonResult.message);
      if (lessonResult.code === "conflict") onSaved();
      return;
    }

    const quizResult = await updateOwnQuizAction(
      quiz.id,
      { passThresholdPercent: values.passThresholdPercent },
      quiz.updatedAt,
    );
    if (!quizResult.success) {
      toast.error(quizResult.message);
      onSaved();
      return;
    }

    toast.success(t("toasts.saved"));
    onSaved();
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="space-y-4 rounded-2xl border border-border bg-card p-4"
    >
      <h2 className="text-lg font-medium text-foreground">{t("heading")}</h2>
      <fieldset disabled={!editable || isSubmitting} className="space-y-4">
        <LocalizedTextField id="quiz-title" label={t("titleLabel")} name="title" register={register} errors={errors} />
        <LocalizedTextField
          id="quiz-body"
          label={t("descriptionLabel")}
          name="body"
          register={register}
          errors={errors}
          multiline
        />
        <NumberField
          id="quiz-pass-threshold"
          label={t("passThresholdLabel")}
          name="passThresholdPercent"
          register={register}
          errors={errors}
          step="1"
          hint={t("passThresholdHint")}
        />
      </fieldset>
      {editable && (
        <div className="flex justify-end">
          <LoadingButton type="submit" isLoading={isSubmitting} disabled={isSubmitting}>
            {isSubmitting ? t("saving") : t("save")}
          </LoadingButton>
        </div>
      )}
    </form>
  );
}
