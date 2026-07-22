"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Image as ImageIcon, Settings2, Type } from "lucide-react";
import { toast } from "sonner";
import { useRouter, Link } from "@/i18n/navigation";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { EditorSectionCard } from "@/components/admin/EditorSectionCard";
import { SectionFormShell } from "@/components/admin/homepage/SectionFormShell";
import { LocalizedTextField } from "@/components/admin/homepage/LocalizedTextField";
import { PlainTextField } from "@/components/admin/homepage/PlainTextField";
import { MediaPickerField } from "@/components/admin/media/MediaPickerField";
import { SelectField } from "@/components/admin/courses/SelectField";
import { CheckboxField } from "@/components/admin/courses/CheckboxField";
import { NumberField } from "@/components/admin/courses/NumberField";
import { useContentDirty } from "@/components/admin/homepage/use-content-dirty";
import { useSaveContent } from "@/components/admin/homepage/use-save-content";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";
import { createInstructorAction, updateInstructorAction } from "@/courses/actions/instructor.actions";
import { instructorFormSchema, type InstructorFormValues } from "@/courses/validators/instructor.validator";
import type { Instructor } from "@/courses/types/instructor";
import type { ResolvedSpecialty } from "@/courses/types/specialty";

function emptyLocalizedText() {
  return { en: "", ar: "" };
}

function instructorToFormValues(instructor: Instructor | null, specialties: ResolvedSpecialty[]): InstructorFormValues {
  if (!instructor) {
    return {
      slug: "",
      name: emptyLocalizedText(),
      title: emptyLocalizedText(),
      qualification: emptyLocalizedText(),
      bio: emptyLocalizedText(),
      specialtyId: specialties[0]?.id ?? "",
      experienceYears: null,
      avatarImageId: null,
      publicPortraitImageId: null,
      isActive: true,
    };
  }
  return {
    slug: instructor.slug,
    name: instructor.name,
    title: instructor.title ?? emptyLocalizedText(),
    qualification: instructor.qualification ?? emptyLocalizedText(),
    bio: instructor.bio ?? emptyLocalizedText(),
    specialtyId: instructor.specialtyId ?? "",
    experienceYears: instructor.experienceYears,
    avatarImageId: instructor.avatarImageId,
    publicPortraitImageId: instructor.publicPortraitImageId,
    isActive: instructor.isActive,
  };
}

/**
 * The Instructors admin editor (`/admin/instructors`) — one reusable form
 * for both Create and Edit, mirroring `CourseEditorForm`'s shape/infra
 * (`SectionFormShell`, `useContentDirty`, `useSaveContent`,
 * `useUnsavedChangesGuard`) rather than building parallel form plumbing.
 *
 * `isFeatured`/`displayOrder` are deliberately NOT editable fields here —
 * shown read-only instead — because the Featured Instructors panel on the
 * list page is the only place that changes them; editing the same fact
 * from two screens is exactly what this table's own doc comment warns
 * against. `publicPortraitImageId` is admin-only by construction: it's
 * simply absent from `updateOwnInstructorSchema`, so an instructor editing
 * their own profile has no path to it at all.
 */
export function InstructorEditorForm({
  mode,
  instructor,
  specialties,
}: {
  mode: "create" | "edit";
  instructor: Instructor | null;
  specialties: ResolvedSpecialty[];
}) {
  const t = useTranslations("Admin.homepageEditor");
  const ti = useTranslations("Admin.instructorEditor");
  const router = useRouter();

  const [baseline, setBaseline] = useState<InstructorFormValues>(() =>
    instructorToFormValues(instructor, specialties),
  );

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InstructorFormValues>({
    resolver: zodResolver(instructorFormSchema),
    defaultValues: baseline,
  });

  const isDirty = useContentDirty(control, baseline);
  useUnsavedChangesGuard(isDirty, t("leaveConfirm"));

  // `updateInstructorAction` has no optimistic-concurrency parameter today
  // (the Admin `update` path never passed one — see
  // `CourseInstructorService.update`'s doc comment), so `expectedUpdatedAt`
  // is accepted here only to satisfy `useSaveContent`'s shared signature
  // and isn't forwarded.
  const { submit, error, setError } = useSaveContent<InstructorFormValues, Instructor>(
    instructor?.updatedAt ?? new Date(0).toISOString(),
    (values) => updateInstructorAction(instructor!.id, values),
    (data) => data.updatedAt,
  );

  async function onSubmit(values: InstructorFormValues) {
    if (mode === "create") {
      setError(null);
      try {
        const result = await createInstructorAction(values);
        if (!result.success) {
          setError(result.message);
          toast.error(result.code === "conflict" ? result.message : t("saveError"));
          return;
        }
        toast.success(ti("createSuccess"));
        router.push(`/admin/instructors/${result.data.id}/edit`);
      } catch {
        setError(t("networkError"));
        toast.error(t("networkError"));
      }
      return;
    }

    const saved = await submit(values);
    if (saved) {
      const savedValues = instructorToFormValues(saved, specialties);
      setBaseline(savedValues);
      reset(savedValues);
    }
  }

  function onInvalid() {
    setError(ti("validationError"));
    toast.error(ti("validationError"));
  }

  return (
    <div className="space-y-6">
      <SectionFormShell
        isDirty={isDirty}
        isSubmitting={isSubmitting}
        error={error}
        onSubmit={handleSubmit(onSubmit, onInvalid)}
        onCancel={() => {
          setError(null);
          if (mode === "create") {
            router.push("/admin/instructors");
          } else {
            reset(baseline);
          }
        }}
      >
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <EditorSectionCard icon={Type} title={ti("sections.basicInfo.title")}>
              <PlainTextField
                id="instructor-slug"
                label={ti("fields.slug")}
                name="slug"
                register={register}
                errors={errors}
                hint={ti("fields.slugHint")}
              />
              <LocalizedTextField id="instructor-name" label={ti("fields.name")} name="name" register={register} errors={errors} />
              <LocalizedTextField id="instructor-title" label={ti("fields.title")} name="title" register={register} errors={errors} />
              <LocalizedTextField
                id="instructor-qualification"
                label={ti("fields.qualification")}
                name="qualification"
                register={register}
                errors={errors}
              />
              <LocalizedTextField id="instructor-bio" label={ti("fields.bio")} name="bio" register={register} errors={errors} multiline />
            </EditorSectionCard>
          </div>

          <div className="space-y-6">
            <EditorSectionCard icon={Settings2} title={ti("sections.settings.title")}>
              <SelectField
                id="instructor-specialty"
                label={ti("fields.specialty")}
                name="specialtyId"
                control={control}
                options={specialties.map((specialty) => ({ value: specialty.id, label: specialty.name }))}
                placeholder={ti("fields.specialtyPlaceholder")}
              />
              <NumberField
                id="instructor-experience-years"
                label={ti("fields.experienceYears")}
                name="experienceYears"
                register={register}
                errors={errors}
                step="1"
                emptyValue={null}
              />
              <CheckboxField id="instructor-is-active" label={ti("fields.isActive")} name="isActive" control={control} hint={ti("fields.isActiveHint")} />
              {mode === "edit" && instructor && (
                <div className="space-y-1.5">
                  <Label>{ti("fields.featuredStatus")}</Label>
                  <div>
                    {instructor.isFeatured ? (
                      <StatusBadge status="active">
                        {ti("fields.featuredBadge", { position: instructor.displayOrder + 1 })}
                      </StatusBadge>
                    ) : (
                      <StatusBadge status="draft">{ti("fields.notFeatured")}</StatusBadge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{ti("fields.featuredStatusHint")}</p>
                </div>
              )}
            </EditorSectionCard>

            <EditorSectionCard icon={ImageIcon} title={ti("sections.media.title")}>
              <MediaPickerField
                label={ti("fields.avatarImageId")}
                name="avatarImageId"
                control={control}
                hint={ti("fields.avatarImageIdHint")}
                accept={["image"]}
                previewShape="circle"
              />
              <MediaPickerField
                label={ti("fields.publicPortraitImageId")}
                name="publicPortraitImageId"
                control={control}
                hint={ti("fields.publicPortraitImageIdHint")}
                accept={["image"]}
                previewShape="circle"
              />
            </EditorSectionCard>
          </div>
        </div>
      </SectionFormShell>

      {mode === "create" && (
        <p className="text-sm text-muted-foreground">
          <Link href="/admin/instructors" className="underline underline-offset-2">
            {ti("backToList")}
          </Link>
        </p>
      )}
    </div>
  );
}
