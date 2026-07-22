"use client";

import { useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { updateSectionAction } from "@/cms/actions/section.actions";
import { CMS_SECTION_CONTENT_SCHEMAS } from "@/cms/validators/section-content.schemas";
import { SectionFormShell } from "@/components/admin/homepage/SectionFormShell";
import { LocalizedTextField } from "@/components/admin/homepage/LocalizedTextField";
import { PlainTextField } from "@/components/admin/homepage/PlainTextField";
import { CmsLinkFields } from "@/components/admin/homepage/CmsLinkFields";
import { ArrayFieldEditor } from "@/components/admin/homepage/ArrayFieldEditor";
import { MediaPickerField } from "@/components/admin/media/MediaPickerField";
import { generateItemId } from "@/components/admin/homepage/form-utils";
import { useContentDirty } from "@/components/admin/homepage/use-content-dirty";
import { useSaveContent } from "@/components/admin/homepage/use-save-content";
import type { HeroSectionContent } from "@/cms/types/section";

export function HeroSectionForm({
  sectionId,
  content,
  updatedAt,
  onSaved,
  onDirtyChange,
}: {
  sectionId: string;
  content: HeroSectionContent;
  updatedAt: string;
  onSaved: (content: HeroSectionContent) => void;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const t = useTranslations("Admin.homepageEditor");
  const ts = useTranslations("Admin.homepageEditor.sections.hero");

  // `imageId` is optional and, for every seeded Hero row today, genuinely
  // absent (the decorative illustration has no CMS image yet). Normalizing
  // it to `null` rather than leaving the key missing/`undefined` keeps
  // `defaultValues` matching what `MediaPickerField`'s `Controller` (via
  // `MediaPicker`'s own `value: string | null` contract) actually
  // materializes once touched — otherwise "missing key" vs `null` reads
  // as a real diff and the form starts dirty with no edit made.
  const normalizedContent: HeroSectionContent = { ...content, imageId: content.imageId ?? null };

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<HeroSectionContent>({
    resolver: zodResolver(CMS_SECTION_CONTENT_SCHEMAS.hero),
    defaultValues: normalizedContent,
  });

  const highlights = useFieldArray({ control, name: "highlights", keyName: "fieldId" });
  const statistics = useFieldArray({ control, name: "statistics", keyName: "fieldId" });

  const isDirty = useContentDirty(control, normalizedContent);

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  const { submit, error, setError } = useSaveContent(
    updatedAt,
    (values: HeroSectionContent, expectedUpdatedAt) =>
      updateSectionAction(sectionId, { content: values }, expectedUpdatedAt),
    (data) => data.updatedAt,
  );

  async function onSubmit(values: HeroSectionContent) {
    const saved = await submit(values);
    if (saved) {
      const savedContent = saved.content as HeroSectionContent;
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
        reset(normalizedContent);
      }}
    >
      <LocalizedTextField id="hero-eyebrow" label={ts("eyebrow")} name="eyebrow" register={register} errors={errors} />
      <LocalizedTextField
        id="hero-headline-1"
        label={ts("headlineLine1")}
        name="headlineLine1"
        register={register}
        errors={errors}
      />
      <LocalizedTextField
        id="hero-headline-2"
        label={ts("headlineLine2")}
        name="headlineLine2"
        register={register}
        errors={errors}
      />
      <LocalizedTextField
        id="hero-headline-3"
        label={ts("headlineLine3")}
        name="headlineLine3"
        register={register}
        errors={errors}
      />
      <LocalizedTextField
        id="hero-description"
        label={ts("descriptionField")}
        name="description"
        register={register}
        errors={errors}
        multiline
      />
      <MediaPickerField label={ts("imageId")} name="imageId" control={control} hint={ts("imageHint")} accept={["image"]} />

      <CmsLinkFields
        legend={ts("primaryButton")}
        name="primaryButton"
        register={register}
        errors={errors}
        labelText={ts("buttonLabel")}
        hrefLabel={ts("buttonHref")}
      />
      <CmsLinkFields
        legend={ts("secondaryButton")}
        name="secondaryButton"
        register={register}
        errors={errors}
        labelText={ts("buttonLabel")}
        hrefLabel={ts("buttonHref")}
      />

      <ArrayFieldEditor
        label={ts("highlightsTitle")}
        fields={highlights.fields}
        onAdd={() => highlights.append({ id: generateItemId(), icon: "", label: { en: "", ar: "" } })}
        onRemove={highlights.remove}
        onMoveUp={(index) => highlights.move(index, index - 1)}
        onMoveDown={(index) => highlights.move(index, index + 1)}
        addLabel={t("addItem")}
        removeLabel={t("removeItem")}
        moveUpLabel={t("moveItemUp")}
        moveDownLabel={t("moveItemDown")}
        emptyLabel={t("noItems")}
        renderItem={(field, index) => (
          <div className="space-y-2">
            <PlainTextField
              id={`highlight-${index}-icon`}
              label={ts("highlightIcon")}
              name={`highlights.${index}.icon`}
              register={register}
              errors={errors}
            />
            <LocalizedTextField
              id={`highlight-${index}-label`}
              label={ts("highlightLabel")}
              name={`highlights.${index}.label`}
              register={register}
              errors={errors}
            />
          </div>
        )}
      />

      <ArrayFieldEditor
        label={ts("statisticsTitle")}
        fields={statistics.fields}
        onAdd={() =>
          statistics.append({ id: generateItemId(), icon: "", value: "", label: { en: "", ar: "" } })
        }
        onRemove={statistics.remove}
        onMoveUp={(index) => statistics.move(index, index - 1)}
        onMoveDown={(index) => statistics.move(index, index + 1)}
        addLabel={t("addItem")}
        removeLabel={t("removeItem")}
        moveUpLabel={t("moveItemUp")}
        moveDownLabel={t("moveItemDown")}
        emptyLabel={t("noItems")}
        renderItem={(field, index) => (
          <div className="space-y-2">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <PlainTextField
                id={`statistic-${index}-icon`}
                label={ts("statisticIcon")}
                name={`statistics.${index}.icon`}
                register={register}
                errors={errors}
              />
              <PlainTextField
                id={`statistic-${index}-value`}
                label={ts("statisticValue")}
                name={`statistics.${index}.value`}
                register={register}
                errors={errors}
              />
            </div>
            <LocalizedTextField
              id={`statistic-${index}-label`}
              label={ts("statisticLabel")}
              name={`statistics.${index}.label`}
              register={register}
              errors={errors}
            />
          </div>
        )}
      />
    </SectionFormShell>
  );
}
