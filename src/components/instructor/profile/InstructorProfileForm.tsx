"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { LoadingButton } from "@/components/auth/LoadingButton";
import { LocalizedTextField } from "@/components/admin/homepage/LocalizedTextField";
import { NumberField } from "@/components/admin/courses/NumberField";
import { MediaPickerField } from "@/components/admin/media/MediaPickerField";
import { localizedTextSchema, optionalLocalizedTextSchema } from "@/cms/validators/content-blocks.validator";
import { updateOwnInstructorAction } from "@/courses/actions/instructor.actions";
import type { Instructor } from "@/courses/types/instructor";

/** Mirrors `courses/validators/instructor.validator.ts`'s
 *  `updateOwnInstructorSchema` — same "own local form schema, server
 *  keeps its own" split every other Own-scoped form in this codebase
 *  uses (see `LessonFormSheet`). `avatarImageId` goes through the real
 *  Media Library picker (`MediaPickerField`, Phase 7 Step 7.1) instead
 *  of a typed-in raw id. */
const profileFormSchema = z.object({
  name: localizedTextSchema,
  title: optionalLocalizedTextSchema,
  qualification: optionalLocalizedTextSchema,
  bio: optionalLocalizedTextSchema,
  experienceYears: z.number().int().min(0).nullable().optional(),
  avatarImageId: z.string().uuid().nullable().optional(),
});
type ProfileFormValues = z.infer<typeof profileFormSchema>;

function toFormValues(instructor: Instructor): ProfileFormValues {
  return {
    name: instructor.name,
    title: instructor.title ?? undefined,
    qualification: instructor.qualification ?? undefined,
    bio: instructor.bio ?? undefined,
    experienceYears: instructor.experienceYears,
    avatarImageId: instructor.avatarImageId,
  };
}

/**
 * The Instructor Profile editor (`/instructor/profile`, Phase 6, Step
 * 6.6) — a single, always-editable form (no Sheet/modal — this is the
 * whole page, matching `CouponEditorForm`/`CourseEditorForm`'s "own
 * page" pattern, not the Curriculum Builder's modal-form pattern).
 */
export function InstructorProfileForm({ instructor }: { instructor: Instructor }) {
  const t = useTranslations("Instructor.profile");
  const router = useRouter();

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: toFormValues(instructor),
  });

  useEffect(() => {
    reset(toFormValues(instructor));
  }, [instructor, reset]);

  async function onSubmit(values: ProfileFormValues) {
    const result = await updateOwnInstructorAction(values, instructor.updatedAt);
    if (!result.success) {
      toast.error(result.message);
      if (result.code === "conflict") router.refresh();
      return;
    }
    toast.success(t("toasts.saved"));
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="max-w-2xl space-y-5">
      <LocalizedTextField id="profile-name" label={t("nameLabel")} name="name" register={register} errors={errors} />
      <LocalizedTextField id="profile-title" label={t("titleLabel")} name="title" register={register} errors={errors} />
      <LocalizedTextField
        id="profile-qualification"
        label={t("qualificationLabel")}
        name="qualification"
        register={register}
        errors={errors}
      />
      <LocalizedTextField id="profile-bio" label={t("bioLabel")} name="bio" register={register} errors={errors} multiline />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <NumberField
          id="profile-experience-years"
          label={t("experienceYearsLabel")}
          name="experienceYears"
          register={register}
          errors={errors}
          step="1"
          emptyValue={null}
        />
        <MediaPickerField
          label={t("avatarImageIdLabel")}
          name="avatarImageId"
          control={control}
          hint={t("avatarImageIdHint")}
          accept={["image"]}
        />
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
        <LoadingButton type="submit" isLoading={isSubmitting} disabled={isSubmitting}>
          {isSubmitting ? t("saving") : t("save")}
        </LoadingButton>
      </div>
    </form>
  );
}
