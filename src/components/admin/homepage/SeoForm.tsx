"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { updateSeoMetaAction } from "@/cms/actions/seo.actions";
import { seoMetaSchema, type SeoMetaInput } from "@/cms/validators/seo.validator";
import { SectionFormShell } from "@/components/admin/homepage/SectionFormShell";
import { LocalizedTextField } from "@/components/admin/homepage/LocalizedTextField";
import { MediaPickerField } from "@/components/admin/media/MediaPickerField";
import { useContentDirty } from "@/components/admin/homepage/use-content-dirty";
import { useSaveContent } from "@/components/admin/homepage/use-save-content";
import type { SeoMeta } from "@/cms/types/seo";

export function SeoForm({
  pageId,
  seoMetaId,
  seo,
  onSaved,
  onDirtyChange,
}: {
  /** Only used to attribute the CMS audit-log entry — omit when reusing
   *  this form for a non-CMS-page entity (e.g. the Course Editor, Step
   *  3.3), which has no `cms_pages` row and therefore nothing to log
   *  against here (`updateSeoMetaAction`'s `pageId` is already optional). */
  pageId?: string;
  seoMetaId: string;
  seo: SeoMeta;
  onSaved: (seo: SeoMeta) => void;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const ts = useTranslations("Admin.homepageEditor.seo");

  const defaultValues: SeoMetaInput = {
    title: seo.title ?? { en: "", ar: "" },
    description: seo.description ?? { en: "", ar: "" },
    ogImageId: seo.ogImageId ?? null,
    canonicalPath: seo.canonicalPath ?? undefined,
  };

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SeoMetaInput>({
    resolver: zodResolver(seoMetaSchema),
    defaultValues,
  });

  const isDirty = useContentDirty(control, defaultValues);

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  const { submit, error, setError } = useSaveContent(
    seo.updatedAt,
    (values: SeoMetaInput, expectedUpdatedAt) =>
      updateSeoMetaAction(seoMetaId, values, expectedUpdatedAt, pageId),
    (data) => data.updatedAt,
  );

  async function onSubmit(values: SeoMetaInput) {
    const saved = await submit(values);
    if (saved) {
      reset({
        title: saved.title ?? { en: "", ar: "" },
        description: saved.description ?? { en: "", ar: "" },
        ogImageId: saved.ogImageId ?? null,
        canonicalPath: saved.canonicalPath ?? undefined,
      });
      onSaved(saved);
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
        reset(defaultValues);
      }}
    >
      <LocalizedTextField id="seo-title" label={ts("metaTitle")} name="title" register={register} errors={errors} />
      <LocalizedTextField
        id="seo-description"
        label={ts("metaDescription")}
        name="description"
        register={register}
        errors={errors}
        multiline
      />
      <MediaPickerField label={ts("ogImageId")} name="ogImageId" control={control} hint={ts("ogImageHint")} accept={["image"]} />
    </SectionFormShell>
  );
}
