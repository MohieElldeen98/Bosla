"use client";

import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { LoadingButton } from "@/components/auth/LoadingButton";
import { Button } from "@/components/ui/button";
import { LocalizedTextField } from "@/components/admin/homepage/LocalizedTextField";
import { NumberField } from "@/components/admin/courses/NumberField";
import { CheckboxField } from "@/components/admin/courses/CheckboxField";
import { SelectField } from "@/components/admin/courses/SelectField";
import { MediaPickerField } from "@/components/admin/media/MediaPickerField";
import { LessonAttachmentsManager } from "@/components/instructor/curriculum/LessonAttachmentsManager";
import { localizedTextSchema, optionalLocalizedTextSchema } from "@/cms/validators/content-blocks.validator";
import { createOwnLessonAction, updateOwnLessonAction } from "@/learning/actions/lesson.actions";
import { LESSON_TYPES } from "@/learning/types/lesson-type";
import type { CurriculumModule } from "@/learning/types/curriculum";
import type { Lesson } from "@/learning/types/lesson";

/** "Resource" in the Curriculum Builder's own UI is the existing
 *  `"reading"` lesson type (db/schema/learning.ts, Step 4.1) — a
 *  text/attachment-backed lesson, same underlying data, just the label
 *  an Instructor sees. Not a new enum value: renaming the stored value
 *  would touch the already-shipped Course Player (Step 4.4), which is
 *  out of this step's scope; this keeps `lessonTypeEnum` untouched. */
const LESSON_TYPE_LABEL_KEYS: Record<(typeof LESSON_TYPES)[number], string> = {
  video: "video",
  reading: "resource",
  quiz: "quiz",
};

/**
 * `body` uses `optionalLocalizedTextSchema`, not the plain
 * `localizedTextSchema.nullable()` the server-side validator settles
 * for — this form always renders both EN/AR inputs (when `type` shows
 * them at all) and the field is genuinely optional (only `"reading"`
 * lessons use it), so "both left blank" has to mean "omitted," the same
 * reasoning that schema's own doc comment gives. `videoAssetId` is a
 * plain `nullable().optional()` UUID, picked through the real Media
 * Library (`MediaPickerField`, Phase 7 Step 7.1) instead of typed in.
 */
const lessonFormSchema = z.object({
  title: localizedTextSchema,
  type: z.enum(LESSON_TYPES),
  videoAssetId: z.string().uuid().nullable().optional(),
  body: optionalLocalizedTextSchema,
  durationSeconds: z.number().int().min(0).nullable().optional(),
  isPreview: z.boolean(),
});
type LessonFormValues = z.infer<typeof lessonFormSchema>;

function emptyLocalizedText() {
  return { en: "", ar: "" };
}

/**
 * Create/Edit Lesson (Curriculum Builder, Phase 6, Step 6.4) — same
 * `Sheet`-based pattern as `ModuleFormSheet`. `type` drives which of
 * `videoAssetId`/`body` is shown (a `"quiz"` lesson has neither — its
 * placeholder `Quiz` row is auto-managed by `LessonService.createOwn`/
 * `.updateOwn`, question authoring is a later step). `moduleId`/
 * `position` are never form fields, same reasoning as
 * `ModuleFormSheet`'s `courseId`/`position`.
 */
export function LessonFormSheet({
  open,
  onOpenChange,
  moduleId,
  lesson: editingLesson,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleId: string;
  lesson: CurriculumModule["lessons"][number] | null;
  onSaved: () => void;
}) {
  const t = useTranslations("Instructor.curriculum.lessonForm");

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LessonFormValues>({
    resolver: zodResolver(lessonFormSchema),
    defaultValues: defaultLessonFormValues(),
  });

  const type = useWatch({ control, name: "type" });

  useEffect(() => {
    if (open) {
      reset(editingLesson ? lessonToFormValues(editingLesson) : defaultLessonFormValues());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingLesson?.id]);

  async function onSubmit(values: LessonFormValues) {
    const result = editingLesson
      ? await updateOwnLessonAction(editingLesson.id, values, editingLesson.updatedAt)
      : await createOwnLessonAction({ moduleId, ...values });

    if (!result.success) {
      toast.error(result.message);
      if (result.code === "conflict") {
        onOpenChange(false);
        onSaved();
      }
      return;
    }
    toast.success(editingLesson ? t("toasts.updated") : t("toasts.created"));
    onOpenChange(false);
    onSaved();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex h-full flex-col">
          <SheetHeader>
            <SheetTitle>{editingLesson ? t("editTitle") : t("createTitle")}</SheetTitle>
          </SheetHeader>
          <div className="flex-1 space-y-4 overflow-y-auto px-4">
            <LocalizedTextField id="lesson-title" label={t("titleLabel")} name="title" register={register} errors={errors} />
            <SelectField
              id="lesson-type"
              label={t("typeLabel")}
              name="type"
              control={control}
              options={LESSON_TYPES.map((lessonType) => ({
                value: lessonType,
                label: t(`types.${LESSON_TYPE_LABEL_KEYS[lessonType]}`),
              }))}
            />
            {type === "video" && (
              <MediaPickerField
                label={t("videoAssetIdLabel")}
                name="videoAssetId"
                control={control}
                hint={t("videoAssetIdHint")}
                accept={["video"]}
              />
            )}
            {type === "reading" && (
              <LocalizedTextField id="lesson-body" label={t("bodyLabel")} name="body" register={register} errors={errors} multiline />
            )}
            {type === "quiz" && <p className="text-xs text-muted-foreground">{t("quizHint")}</p>}
            <NumberField
              id="lesson-duration"
              label={t("durationLabel")}
              name="durationSeconds"
              register={register}
              errors={errors}
              step="1"
              emptyValue={null}
              hint={t("durationHint")}
            />
            <CheckboxField id="lesson-is-preview" label={t("isPreviewLabel")} name="isPreview" control={control} hint={t("isPreviewHint")} />
            {/* Edit-only: an attachment row needs a lesson id to point at,
                which a not-yet-created lesson doesn't have. */}
            {editingLesson && type !== "quiz" && <LessonAttachmentsManager lessonId={editingLesson.id} />}
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

function defaultLessonFormValues(): LessonFormValues {
  return {
    title: emptyLocalizedText(),
    type: "video",
    videoAssetId: null,
    body: undefined,
    durationSeconds: null,
    isPreview: false,
  };
}

function lessonToFormValues(lesson: Lesson): LessonFormValues {
  return {
    title: lesson.title,
    type: lesson.type,
    videoAssetId: lesson.videoAssetId,
    body: lesson.body ?? undefined,
    durationSeconds: lesson.durationSeconds,
    isPreview: lesson.isPreview,
  };
}
