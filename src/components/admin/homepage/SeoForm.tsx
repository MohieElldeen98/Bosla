"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { updateSeoMetaAction } from "@/cms/actions/seo.actions";
import { seoMetaSchema, type SeoMetaInput } from "@/cms/validators/seo.validator";
import { SectionFormShell } from "@/components/admin/homepage/SectionFormShell";
import { LocalizedTextField } from "@/components/admin/homepage/LocalizedTextField";
import { IdReferenceField } from "@/components/admin/homepage/IdReferenceField";
import { useContentDirty } from "@/components/admin/homepage/use-content-dirty";
import type { SeoMeta } from "@/cms/types/seo";

export function SeoForm({
  seoMetaId,
  seo,
  onSaved,
  onDirtyChange,
}: {
  seoMetaId: string;
  seo: SeoMeta;
  onSaved: (seo: SeoMeta) => void;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const t = useTranslations("Admin.homepageEditor");
  const ts = useTranslations("Admin.homepageEditor.seo");
  const [error, setError] = useState<string | null>(null);

  const defaultValues: SeoMetaInput = {
    title: seo.title ?? { en: "", ar: "" },
    description: seo.description ?? { en: "", ar: "" },
    ogImageId: seo.ogImageId ?? undefined,
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

  async function onSubmit(values: SeoMetaInput) {
    setError(null);
    const result = await updateSeoMetaAction(seoMetaId, values);
    if (!result.success) {
      setError(result.message);
      toast.error(t("saveError"));
      return;
    }
    toast.success(t("saveSuccess"));
    reset({
      title: result.data.title ?? { en: "", ar: "" },
      description: result.data.description ?? { en: "", ar: "" },
      ogImageId: result.data.ogImageId ?? undefined,
      canonicalPath: result.data.canonicalPath ?? undefined,
    });
    onSaved(result.data);
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
      <IdReferenceField
        id="seo-og-image"
        label={ts("ogImageId")}
        name="ogImageId"
        register={register}
        errors={errors}
        hint={ts("ogImageHint")}
      />
    </SectionFormShell>
  );
}
