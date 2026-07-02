"use client";

import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { updateSectionAction } from "@/cms/actions/section.actions";
import { CMS_SECTION_CONTENT_SCHEMAS } from "@/cms/validators/section-content.schemas";
import { SectionFormShell } from "@/components/admin/homepage/SectionFormShell";
import { LocalizedTextField } from "@/components/admin/homepage/LocalizedTextField";
import { ArrayFieldEditor } from "@/components/admin/homepage/ArrayFieldEditor";
import { generateItemId } from "@/components/admin/homepage/form-utils";
import { useContentDirty } from "@/components/admin/homepage/use-content-dirty";
import type { LearningExperienceSectionContent } from "@/cms/types/section";

export function LearningExperienceSectionForm({
  sectionId,
  content,
  onSaved,
  onDirtyChange,
}: {
  sectionId: string;
  content: LearningExperienceSectionContent;
  onSaved: (content: LearningExperienceSectionContent) => void;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const t = useTranslations("Admin.homepageEditor");
  const ts = useTranslations("Admin.homepageEditor.sections.learningExperience");
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LearningExperienceSectionContent>({
    resolver: zodResolver(CMS_SECTION_CONTENT_SCHEMAS.learning_experience),
    defaultValues: content,
  });

  const capabilities = useFieldArray({ control, name: "capabilities", keyName: "fieldId" });

  const isDirty = useContentDirty(control, content);

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  async function onSubmit(values: LearningExperienceSectionContent) {
    setError(null);
    const result = await updateSectionAction(sectionId, { content: values });
    if (!result.success) {
      setError(result.message);
      toast.error(t("saveError"));
      return;
    }
    toast.success(t("saveSuccess"));
    const saved = result.data.content as LearningExperienceSectionContent;
    reset(saved);
    onSaved(saved);
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
      <LocalizedTextField id="le-eyebrow" label={ts("eyebrow")} name="eyebrow" register={register} errors={errors} />
      <LocalizedTextField id="le-title" label={ts("titleField")} name="title" register={register} errors={errors} />
      <LocalizedTextField
        id="le-subtitle"
        label={ts("subtitle")}
        name="subtitle"
        register={register}
        errors={errors}
        multiline
      />

      <ArrayFieldEditor
        label={ts("capabilitiesTitle")}
        fields={capabilities.fields}
        onAdd={() => capabilities.append({ id: generateItemId(), label: { en: "", ar: "" } })}
        onRemove={capabilities.remove}
        onMoveUp={(index) => capabilities.move(index, index - 1)}
        onMoveDown={(index) => capabilities.move(index, index + 1)}
        addLabel={t("addItem")}
        removeLabel={t("removeItem")}
        moveUpLabel={t("moveItemUp")}
        moveDownLabel={t("moveItemDown")}
        emptyLabel={t("noItems")}
        renderItem={(field, index) => (
          <LocalizedTextField
            id={`le-capability-${field.fieldId}`}
            label={ts("capabilityLabel")}
            name={`capabilities.${index}.label`}
            register={register}
            errors={errors}
          />
        )}
      />
    </SectionFormShell>
  );
}
