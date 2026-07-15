"use client";

import { useState } from "react";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { FileText, Image as ImageIcon, Settings2, Type } from "lucide-react";
import { toast } from "sonner";
import { useRouter, Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { SectionFormShell } from "@/components/admin/homepage/SectionFormShell";
import { MediaPickerField } from "@/components/admin/media/MediaPickerField";
import { SeoForm } from "@/components/admin/homepage/SeoForm";
import { RichTextEditor } from "@/components/admin/blog/RichTextEditor";
import { ArticleReferences } from "@/components/admin/blog/ArticleReferences";
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
import { createArticleSeriesInlineAction } from "@/blog/actions/article-series.actions";
import { articleFormSchema, type ArticleFormValues } from "@/blog/validators/article.validator";
import { articleDirection, ARTICLE_LANGUAGES } from "@/blog/types/article-language";
import type { Article } from "@/blog/types/article";
import type { ResolvedArticleCategory } from "@/blog/types/article-category";
import type { ResolvedArticleSeries } from "@/blog/types/article-series";
import type { SeoMeta } from "@/cms/types/seo";

function articleToFormValues(article: Article | null): ArticleFormValues {
  if (!article) {
    return {
      language: "en",
      title: "",
      excerpt: "",
      body: "",
      references: [],
      coverImageId: null,
      categoryId: null,
      seriesId: null,
      seriesPosition: null,
      isFeatured: false,
    };
  }
  // Single-language authoring: the stored bilingual fields are mirrors of
  // one written text (see `ArticleService`'s `mirrorText`), so loading the
  // article's own language's key is loading the real content.
  return {
    language: article.language,
    title: article.title[article.language],
    excerpt: article.excerpt?.[article.language] ?? "",
    body: article.body[article.language],
    references: article.references,
    coverImageId: article.coverImageId,
    categoryId: article.categoryId,
    seriesId: article.seriesId,
    seriesPosition: article.seriesPosition,
    isFeatured: article.isFeatured,
  };
}

/** Blank excerpt is "no excerpt" — normalized to the explicit `null` the
 *  server schema expects (see `articleFormSchema`'s doc comment). */
function toSubmitPayload(values: ArticleFormValues) {
  return { ...values, excerpt: values.excerpt.trim() ? values.excerpt.trim() : null };
}

function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-xs sm:p-6">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="size-4 text-primary" aria-hidden="true" />
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

/**
 * The Article Editor — one reusable form for both Create and Edit, and
 * for both the Admin Panel and the public blog's author pages (`listHref`
 * / `editHrefTemplate` route it; `showFeaturedField`/`showSeoSection`
 * hide the manager-only surfaces the service strips/re-checks anyway).
 *
 * Articles are written in ONE language — the language picker drives the
 * writing direction of the title/excerpt/body inputs live, and the
 * service mirrors the text into the stored bilingual shape
 * (`docs/database-overview.md` §5). Status is not a form field —
 * publish/unpublish are dedicated transitions.
 */
export function ArticleEditorForm({
  mode,
  article,
  seo: initialSeo,
  categories,
  series,
  listHref = "/admin/articles",
  editHrefTemplate = "/admin/articles/{id}/edit",
  showFeaturedField = true,
  showSeoSection = true,
}: {
  mode: "create" | "edit";
  article: Article | null;
  seo: SeoMeta | null;
  categories: ResolvedArticleCategory[];
  series: ResolvedArticleSeries[];
  listHref?: string;
  /** Where to route after a successful create — a *template string*, not
   *  a callback (`{id}`/`{slug}` are replaced with the saved article's),
   *  because this prop crosses the Server → Client Component boundary,
   *  which only serializable values survive. */
  editHrefTemplate?: string;
  showFeaturedField?: boolean;
  showSeoSection?: boolean;
}) {
  const t = useTranslations("Admin.homepageEditor");
  const ta = useTranslations("Admin.articleEditor");
  const tArticles = useTranslations("Admin.articles");
  const router = useRouter();

  const [seoMetaId, setSeoMetaId] = useState(article?.seoMetaId ?? null);
  const [seo, setSeo] = useState(initialSeo);
  const [seoDirty, setSeoDirty] = useState(false);
  const [isAttachingSeo, setIsAttachingSeo] = useState(false);
  // Local copy so an inline-created series appears and gets selected
  // without a reload.
  const [seriesList, setSeriesList] = useState(series);
  const [newSeriesTitle, setNewSeriesTitle] = useState<string | null>(null);
  const [isCreatingSeries, setIsCreatingSeries] = useState(false);

  // The dirty baseline must FOLLOW saves: `useContentDirty` compares the
  // live form to this object, and the server sanitizes the body on save —
  // so a fixed first-render baseline would read "unsaved changes" forever
  // after the first save (and keep the Save button enabled).
  const [baseline, setBaseline] = useState<ArticleFormValues>(() => articleToFormValues(article));

  const form = useForm<ArticleFormValues>({
    resolver: zodResolver(articleFormSchema),
    defaultValues: baseline,
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = form;

  const language = watch("language");
  const dir = articleDirection(language);

  const isDirty = useContentDirty(control, baseline);
  const hasUnsavedChanges = isDirty || seoDirty;
  useUnsavedChangesGuard(hasUnsavedChanges, t("leaveConfirm"));

  const { submit, error, setError } = useSaveContent<ArticleFormValues, Article>(
    article?.updatedAt ?? new Date(0).toISOString(),
    (values, expectedUpdatedAt) =>
      updateArticleAction(article!.id, toSubmitPayload(values), expectedUpdatedAt),
    (data) => data.updatedAt,
  );

  async function onSubmit(values: ArticleFormValues, publish = true) {
    if (mode === "create") {
      setError(null);
      try {
        const result = await createArticleAction({ ...toSubmitPayload(values), publish });
        if (!result.success) {
          setError(result.message);
          toast.error(result.code === "conflict" ? result.message : t("saveError"));
          return;
        }
        const created = articleToFormValues(result.data);
        setBaseline(created);
        reset(created);
        if (publish) {
          // "I wrote it, I want it live" — straight to the published
          // article, not back into an editor.
          toast.success(ta("publishSuccess"));
          router.push(`/blog/${result.data.slug}`);
        } else {
          toast.success(ta("createSuccess"));
          const editHref = editHrefTemplate
            .replace("{id}", result.data.id)
            .replace("{slug}", result.data.slug);
          router.push(`${editHref}?created=1`);
        }
      } catch {
        setError(t("networkError"));
        toast.error(t("networkError"));
      }
      return;
    }

    const saved = await submit(values);
    if (saved) {
      const next = articleToFormValues(saved);
      setBaseline(next);
      reset(next);
    }
  }

  /** Without this, a failed client-side validation looks like the Save
   *  button doing nothing — `handleSubmit` never calls `onSubmit`, and
   *  the failing field may be scrolled out of view. */
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

  async function handleCreateSeries() {
    if (!newSeriesTitle?.trim()) return;
    setIsCreatingSeries(true);
    try {
      const result = await createArticleSeriesInlineAction(newSeriesTitle.trim());
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      const title = result.data.title[language] ?? result.data.title.en;
      setSeriesList((list) => [...list, { id: result.data.id, slug: result.data.slug, title, description: null, isActive: true, displayOrder: result.data.displayOrder }]);
      setValue("seriesId", result.data.id, { shouldDirty: true });
      setValue("seriesPosition", 1, { shouldDirty: true });
      setNewSeriesTitle(null);
      toast.success(ta("seriesCreated"));
    } catch {
      toast.error(t("networkError"));
    } finally {
      setIsCreatingSeries(false);
    }
  }

  const categoryOptions = [
    { value: "", label: ta("fields.categoryNone") },
    ...categories.map((category) => ({ value: category.id, label: category.name })),
  ];
  const seriesOptions = [{ value: "", label: ta("fields.seriesNone") }, ...seriesList.map((item) => ({ value: item.id, label: item.title }))];

  return (
    <div className="space-y-6">
      <FormProvider {...form}>
      <SectionFormShell
        isDirty={isDirty}
        isSubmitting={isSubmitting}
        error={error}
        onSubmit={handleSubmit((values) => onSubmit(values, true), onInvalid)}
        submitLabel={mode === "create" ? ta("publishArticle") : undefined}
        extraActions={
          mode === "create" ? (
            <Button
              type="button"
              variant="outline"
              disabled={!isDirty || isSubmitting}
              onClick={handleSubmit((values) => onSubmit(values, false), onInvalid)}
            >
              {ta("saveDraft")}
            </Button>
          ) : undefined
        }
        onCancel={() => {
          setError(null);
          if (mode === "create") {
            router.push(listHref);
          } else {
            reset(baseline);
          }
        }}
      >
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* Main writing column. */}
          <div className="space-y-6">
            <SectionCard icon={Type} title={ta("sections.basicInfo")}>
              <div className="space-y-1.5">
                <Label htmlFor="article-title">{ta("fields.title")}</Label>
                <Input
                  id="article-title"
                  dir={dir}
                  placeholder={ta("fields.titlePlaceholder")}
                  className="h-11 text-lg font-medium"
                  aria-invalid={!!errors.title}
                  {...register("title")}
                />
                {errors.title?.message && (
                  <p role="alert" className="text-xs text-destructive">
                    {errors.title.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="article-excerpt">{ta("fields.excerpt")}</Label>
                <Textarea
                  id="article-excerpt"
                  dir={dir}
                  rows={2}
                  placeholder={ta("fields.excerptPlaceholder")}
                  {...register("excerpt")}
                />
              </div>
            </SectionCard>

            <SectionCard icon={FileText} title={ta("sections.body")}>
                <Controller
                name="body"
                control={control}
                render={({ field, fieldState }) => (
                  <>
                    <RichTextEditor
                      value={field.value}
                      onChange={field.onChange}
                      citationCount={watch("references").length}
                      dir={dir}
                      placeholder={ta("fields.bodyPlaceholder")}
                    />
                    {fieldState.error?.message && (
                      <p role="alert" className="text-xs text-destructive">
                        {fieldState.error.message}
                      </p>
                    )}
                  </>
                )}
              />
            </SectionCard>

            <SectionCard icon={FileText} title={ta("sections.references")}>
              {/* Field-array editing flows through the FormProvider —
                  no Controller indirection needed. */}
              <ArticleReferences />
            </SectionCard>
          </div>

          {/* Settings rail. */}
          <div className="space-y-6">
            <SectionCard icon={Settings2} title={ta("sections.settings")}>
              {mode === "edit" && article && (
                <div className="space-y-1.5">
                  <Label>{ta("fields.status")}</Label>
                  <div>
                    <StatusBadge status={article.status}>{tArticles(`status.${article.status}`)}</StatusBadge>
                  </div>
                </div>
              )}
              <SelectField
                id="article-language"
                label={ta("fields.language")}
                name="language"
                control={control}
                options={ARTICLE_LANGUAGES.map((value) => ({
                  value,
                  label: ta(`language.${value}`),
                }))}
              />
              <SelectField
                id="article-category"
                label={ta("fields.category")}
                name="categoryId"
                control={control}
                options={categoryOptions}
                nullable
              />
              <SelectField id="article-series" label={ta("fields.series")} name="seriesId" control={control} options={seriesOptions} nullable />
              {newSeriesTitle === null ? (
                <button
                  type="button"
                  onClick={() => setNewSeriesTitle("")}
                  className="-mt-2 text-xs font-medium text-primary underline-offset-2 hover:underline"
                >
                  + {ta("newSeries")}
                </button>
              ) : (
                <div className="-mt-1 flex items-center gap-2">
                  <Input
                    value={newSeriesTitle}
                    onChange={(event) => setNewSeriesTitle(event.target.value)}
                    placeholder={ta("newSeriesPlaceholder")}
                    dir="auto"
                    className="h-8 text-sm"
                    autoFocus
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void handleCreateSeries();
                      }
                      if (event.key === "Escape") setNewSeriesTitle(null);
                    }}
                  />
                  <Button type="button" size="sm" variant="secondary" disabled={isCreatingSeries} onClick={handleCreateSeries}>
                    {ta("createSeries")}
                  </Button>
                </div>
              )}
              {watch("seriesId") && (
                <div className="space-y-1.5">
                  <Label htmlFor="article-series-position">{ta("fields.seriesPosition")}</Label>
                  <Input id="article-series-position" type="number" min={1} {...register("seriesPosition", { valueAsNumber: true })} />
                  {errors.seriesPosition?.message && <p role="alert" className="text-xs text-destructive">{errors.seriesPosition.message}</p>}
                </div>
              )}
              {showFeaturedField && (
                <CheckboxField
                  id="article-featured"
                  label={ta("fields.featured")}
                  name="isFeatured"
                  control={control}
                  hint={ta("fields.featuredHint")}
                />
              )}
            </SectionCard>

            <SectionCard icon={ImageIcon} title={ta("sections.media")}>
              <MediaPickerField
                label={ta("fields.coverImageId")}
                name="coverImageId"
                control={control}
                hint={ta("fields.coverImageHint")}
                accept={["image"]}
              />
            </SectionCard>
          </div>
        </div>
      </SectionFormShell>
      </FormProvider>

      {mode === "edit" && showSeoSection && (
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
          {showSeoSection && `${ta("seoAfterCreate")} `}
          <Link href={listHref} className="underline underline-offset-2">
            {ta("backToList")}
          </Link>
        </p>
      )}
    </div>
  );
}
