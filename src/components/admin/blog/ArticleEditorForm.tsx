"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter, Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { SectionFormShell } from "@/components/admin/homepage/SectionFormShell";
import { LocalizedTextField } from "@/components/admin/homepage/LocalizedTextField";
import { PlainTextField } from "@/components/admin/homepage/PlainTextField";
import { MediaPickerField } from "@/components/admin/media/MediaPickerField";
import { SeoForm } from "@/components/admin/homepage/SeoForm";
import { LocalizedRichTextField } from "@/components/admin/blog/LocalizedRichTextField";
import { SelectField } from "@/components/admin/courses/SelectField";
import { CheckboxField } from "@/components/admin/courses/CheckboxField";
import { useContentDirty } from "@/components/admin/homepage/use-content-dirty";
import { useSaveContent } from "@/components/admin/homepage/use-save-content";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";
import {
  attachArticleSeoMetaAction,
  createArticleAction,
  updateArticleAction,
} from "@/blog/actions/article.actions";
import { articleFormSchema, type ArticleFormValues } from "@/blog/validators/article.validator";
import type { Article } from "@/blog/types/article";
import type { ResolvedArticleCategory } from "@/blog/types/article-category";
import type { SeoMeta } from "@/cms/types/seo";

function emptyLocalizedText() {
  return { en: "", ar: "" };
}

function articleToFormValues(article: Article | null): ArticleFormValues {
  if (!article) {
    return {
      slug: "",
      title: emptyLocalizedText(),
      excerpt: emptyLocalizedText(),
      body: emptyLocalizedText(),
      coverImageId: null,
      categoryId: null,
      isFeatured: false,
    };
  }
  return {
    slug: article.slug,
    title: article.title,
    excerpt: article.excerpt ?? emptyLocalizedText(),
    body: article.body,
    coverImageId: article.coverImageId,
    categoryId: article.categoryId,
    isFeatured: article.isFeatured,
  };
}

/** The form renders both excerpt inputs always, so "no excerpt" is "both
 *  blank" — normalized to the explicit `null` `createArticleSchema`/
 *  `updateArticleSchema` expect (see `articleFormSchema`'s doc comment). */
function toSubmitPayload(values: ArticleFormValues) {
  const excerptBlank = Object.values(values.excerpt).every((text) => text.trim().length === 0);
  return { ...values, excerpt: excerptBlank ? null : values.excerpt };
}

/**
 * The Article Editor — one reusable form for both Create and Edit,
 * reusing the Course Editor's exact infrastructure (`SectionFormShell`,
 * `LocalizedTextField`, `MediaPickerField`, `SeoForm`, `useContentDirty`,
 * `useSaveContent`, `useUnsavedChangesGuard`) plus the blog's own
 * `LocalizedRichTextField` (Tiptap) for the body. Status is not a form
 * field — publish/unpublish are dedicated row actions on `/admin/articles`
 * (`ArticleService.publish`/`unpublish`), the same separation the course
 * state machine enforces.
 */
export function ArticleEditorForm({
  mode,
  article,
  seo: initialSeo,
  categories,
}: {
  mode: "create" | "edit";
  article: Article | null;
  seo: SeoMeta | null;
  categories: ResolvedArticleCategory[];
}) {
  const t = useTranslations("Admin.homepageEditor");
  const ta = useTranslations("Admin.articleEditor");
  const tArticles = useTranslations("Admin.articles");
  const router = useRouter();

  const [seoMetaId, setSeoMetaId] = useState(article?.seoMetaId ?? null);
  const [seo, setSeo] = useState(initialSeo);
  const [seoDirty, setSeoDirty] = useState(false);
  const [isAttachingSeo, setIsAttachingSeo] = useState(false);

  const defaultValues = articleToFormValues(article);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ArticleFormValues>({
    resolver: zodResolver(articleFormSchema),
    defaultValues,
  });

  const isDirty = useContentDirty(control, defaultValues);
  const hasUnsavedChanges = isDirty || seoDirty;
  useUnsavedChangesGuard(hasUnsavedChanges, t("leaveConfirm"));

  const { submit, error, setError } = useSaveContent<ArticleFormValues, Article>(
    article?.updatedAt ?? new Date(0).toISOString(),
    (values, expectedUpdatedAt) =>
      updateArticleAction(article!.id, toSubmitPayload(values), expectedUpdatedAt),
    (data) => data.updatedAt,
  );

  async function onSubmit(values: ArticleFormValues) {
    if (mode === "create") {
      setError(null);
      try {
        const result = await createArticleAction(toSubmitPayload(values));
        if (!result.success) {
          setError(result.message);
          toast.error(result.code === "conflict" ? result.message : t("saveError"));
          return;
        }
        toast.success(ta("createSuccess"));
        reset(articleToFormValues(result.data));
        router.push(`/admin/articles/${result.data.id}/edit?created=1`);
      } catch {
        setError(t("networkError"));
        toast.error(t("networkError"));
      }
      return;
    }

    const saved = await submit(values);
    if (saved) {
      reset(articleToFormValues(saved));
    }
  }

  /** Without this, a failed client-side validation (e.g. an empty Arabic
   *  body — both locales are required) looks like the Save button doing
   *  nothing: `handleSubmit` never calls `onSubmit`, and the body field's
   *  inline errors may be scrolled out of view. */
  function onInvalid() {
    setError(ta("validationError"));
    toast.error(ta("validationError"));
  }

  async function handleAddSeo() {
    if (!article) return;
    setIsAttachingSeo(true);
    try {
      const result = await attachArticleSeoMetaAction(article.id);
      if (!result.success || !result.data.seoMetaId) {
        toast.error(result.success ? ta("seoAttachError") : result.message);
        return;
      }
      setSeoMetaId(result.data.seoMetaId);
      setSeo({
        id: result.data.seoMetaId,
        title: null,
        description: null,
        ogImageId: null,
        canonicalPath: null,
        updatedAt: result.data.updatedAt,
      });
    } catch {
      toast.error(t("networkError"));
    } finally {
      setIsAttachingSeo(false);
    }
  }

  const categoryOptions = [
    { value: "", label: ta("fields.categoryNone") },
    ...categories.map((category) => ({ value: category.id, label: category.name })),
  ];

  return (
    <div className="space-y-6">
      <SectionFormShell
        isDirty={isDirty}
        isSubmitting={isSubmitting}
        error={error}
        onSubmit={handleSubmit(onSubmit, onInvalid)}
        onCancel={() => {
          setError(null);
          if (mode === "create") {
            router.push("/admin/articles");
          } else {
            reset(defaultValues);
          }
        }}
      >
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-foreground">{ta("sections.basicInfo")}</h2>
          <LocalizedTextField id="article-title" label={ta("fields.title")} name="title" register={register} errors={errors} />
          <PlainTextField
            id="article-slug"
            label={ta("fields.slug")}
            name="slug"
            register={register}
            errors={errors}
            hint={ta("fields.slugHint")}
          />
          <LocalizedTextField
            id="article-excerpt"
            label={ta("fields.excerpt")}
            name="excerpt"
            register={register}
            errors={errors}
            multiline
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {mode === "edit" && article && (
              <div className="space-y-1.5">
                <Label>{ta("fields.status")}</Label>
                <div>
                  <StatusBadge status={article.status}>{tArticles(`status.${article.status}`)}</StatusBadge>
                </div>
                <p className="text-xs text-muted-foreground">{ta("fields.statusHint")}</p>
              </div>
            )}
            <SelectField
              id="article-category"
              label={ta("fields.category")}
              name="categoryId"
              control={control}
              options={categoryOptions}
              nullable
            />
          </div>
          <CheckboxField
            id="article-featured"
            label={ta("fields.featured")}
            name="isFeatured"
            control={control}
            hint={ta("fields.featuredHint")}
          />
        </div>

        <div className="space-y-4 border-t border-border pt-5">
          <h2 className="text-base font-semibold text-foreground">{ta("sections.body")}</h2>
          <LocalizedRichTextField
            label={ta("fields.body")}
            name="body"
            control={control}
            placeholder={ta("fields.bodyPlaceholder")}
          />
        </div>

        <div className="space-y-4 border-t border-border pt-5">
          <h2 className="text-base font-semibold text-foreground">{ta("sections.media")}</h2>
          <MediaPickerField
            label={ta("fields.coverImageId")}
            name="coverImageId"
            control={control}
            hint={ta("fields.coverImageHint")}
            accept={["image"]}
          />
        </div>
      </SectionFormShell>

      {mode === "edit" && (
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-foreground">{t("seo.title")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("seo.description")}</p>
          </div>
          {seoMetaId && seo ? (
            <SeoForm
              seoMetaId={seoMetaId}
              seo={seo}
              onSaved={(saved) => {
                setSeo(saved);
                setSeoDirty(false);
              }}
              onDirtyChange={setSeoDirty}
            />
          ) : (
            <div className="flex flex-col items-start gap-3">
              <p className="text-sm text-muted-foreground">{ta("seoNotSetUp")}</p>
              <Button type="button" variant="outline" size="sm" onClick={handleAddSeo} disabled={isAttachingSeo}>
                {isAttachingSeo ? ta("seoAttaching") : ta("addSeo")}
              </Button>
            </div>
          )}
        </div>
      )}

      {mode === "create" && (
        <p className="text-sm text-muted-foreground">
          {ta("seoAfterCreate")}{" "}
          <Link href="/admin/articles" className="underline underline-offset-2">
            {ta("backToList")}
          </Link>
        </p>
      )}
    </div>
  );
}
