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
import { ArrayFieldEditor } from "@/components/admin/homepage/ArrayFieldEditor";
import { generateItemId } from "@/components/admin/homepage/form-utils";
import { useContentDirty } from "@/components/admin/homepage/use-content-dirty";
import { useSaveContent } from "@/components/admin/homepage/use-save-content";
import type { WhyBoslaSectionContent } from "@/cms/types/section";

export function WhyBoslaSectionForm({
  sectionId,
  content,
  updatedAt,
  onSaved,
  onDirtyChange,
}: {
  sectionId: string;
  content: WhyBoslaSectionContent;
  updatedAt: string;
  onSaved: (content: WhyBoslaSectionContent) => void;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const t = useTranslations("Admin.homepageEditor");
  const ts = useTranslations("Admin.homepageEditor.sections.whyBosla");

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<WhyBoslaSectionContent>({
    resolver: zodResolver(CMS_SECTION_CONTENT_SCHEMAS.why_bosla),
    defaultValues: content,
  });

  const items = useFieldArray({ control, name: "items", keyName: "fieldId" });

  const isDirty = useContentDirty(control, content);

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  const { submit, error, setError } = useSaveContent(
    updatedAt,
    (values: WhyBoslaSectionContent, expectedUpdatedAt) =>
      updateSectionAction(sectionId, { content: values }, expectedUpdatedAt),
    (data) => data.updatedAt,
  );

  async function onSubmit(values: WhyBoslaSectionContent) {
    const saved = await submit(values);
    if (saved) {
      const savedContent = saved.content as WhyBoslaSectionContent;
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
      <LocalizedTextField id="wb-eyebrow" label={ts("eyebrow")} name="eyebrow" register={register} errors={errors} />
      <LocalizedTextField id="wb-title" label={ts("titleField")} name="title" register={register} errors={errors} />
      <LocalizedTextField
        id="wb-subtitle"
        label={ts("subtitle")}
        name="subtitle"
        register={register}
        errors={errors}
        multiline
      />

      <ArrayFieldEditor
        label={ts("itemsTitle")}
        fields={items.fields}
        onAdd={() =>
          items.append({
            id: generateItemId(),
            icon: "",
            title: { en: "", ar: "" },
            description: { en: "", ar: "" },
          })
        }
        onRemove={items.remove}
        onMoveUp={(index) => items.move(index, index - 1)}
        onMoveDown={(index) => items.move(index, index + 1)}
        addLabel={t("addItem")}
        removeLabel={t("removeItem")}
        moveUpLabel={t("moveItemUp")}
        moveDownLabel={t("moveItemDown")}
        emptyLabel={t("noItems")}
        renderItem={(field, index) => (
          <div className="space-y-2">
            <PlainTextField
              id={`wb-item-${field.fieldId}-icon`}
              label={ts("itemIcon")}
              name={`items.${index}.icon`}
              register={register}
              errors={errors}
            />
            <LocalizedTextField
              id={`wb-item-${field.fieldId}-title`}
              label={ts("itemTitle")}
              name={`items.${index}.title`}
              register={register}
              errors={errors}
            />
            <LocalizedTextField
              id={`wb-item-${field.fieldId}-description`}
              label={ts("itemDescription")}
              name={`items.${index}.description`}
              register={register}
              errors={errors}
              multiline
            />
          </div>
        )}
      />
    </SectionFormShell>
  );
}
