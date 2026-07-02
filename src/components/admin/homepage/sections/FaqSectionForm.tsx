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
import type { FaqSectionContent } from "@/cms/types/section";

export function FaqSectionForm({
  sectionId,
  content,
  onSaved,
  onDirtyChange,
}: {
  sectionId: string;
  content: FaqSectionContent;
  onSaved: (content: FaqSectionContent) => void;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const t = useTranslations("Admin.homepageEditor");
  const ts = useTranslations("Admin.homepageEditor.sections.faq");
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FaqSectionContent>({
    resolver: zodResolver(CMS_SECTION_CONTENT_SCHEMAS.faq),
    defaultValues: content,
  });

  const items = useFieldArray({ control, name: "items", keyName: "fieldId" });

  const isDirty = useContentDirty(control, content);

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  async function onSubmit(values: FaqSectionContent) {
    setError(null);
    const result = await updateSectionAction(sectionId, { content: values });
    if (!result.success) {
      setError(result.message);
      toast.error(t("saveError"));
      return;
    }
    toast.success(t("saveSuccess"));
    const saved = result.data.content as FaqSectionContent;
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
      <LocalizedTextField id="faq-eyebrow" label={ts("eyebrow")} name="eyebrow" register={register} errors={errors} />
      <LocalizedTextField id="faq-title" label={ts("titleField")} name="title" register={register} errors={errors} />

      <ArrayFieldEditor
        label={ts("itemsTitle")}
        fields={items.fields}
        onAdd={() =>
          items.append({
            id: generateItemId(),
            question: { en: "", ar: "" },
            answer: { en: "", ar: "" },
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
            <LocalizedTextField
              id={`faq-item-${field.fieldId}-question`}
              label={ts("question")}
              name={`items.${index}.question`}
              register={register}
              errors={errors}
            />
            <LocalizedTextField
              id={`faq-item-${field.fieldId}-answer`}
              label={ts("answer")}
              name={`items.${index}.answer`}
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
