"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { updateSectionAction } from "@/cms/actions/section.actions";
import { CMS_SECTION_CONTENT_SCHEMAS } from "@/cms/validators/section-content.schemas";
import { SectionFormShell } from "@/components/admin/homepage/SectionFormShell";
import { LocalizedTextField } from "@/components/admin/homepage/LocalizedTextField";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useContentDirty } from "@/components/admin/homepage/use-content-dirty";
import { useSaveContent } from "@/components/admin/homepage/use-save-content";
import type { FeaturedCoursesSectionContent } from "@/cms/types/section";

export function FeaturedCoursesSectionForm({
  sectionId,
  content,
  updatedAt,
  onSaved,
  onDirtyChange,
}: {
  sectionId: string;
  content: FeaturedCoursesSectionContent;
  updatedAt: string;
  onSaved: (content: FeaturedCoursesSectionContent) => void;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const ts = useTranslations("Admin.homepageEditor.sections.featuredCourses");

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FeaturedCoursesSectionContent>({
    resolver: zodResolver(CMS_SECTION_CONTENT_SCHEMAS.featured_courses),
    defaultValues: content,
  });

  const isDirty = useContentDirty(control, content);

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  const { submit, error, setError } = useSaveContent(
    updatedAt,
    (values: FeaturedCoursesSectionContent, expectedUpdatedAt) =>
      updateSectionAction(sectionId, { content: values }, expectedUpdatedAt),
    (data) => data.updatedAt,
  );

  async function onSubmit(values: FeaturedCoursesSectionContent) {
    const saved = await submit(values);
    if (saved) {
      const savedContent = saved.content as FeaturedCoursesSectionContent;
      reset(savedContent);
      onSaved(savedContent);
    }
  }

  return (
    <SectionFormShell
      isDirty={isDirty}
      isSubmitting={isSubmitting}
      error={error}
      onSubmit={handleSubmit(onSubmit)}
      onCancel={() => {
        setError(null);
        reset(content);
      }}
    >
      <LocalizedTextField id="fc-eyebrow" label={ts("eyebrow")} name="eyebrow" register={register} errors={errors} />
      <LocalizedTextField id="fc-title" label={ts("titleField")} name="title" register={register} errors={errors} />
      <LocalizedTextField
        id="fc-subtitle"
        label={ts("subtitle")}
        name="subtitle"
        register={register}
        errors={errors}
        multiline
      />

      {/* `courseIds` is a plain ordered string array (not the usual
          `{id, ...}`-shaped item), so it's edited as one ID per line —
          simpler than reusable array-item chrome for what's explicitly a
          temporary stand-in until a real Courses table/picker exists. */}
      <div className="space-y-1.5">
        <Label htmlFor="fc-course-ids">{ts("courseIdsTitle")}</Label>
        <Controller
          control={control}
          name="courseIds"
          render={({ field }) => (
            <Textarea
              id="fc-course-ids"
              dir="ltr"
              rows={4}
              placeholder="00000000-0000-0000-0000-000000000000"
              value={field.value.join("\n")}
              onChange={(event) =>
                field.onChange(
                  event.target.value
                    .split("\n")
                    .map((line) => line.trim())
                    .filter(Boolean),
                )
              }
              onBlur={field.onBlur}
            />
          )}
        />
        <p className="text-xs text-muted-foreground">{ts("courseIdsHint")}</p>
      </div>
    </SectionFormShell>
  );
}
