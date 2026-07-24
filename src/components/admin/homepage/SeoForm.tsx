"use client";

import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { updateSeoMetaAction } from "@/cms/actions/seo.actions";
import { seoMetaSchema, type SeoMetaInput } from "@/cms/validators/seo.validator";
import { SectionFormShell } from "@/components/admin/homepage/SectionFormShell";
import { LocalizedTextField } from "@/components/admin/homepage/LocalizedTextField";
import { PlainTextField } from "@/components/admin/homepage/PlainTextField";
import { MediaPickerField } from "@/components/admin/media/MediaPickerField";
import { useContentDirty } from "@/components/admin/homepage/use-content-dirty";
import { useSaveContent } from "@/components/admin/homepage/use-save-content";
import type { Control } from "react-hook-form";
import type { SeoMeta } from "@/cms/types/seo";

/** Google truncates a search-result title/description past roughly these
 *  lengths — informational only (no validation error), so an admin can
 *  judge "will this get cut off" without a hard limit blocking save. */
const TITLE_SOFT_LIMIT = 60;
const DESCRIPTION_SOFT_LIMIT = 160;

function CharCount({
  control,
  name,
  limit,
}: {
  control: Control<SeoMetaInput>;
  name: "title.en" | "title.ar" | "description.en" | "description.ar";
  limit: number;
}) {
  const ts = useTranslations("Admin.homepageEditor.seo");
  const value = useWatch({ control, name }) ?? "";
  const count = value.length;
  return (
    <p className={count > limit ? "text-xs text-amber-600" : "text-xs text-muted-foreground"}>
      {ts("charCount", { count, limit })}
    </p>
  );
}

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
      <div className="space-y-1.5">
        <LocalizedTextField id="seo-title" label={ts("metaTitle")} name="title" register={register} errors={errors} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <CharCount control={control} name="title.en" limit={TITLE_SOFT_LIMIT} />
          <CharCount control={control} name="title.ar" limit={TITLE_SOFT_LIMIT} />
        </div>
      </div>
      <div className="space-y-1.5">
        <LocalizedTextField
          id="seo-description"
          label={ts("metaDescription")}
          name="description"
          register={register}
          errors={errors}
          multiline
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <CharCount control={control} name="description.en" limit={DESCRIPTION_SOFT_LIMIT} />
          <CharCount control={control} name="description.ar" limit={DESCRIPTION_SOFT_LIMIT} />
        </div>
      </div>
      <MediaPickerField label={ts("ogImageId")} name="ogImageId" control={control} hint={ts("ogImageHint")} accept={["image"]} />
      <PlainTextField
        id="seo-canonical-path"
        label={ts("canonicalPath")}
        name="canonicalPath"
        register={register}
        errors={errors}
        hint={ts("canonicalPathHint")}
        placeholder="/courses/example-slug"
      />
    </SectionFormShell>
  );
}
