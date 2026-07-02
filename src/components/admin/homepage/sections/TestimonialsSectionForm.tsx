"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { updateSectionAction } from "@/cms/actions/section.actions";
import { CMS_SECTION_CONTENT_SCHEMAS } from "@/cms/validators/section-content.schemas";
import { SectionFormShell } from "@/components/admin/homepage/SectionFormShell";
import { LocalizedTextField } from "@/components/admin/homepage/LocalizedTextField";
import { useContentDirty } from "@/components/admin/homepage/use-content-dirty";
import type { TestimonialsSectionContent } from "@/cms/types/section";

/** Heading only — the testimonials shown are sourced from student reviews,
 *  not authored in the CMS (docs/cms-overview.md §3), so this editor
 *  deliberately doesn't offer an items list. */
export function TestimonialsSectionForm({
  sectionId,
  content,
  onSaved,
  onDirtyChange,
}: {
  sectionId: string;
  content: TestimonialsSectionContent;
  onSaved: (content: TestimonialsSectionContent) => void;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const t = useTranslations("Admin.homepageEditor");
  const ts = useTranslations("Admin.homepageEditor.sections.testimonials");
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TestimonialsSectionContent>({
    resolver: zodResolver(CMS_SECTION_CONTENT_SCHEMAS.testimonials),
    defaultValues: content,
  });

  const isDirty = useContentDirty(control, content);

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  async function onSubmit(values: TestimonialsSectionContent) {
    setError(null);
    const result = await updateSectionAction(sectionId, { content: values });
    if (!result.success) {
      setError(result.message);
      toast.error(t("saveError"));
      return;
    }
    toast.success(t("saveSuccess"));
    const saved = result.data.content as TestimonialsSectionContent;
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
      <LocalizedTextField id="ts-eyebrow" label={ts("eyebrow")} name="eyebrow" register={register} errors={errors} />
      <LocalizedTextField id="ts-title" label={ts("titleField")} name="title" register={register} errors={errors} />
      <LocalizedTextField
        id="ts-subtitle"
        label={ts("subtitle")}
        name="subtitle"
        register={register}
        errors={errors}
        multiline
      />
    </SectionFormShell>
  );
}
