"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { updateSectionAction } from "@/cms/actions/section.actions";
import { CMS_SECTION_CONTENT_SCHEMAS } from "@/cms/validators/section-content.schemas";
import { SectionFormShell } from "@/components/admin/homepage/SectionFormShell";
import { LocalizedTextField } from "@/components/admin/homepage/LocalizedTextField";
import { CmsLinkFields } from "@/components/admin/homepage/CmsLinkFields";
import { useContentDirty } from "@/components/admin/homepage/use-content-dirty";
import { useSaveContent } from "@/components/admin/homepage/use-save-content";
import type { CtaSectionContent } from "@/cms/types/section";

export function CtaSectionForm({
  sectionId,
  content,
  updatedAt,
  onSaved,
  onDirtyChange,
}: {
  sectionId: string;
  content: CtaSectionContent;
  updatedAt: string;
  onSaved: (content: CtaSectionContent) => void;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const t = useTranslations("Admin.homepageEditor");
  const ts = useTranslations("Admin.homepageEditor.sections.cta");

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CtaSectionContent>({
    resolver: zodResolver(CMS_SECTION_CONTENT_SCHEMAS.cta),
    defaultValues: content,
  });

  const isDirty = useContentDirty(control, content);

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  const { submit, error, setError } = useSaveContent(
    updatedAt,
    (values: CtaSectionContent, expectedUpdatedAt) =>
      updateSectionAction(sectionId, { content: values }, expectedUpdatedAt),
    (data) => data.updatedAt,
  );

  async function onSubmit(values: CtaSectionContent) {
    const saved = await submit(values);
    if (saved) {
      const savedContent = saved.content as CtaSectionContent;
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
      <LocalizedTextField id="cta-title" label={ts("titleField")} name="title" register={register} errors={errors} />
      <LocalizedTextField
        id="cta-subtitle"
        label={ts("subtitle")}
        name="subtitle"
        register={register}
        errors={errors}
        multiline
      />

      <CmsLinkFields
        legend={ts("primaryButton")}
        name="primaryButton"
        register={register}
        errors={errors}
        labelText={t("sections.hero.buttonLabel")}
        hrefLabel={t("sections.hero.buttonHref")}
      />
      <CmsLinkFields
        legend={ts("secondaryButton")}
        name="secondaryButton"
        register={register}
        errors={errors}
        labelText={t("sections.hero.buttonLabel")}
        hrefLabel={t("sections.hero.buttonHref")}
      />
    </SectionFormShell>
  );
}
