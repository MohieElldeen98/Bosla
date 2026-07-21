"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Save, Upload } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { LoadingButton } from "@/components/auth/LoadingButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { RichTextEditor } from "@/components/admin/blog/RichTextEditor";
import { saveLegalDocumentDraftAction, publishLegalDocumentAction } from "@/cms/actions/legal-document.actions";
import { updateLegalDocumentSchema, type UpdateLegalDocumentInput } from "@/cms/validators/legal-document.validator";
import type { LegalDocument } from "@/cms/types/legal-document";

/**
 * The `/admin/content/[slug]` editor — one form covering BOTH locales at
 * once (unlike the blog's `ArticleEditorForm`, which is deliberately
 * single-language per article): a legal document must always be
 * complete in English and Arabic together, since the public pages have
 * no "this language isn't ready yet" fallback. The English/Arabic tab
 * toggle only changes which panel is *visible* — both sets of fields
 * stay registered in the same `useForm` the whole time (react-hook-form
 * keeps unmounted field values by default), so switching tabs back and
 * forth never loses a draft in the other language.
 *
 * "Save Draft" persists content without publishing (the public page
 * keeps serving whatever was last published); "Publish" saves AND bumps
 * the version/`publishedAt` in one step — the two buttons map exactly
 * to `LegalDocumentService.saveDraft`/`.publish`.
 */
export function LegalDocumentEditorForm({ document }: { document: LegalDocument }) {
  const t = useTranslations("Admin.content");
  const router = useRouter();
  const [activeLocale, setActiveLocale] = useState<"en" | "ar">("en");
  const [error, setError] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<UpdateLegalDocumentInput>({
    resolver: zodResolver(updateLegalDocumentSchema),
    defaultValues: {
      titleEn: document.titleEn,
      titleAr: document.titleAr,
      contentEn: document.contentEn,
      contentAr: document.contentAr,
    },
  });

  async function onSaveDraft(values: UpdateLegalDocumentInput) {
    setError(null);
    const result = await saveLegalDocumentDraftAction(document.id, values);
    if (result.success) {
      toast.success(t("toasts.draftSaved"));
      router.refresh();
    } else {
      setError(result.message);
    }
  }

  async function onPublish(values: UpdateLegalDocumentInput) {
    setError(null);
    setIsPublishing(true);
    const result = await publishLegalDocumentAction(document.id, values);
    setIsPublishing(false);
    if (result.success) {
      toast.success(t("toasts.published"));
      router.refresh();
    } else {
      setError(result.message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-sm">
        <StatusBadge status={document.published ? "published" : "draft"}>
          {t(document.published ? "status.published" : "status.draft")}
        </StatusBadge>
        <span className="text-muted-foreground">{t("versionLabel", { version: document.version })}</span>
        {document.publishedAt && (
          <span className="text-muted-foreground">
            {t("lastPublished", {
              date: new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
                new Date(document.publishedAt),
              ),
            })}
          </span>
        )}
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="inline-flex rounded-lg border border-border bg-muted/40 p-1">
        <button
          type="button"
          onClick={() => setActiveLocale("en")}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            activeLocale === "en" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("englishTab")}
        </button>
        <button
          type="button"
          onClick={() => setActiveLocale("ar")}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            activeLocale === "ar" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("arabicTab")}
        </button>
      </div>

      <div className={activeLocale === "en" ? "space-y-4" : "hidden"}>
        <div className="space-y-1.5">
          <Label htmlFor="legal-title-en">{t("titleLabel")}</Label>
          <Input id="legal-title-en" dir="ltr" {...register("titleEn")} />
        </div>
        <Controller
          control={control}
          name="contentEn"
          render={({ field }) => (
            <RichTextEditor value={field.value} onChange={field.onChange} dir="ltr" placeholder={t("contentPlaceholder")} />
          )}
        />
      </div>

      <div className={activeLocale === "ar" ? "space-y-4" : "hidden"}>
        <div className="space-y-1.5">
          <Label htmlFor="legal-title-ar">{t("titleLabel")}</Label>
          <Input id="legal-title-ar" dir="rtl" {...register("titleAr")} />
        </div>
        <Controller
          control={control}
          name="contentAr"
          render={({ field }) => (
            <RichTextEditor value={field.value} onChange={field.onChange} dir="rtl" placeholder={t("contentPlaceholder")} />
          )}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-6">
        <LoadingButton
          type="button"
          variant="outline"
          isLoading={isSubmitting && !isPublishing}
          onClick={handleSubmit(onSaveDraft)}
        >
          <Save aria-hidden="true" />
          {t("saveDraft")}
        </LoadingButton>
        <LoadingButton type="button" isLoading={isPublishing} onClick={handleSubmit(onPublish)}>
          <Upload aria-hidden="true" />
          {t("publish")}
        </LoadingButton>
      </div>
    </div>
  );
}
