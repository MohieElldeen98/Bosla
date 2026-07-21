"use client";

import { useState } from "react";
import { useFieldArray, useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { CircleDollarSign, Clock3, Image as ImageIcon, ListChecks, Settings2, Type } from "lucide-react";
import { toast } from "sonner";
import { useRouter, Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { EditorSectionCard } from "@/components/admin/EditorSectionCard";
import { SectionFormShell } from "@/components/admin/homepage/SectionFormShell";
import { AuthoredTextField } from "@/components/admin/courses/AuthoredTextField";
import { PlainTextField } from "@/components/admin/homepage/PlainTextField";
import { MediaPickerField } from "@/components/admin/media/MediaPickerField";
import { ArrayFieldEditor } from "@/components/admin/homepage/ArrayFieldEditor";
import { SeoForm } from "@/components/admin/homepage/SeoForm";
import { useContentDirty } from "@/components/admin/homepage/use-content-dirty";
import { useSaveContent } from "@/components/admin/homepage/use-save-content";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";
import { SelectField } from "@/components/admin/courses/SelectField";
import { CheckboxField } from "@/components/admin/courses/CheckboxField";
import { NumberField } from "@/components/admin/courses/NumberField";
import { createCourseAction, updateCourseAction, attachSeoMetaAction } from "@/courses/actions/course.actions";
import { courseFormSchema, type CourseFormValues } from "@/courses/validators/course.validator";
import { COURSE_STATUSES } from "@/courses/types/course-status";
import { COURSE_CURRENCIES } from "@/courses/types/course-currency";
import { COURSE_LANGUAGES } from "@/courses/types/course-language";
import { COURSE_LEVELS } from "@/courses/types/course-level";
import type { Course } from "@/courses/types/course";
import type { CourseActionResult } from "@/courses/types/result";
import type { SeoMeta } from "@/cms/types/seo";
import type { ResolvedCategory } from "@/courses/types/category";
import type { ResolvedInstructor } from "@/courses/types/instructor";
import type { ResolvedSpecialty } from "@/courses/types/specialty";

function emptyLocalizedText() {
  return { en: "", ar: "" };
}

/** Which stored key the author's single input binds to — the course's
 *  own language ("both" authors in the site's default, English). */
type AuthoringKey = "en" | "ar";

function mirrorAuthoredText(
  value: { en: string; ar: string } | null | undefined,
  key: AuthoringKey,
): { en: string; ar: string } {
  const text = value?.[key] ?? "";
  return { en: text, ar: text };
}

/**
 * Single-language authoring, the article editor's contract applied to
 * courses: the author writes each text ONCE (in the course's language)
 * and the value is mirrored into the stored bilingual `{en, ar}` shape —
 * exactly what `ArticleService`'s `mirrorText` does server-side for
 * articles. Runs inside the resolver so validation sees the mirrored
 * payload and the server schema stays untouched.
 */
/** Blank optional text is "no value" — normalized to the explicit `null`
 *  the schema expects (`localizedTextSchema` requires non-empty strings,
 *  so `{en:"", ar:""}` would fail validation; same normalization the
 *  article editor applies to its blank excerpt). */
function mirrorOptionalText(
  value: { en: string; ar: string } | null | undefined,
  key: AuthoringKey,
): { en: string; ar: string } | null {
  const mirrored = mirrorAuthoredText(value, key);
  return mirrored.en.trim() ? mirrored : null;
}

function mirrorLocalizedFields(values: CourseFormValues): CourseFormValues {
  const key: AuthoringKey = values.language === "ar" ? "ar" : "en";
  return {
    ...values,
    title: mirrorAuthoredText(values.title, key),
    subtitle: mirrorOptionalText(values.subtitle, key),
    description: mirrorAuthoredText(values.description, key),
    shortDescription: mirrorOptionalText(values.shortDescription, key),
    requirements: values.requirements.map((item) => mirrorAuthoredText(item, key)),
    learningObjectives: values.learningObjectives.map((item) => mirrorAuthoredText(item, key)),
    targetAudience: values.targetAudience.map((item) => mirrorAuthoredText(item, key)),
  };
}

/** ISO (stored, UTC) → `YYYY-MM-DDTHH:mm` in the admin's local timezone —
 *  the only format `<input type="datetime-local">` can display; feeding it
 *  the raw ISO string silently renders an empty control. The validator's
 *  `saleEndsAt` preprocess converts back to ISO on submit. */
function toDatetimeLocalValue(iso: string): string {
  const date = new Date(iso);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function courseToFormValues(
  course: Course | null,
  specialties: ResolvedSpecialty[],
  instructors: ResolvedInstructor[],
): CourseFormValues {
  if (!course) {
    return {
      slug: "",
      title: emptyLocalizedText(),
      subtitle: emptyLocalizedText(),
      description: emptyLocalizedText(),
      shortDescription: emptyLocalizedText(),
      specialtyId: specialties[0]?.id ?? "",
      categoryId: null,
      instructorId: instructors[0]?.id ?? "",
      level: "beginner",
      status: "draft",
      language: "en",
      price: 0,
      originalPrice: null,
      saleEndsAt: null,
      currency: "EGP",
      isFree: false,
      estimatedDurationMinutes: null,
      certificateAvailable: false,
      featured: false,
      requirements: [],
      learningObjectives: [],
      targetAudience: [],
      coverImageId: null,
      thumbnailId: null,
      trailerVideoId: null,
    };
  }
  return {
    slug: course.slug,
    title: course.title,
    subtitle: course.subtitle ?? emptyLocalizedText(),
    description: course.description,
    shortDescription: course.shortDescription ?? emptyLocalizedText(),
    specialtyId: course.specialtyId,
    categoryId: course.categoryId,
    instructorId: course.instructorId,
    level: course.level,
    status: course.status,
    language: course.language,
    price: Number(course.price),
    originalPrice: course.originalPrice !== null ? Number(course.originalPrice) : null,
    saleEndsAt: course.saleEndsAt ? toDatetimeLocalValue(course.saleEndsAt) : null,
    currency: course.currency,
    isFree: course.isFree,
    estimatedDurationMinutes: course.estimatedDurationMinutes,
    certificateAvailable: course.certificateAvailable,
    featured: course.featured,
    requirements: course.requirements.length > 0 ? course.requirements : [],
    learningObjectives: course.learningObjectives.length > 0 ? course.learningObjectives : [],
    targetAudience: course.targetAudience.length > 0 ? course.targetAudience : [],
    coverImageId: course.coverImageId,
    thumbnailId: course.thumbnailId,
    trailerVideoId: course.trailerVideoId,
  };
}

/**
 * The Course Editor (Step 3.3) — one reusable form for both Create and
 * Edit, reusing the exact CMS section-form infra (`SectionFormShell`,
 * `LocalizedTextField`, `ArrayFieldEditor`, `useContentDirty`,
 * `useSaveContent`, `useUnsavedChangesGuard`, and `SeoForm` itself) rather
 * than building a parallel set of form primitives — see each import's
 * home file for why they're safe to reuse across domains (all generic
 * over content shape / structurally-typed result unions).
 *
 * Concurrency, permissions, and audit logging are NOT re-implemented
 * here: `updateCourseAction` already threads `expectedUpdatedAt` through
 * to `CourseService.update`'s optimistic-concurrency check, and
 * `requireCourseManagementAccess`/`recordCourseAuditLog` run inside the
 * service regardless of which UI called it.
 *
 * Also the Instructor Panel's Create/Edit Course (Step 6.3) — the exact
 * same component, not a parallel copy. `createAction`/`updateAction`/
 * `listHref` are injected so the Instructor pages can pass
 * `createOwnCourseAction`/`updateOwnCourseAction`/`/instructor/courses`
 * instead of the Admin defaults; `showInstructorField`/`showStatusField`/
 * `showSeoSection` hide the pickers an Instructor must never touch
 * (reassigning a course, setting an arbitrary status, or the Admin-only
 * SEO section) — every other field, validation rule, and piece of
 * business logic is identical, since it's the same schema and the same
 * `<SectionFormShell>` tree either way.
 */
export function CourseEditorForm({
  mode,
  course,
  seo: initialSeo,
  specialties,
  categories,
  instructors,
  createAction = createCourseAction,
  updateAction = updateCourseAction,
  listHref = "/admin/courses",
  editHrefBase = listHref,
  editHrefTemplate,
  showInstructorField = true,
  showStatusField = true,
  showSeoSection = true,
}: {
  mode: "create" | "edit";
  course: Course | null;
  seo: SeoMeta | null;
  specialties: ResolvedSpecialty[];
  categories: ResolvedCategory[];
  instructors: ResolvedInstructor[];
  createAction?: (input: unknown) => Promise<CourseActionResult<Course>>;
  updateAction?: (id: string, input: unknown, expectedUpdatedAt?: string) => Promise<CourseActionResult<Course>>;
  listHref?: string;
  /** Where the post-create redirect's edit route lives. Defaults to
   *  `listHref`; the panels split it from `listHref` so Cancel returns to
   *  the list while a created course continues into `${base}/${id}/edit`. */
  editHrefBase?: string;
  /** Overrides `editHrefBase` with an explicit template for the
   *  post-create redirect — `{id}`/`{slug}` are replaced with the saved
   *  course's, letting the public site route to its slug-based
   *  `/courses/{slug}/edit` (a callback can't cross the Server → Client
   *  boundary; a template string can). Same mechanism as
   *  `ArticleEditorForm.editHrefTemplate`. */
  editHrefTemplate?: string;
  showInstructorField?: boolean;
  showStatusField?: boolean;
  showSeoSection?: boolean;
}) {
  const t = useTranslations("Admin.homepageEditor");
  const tc = useTranslations("Admin.courseEditor");
  const tCourses = useTranslations("Admin.courses");
  const router = useRouter();

  const [seoMetaId, setSeoMetaId] = useState(course?.seoMetaId ?? null);
  const [seo, setSeo] = useState(initialSeo);
  const [seoDirty, setSeoDirty] = useState(false);
  const [isAttachingSeo, setIsAttachingSeo] = useState(false);

  // The dirty baseline must FOLLOW saves — same constraint as
  // `ArticleEditorForm`: `useContentDirty` compares the live form to this
  // object, so a baseline frozen at first render reads "unsaved changes"
  // forever after the first save (and Cancel would revert to page-load
  // values instead of the last save).
  const [baseline, setBaseline] = useState<CourseFormValues>(() => courseToFormValues(course, specialties, instructors));

  // Mirror-then-validate: the form holds one authored text per field; the
  // other language key is filled here so `courseFormSchema` (which requires
  // both) passes and `onSubmit` receives the complete bilingual payload.
  const baseResolver = zodResolver(courseFormSchema);
  const resolver: Resolver<CourseFormValues> = (values, context, options) =>
    baseResolver(mirrorLocalizedFields(values as CourseFormValues), context, options);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CourseFormValues>({
    resolver,
    defaultValues: baseline,
  });

  const language = watch("language");
  const langKey: AuthoringKey = language === "ar" ? "ar" : "en";
  const dir = language === "ar" ? "rtl" : language === "both" ? "auto" : "ltr";

  const requirements = useFieldArray({ control, name: "requirements", keyName: "fieldId" });
  const learningObjectives = useFieldArray({ control, name: "learningObjectives", keyName: "fieldId" });
  const targetAudience = useFieldArray({ control, name: "targetAudience", keyName: "fieldId" });

  const isDirty = useContentDirty(control, baseline);
  const hasUnsavedChanges = isDirty || seoDirty;
  useUnsavedChangesGuard(hasUnsavedChanges, t("leaveConfirm"));

  const {
    submit,
    error,
    setError,
  } = useSaveContent<CourseFormValues, Course>(
    course?.updatedAt ?? new Date(0).toISOString(),
    (values, expectedUpdatedAt) => updateAction(course!.id, values, expectedUpdatedAt),
    (data) => data.updatedAt,
  );

  /** `datetime-local` value → offset ISO, converted HERE so the admin's
   *  own timezone is the reference (the server may run in UTC); empty
   *  string (a cleared input) becomes null, i.e. "no deadline". */
  function normalizeSaleEndsAt(values: CourseFormValues): CourseFormValues {
    return {
      ...values,
      saleEndsAt: values.saleEndsAt ? new Date(values.saleEndsAt).toISOString() : null,
    };
  }

  async function onSubmit(rawValues: CourseFormValues) {
    const values = normalizeSaleEndsAt(rawValues);
    if (mode === "create") {
      setError(null);
      try {
        const result = await createAction(values);
        if (!result.success) {
          setError(result.message);
          toast.error(result.code === "conflict" ? result.message : t("saveError"));
          return;
        }
        toast.success(tc("createSuccess"));
        const created = courseToFormValues(result.data, specialties, instructors);
        setBaseline(created);
        reset(created);
        const editHref = editHrefTemplate
          ? editHrefTemplate.replace("{id}", result.data.id).replace("{slug}", result.data.slug)
          : `${editHrefBase}/${result.data.id}/edit`;
        router.push(`${editHref}?created=1`);
      } catch {
        setError(t("networkError"));
        toast.error(t("networkError"));
      }
      return;
    }

    const saved = await submit(values);
    if (saved) {
      const savedValues = courseToFormValues(saved, specialties, instructors);
      setBaseline(savedValues);
      reset(savedValues);
    }
  }

  /** Without this, a failed client-side validation looks like the Save
   *  button doing nothing — `handleSubmit` never calls `onSubmit`, and
   *  the failing field may be scrolled out of view (same guard the
   *  article editor has). */
  function onInvalid() {
    setError(tc("validationError"));
    toast.error(tc("validationError"));
  }

  async function handleAddSeo() {
    if (!course) return;
    setIsAttachingSeo(true);
    try {
      const result = await attachSeoMetaAction(course.id);
      if (!result.success || !result.data.seoMetaId) {
        toast.error(result.success ? tc("seoAttachError") : result.message);
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
    { value: "", label: tc("fields.categoryNone") },
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
            router.push(listHref);
          } else {
            reset(baseline);
          }
        }}
      >
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* Main authoring column. */}
          <div className="space-y-6">
            <EditorSectionCard icon={Type} title={tc("sections.basicInfo.title")}>
              <AuthoredTextField
                id="course-title"
                label={tc("fields.title")}
                name="title"
                langKey={langKey}
                dir={dir}
                register={register}
                errors={errors}
                inputClassName="h-11 text-lg font-medium"
              />
              <AuthoredTextField
                id="course-subtitle"
                label={tc("fields.subtitle")}
                name="subtitle"
                langKey={langKey}
                dir={dir}
                register={register}
                errors={errors}
              />
              <AuthoredTextField
                id="course-short-description"
                label={tc("fields.shortDescription")}
                name="shortDescription"
                langKey={langKey}
                dir={dir}
                register={register}
                errors={errors}
                multiline
                rows={2}
              />
              <AuthoredTextField
                id="course-description"
                label={tc("fields.description")}
                name="description"
                langKey={langKey}
                dir={dir}
                register={register}
                errors={errors}
                multiline
                rows={6}
              />
            </EditorSectionCard>

            <EditorSectionCard icon={ListChecks} title={tc("sections.content.title")}>
              <ArrayFieldEditor
                label={tc("fields.requirements")}
                fields={requirements.fields}
                onAdd={() => requirements.append(emptyLocalizedText())}
                onRemove={requirements.remove}
                onMoveUp={(index) => requirements.move(index, index - 1)}
                onMoveDown={(index) => requirements.move(index, index + 1)}
                addLabel={t("addItem")}
                removeLabel={t("removeItem")}
                moveUpLabel={t("moveItemUp")}
                moveDownLabel={t("moveItemDown")}
                emptyLabel={t("noItems")}
                renderItem={(field, index) => (
                  <AuthoredTextField
                    id={`requirement-${index}`}
                    label={tc("fields.requirementItem")}
                    name={`requirements.${index}`}
                    langKey={langKey}
                    dir={dir}
                    register={register}
                    errors={errors}
                  />
                )}
              />
              <ArrayFieldEditor
                label={tc("fields.learningObjectives")}
                fields={learningObjectives.fields}
                onAdd={() => learningObjectives.append(emptyLocalizedText())}
                onRemove={learningObjectives.remove}
                onMoveUp={(index) => learningObjectives.move(index, index - 1)}
                onMoveDown={(index) => learningObjectives.move(index, index + 1)}
                addLabel={t("addItem")}
                removeLabel={t("removeItem")}
                moveUpLabel={t("moveItemUp")}
                moveDownLabel={t("moveItemDown")}
                emptyLabel={t("noItems")}
                renderItem={(field, index) => (
                  <AuthoredTextField
                    id={`objective-${index}`}
                    label={tc("fields.learningObjectiveItem")}
                    name={`learningObjectives.${index}`}
                    langKey={langKey}
                    dir={dir}
                    register={register}
                    errors={errors}
                  />
                )}
              />
              <ArrayFieldEditor
                label={tc("fields.targetAudience")}
                fields={targetAudience.fields}
                onAdd={() => targetAudience.append(emptyLocalizedText())}
                onRemove={targetAudience.remove}
                onMoveUp={(index) => targetAudience.move(index, index - 1)}
                onMoveDown={(index) => targetAudience.move(index, index + 1)}
                addLabel={t("addItem")}
                removeLabel={t("removeItem")}
                moveUpLabel={t("moveItemUp")}
                moveDownLabel={t("moveItemDown")}
                emptyLabel={t("noItems")}
                renderItem={(field, index) => (
                  <AuthoredTextField
                    id={`audience-${index}`}
                    label={tc("fields.targetAudienceItem")}
                    name={`targetAudience.${index}`}
                    langKey={langKey}
                    dir={dir}
                    register={register}
                    errors={errors}
                  />
                )}
              />
            </EditorSectionCard>
          </div>

          {/* Settings rail. */}
          <div className="space-y-6">
            <EditorSectionCard icon={Settings2} title={tc("sections.settings.title")}>
              {mode === "create" && showStatusField && (
                <SelectField
                  id="course-status"
                  label={tc("fields.status")}
                  name="status"
                  control={control}
                  options={COURSE_STATUSES.map((status) => ({
                    value: status,
                    label: tCourses(`status.${status === "in_review" ? "inReview" : status}`),
                  }))}
                />
              )}
              {mode === "edit" && course && (
                <div className="space-y-1.5">
                  <Label>{tc("fields.status")}</Label>
                  <div>
                    <StatusBadge status={course.status}>
                      {tCourses(`status.${course.status === "in_review" ? "inReview" : course.status}`)}
                    </StatusBadge>
                  </div>
                  <p className="text-xs text-muted-foreground">{tc("fields.statusHint")}</p>
                </div>
              )}
              <SelectField
                id="course-language"
                label={tc("fields.language")}
                name="language"
                control={control}
                options={COURSE_LANGUAGES.map((language) => ({
                  value: language,
                  label: tCourses(`language.${language}`),
                }))}
              />
              <SelectField
                id="course-level"
                label={tc("fields.difficulty")}
                name="level"
                control={control}
                options={COURSE_LEVELS.map((level) => ({ value: level, label: tc(`difficulty.${level}`) }))}
              />
              <SelectField
                id="course-specialty"
                label={tc("fields.specialty")}
                name="specialtyId"
                control={control}
                options={specialties.map((specialty) => ({ value: specialty.id, label: specialty.name }))}
                placeholder={tc("fields.specialtyPlaceholder")}
              />
              <SelectField
                id="course-category"
                label={tc("fields.category")}
                name="categoryId"
                control={control}
                options={categoryOptions}
                nullable
              />
              {showInstructorField && (
                <SelectField
                  id="course-instructor"
                  label={tc("fields.instructor")}
                  name="instructorId"
                  control={control}
                  options={instructors.map((instructor) => ({ value: instructor.id, label: instructor.name }))}
                  placeholder={tc("fields.instructorPlaceholder")}
                />
              )}
              <CheckboxField
                id="course-featured"
                label={tc("fields.featured")}
                name="featured"
                control={control}
                hint={tc("fields.featuredHint")}
              />
            </EditorSectionCard>

            <EditorSectionCard icon={CircleDollarSign} title={tc("sections.pricing.title")}>
              {/* step=1 so the spinner arrows move by whole units (EGP/USD
                  are priced in whole numbers here); typing a decimal still
                  works — the schema allows it, this only sets the arrow
                  increment. */}
              <NumberField id="course-price" label={tc("fields.price")} name="price" register={register} errors={errors} step="1" />
              <NumberField
                id="course-original-price"
                label={tc("fields.originalPrice")}
                name="originalPrice"
                register={register}
                errors={errors}
                step="1"
                emptyValue={null}
              />
              <SelectField
                id="course-currency"
                label={tc("fields.currency")}
                name="currency"
                control={control}
                options={COURSE_CURRENCIES.map((currency) => ({ value: currency, label: currency }))}
              />
              <PlainTextField id="course-sale-ends-at" label={tc("fields.saleEndsAt")} name="saleEndsAt" register={register} errors={errors} hint={tc("fields.saleEndsAtHint")} type="datetime-local" />
              <CheckboxField id="course-is-free" label={tc("fields.isFree")} name="isFree" control={control} />
            </EditorSectionCard>

            <EditorSectionCard icon={Clock3} title={tc("sections.details.title")}>
              <NumberField
                id="course-duration"
                label={tc("fields.estimatedDuration")}
                name="estimatedDurationMinutes"
                register={register}
                errors={errors}
                step="1"
                emptyValue={null}
                hint={tc("fields.estimatedDurationHint")}
              />
              <CheckboxField
                id="course-certificate"
                label={tc("fields.certificateAvailable")}
                name="certificateAvailable"
                control={control}
              />
            </EditorSectionCard>

            <EditorSectionCard icon={ImageIcon} title={tc("sections.media.title")}>
              <MediaPickerField
                label={tc("fields.coverImageId")}
                name="coverImageId"
                control={control}
                hint={tc("fields.mediaHint")}
                accept={["image"]}
              />
              <MediaPickerField
                label={tc("fields.thumbnailId")}
                name="thumbnailId"
                control={control}
                hint={tc("fields.mediaHint")}
                accept={["image"]}
              />
              <MediaPickerField
                label={tc("fields.trailerVideoId")}
                name="trailerVideoId"
                control={control}
                hint={tc("fields.mediaHint")}
                accept={["video"]}
              />
            </EditorSectionCard>
          </div>
        </div>
      </SectionFormShell>

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
              <p className="text-sm text-muted-foreground">{tc("seoNotSetUp")}</p>
              <Button type="button" variant="outline" size="sm" onClick={handleAddSeo} disabled={isAttachingSeo}>
                {isAttachingSeo ? tc("seoAttaching") : tc("addSeo")}
              </Button>
            </div>
          )}
        </div>
      )}

      {mode === "create" && (
        <p className="text-sm text-muted-foreground">
          {showSeoSection && `${tc("seoAfterCreate")} `}
          <Link href={listHref} className="underline underline-offset-2">
            {tc("backToList")}
          </Link>
        </p>
      )}
    </div>
  );
}
