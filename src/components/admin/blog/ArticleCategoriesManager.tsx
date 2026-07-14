"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocale, useTranslations } from "next-intl";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/admin/EmptyState";
import { SectionFormShell } from "@/components/admin/homepage/SectionFormShell";
import { LocalizedTextField } from "@/components/admin/homepage/LocalizedTextField";
import { PlainTextField } from "@/components/admin/homepage/PlainTextField";
import { NumberField } from "@/components/admin/courses/NumberField";
import { CheckboxField } from "@/components/admin/courses/CheckboxField";
import {
  createArticleCategoryAction,
  deleteArticleCategoryAction,
  updateArticleCategoryAction,
} from "@/blog/actions/article-category.actions";
import { localizedTextSchema } from "@/cms/validators/content-blocks.validator";
import { slugSchema } from "@/blog/validators/shared";
import { resolveLocalizedText } from "@/cms/utils/resolve-localized";
import type { Locale } from "@/i18n/routing";
import type { ArticleCategory } from "@/blog/types/article-category";

/** Client-side resolver schema — `description`/`icon` stay blankable
 *  strings here (the form always renders the inputs) and are normalized
 *  to the server schema's optional shape in `toSubmitPayload`. */
const categoryFormSchema = z.object({
  slug: slugSchema,
  name: localizedTextSchema,
  description: z.object({ en: z.string(), ar: z.string() }),
  icon: z.string(),
  isActive: z.boolean(),
  displayOrder: z.number().int().min(0),
});
type CategoryFormValues = z.infer<typeof categoryFormSchema>;

function emptyFormValues(): CategoryFormValues {
  return {
    slug: "",
    name: { en: "", ar: "" },
    description: { en: "", ar: "" },
    icon: "",
    isActive: true,
    displayOrder: 0,
  };
}

function categoryToFormValues(category: ArticleCategory): CategoryFormValues {
  return {
    slug: category.slug,
    name: category.name,
    description: category.description ?? { en: "", ar: "" },
    icon: category.icon ?? "",
    isActive: category.isActive,
    displayOrder: category.displayOrder,
  };
}

function toSubmitPayload(values: CategoryFormValues) {
  const descriptionBlank = Object.values(values.description).every((text) => text.trim().length === 0);
  return {
    ...values,
    description: descriptionBlank ? undefined : values.description,
    icon: values.icon.trim() ? values.icon.trim() : undefined,
  };
}

/**
 * `/admin/articles/categories` — the blog taxonomy's CRUD, one page with
 * an inline create/edit form above the list (a full sub-editor route per
 * category would be overkill for a slug + bilingual name + icon key).
 * Deleting sets `articles.category_id` to `NULL` on affected articles
 * (the FK's `set null`), it never deletes articles.
 */
export function ArticleCategoriesManager({ categories }: { categories: ArticleCategory[] }) {
  const t = useTranslations("Admin.articleCategories");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [editing, setEditing] = useState<ArticleCategory | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: emptyFormValues(),
  });

  function openCreate() {
    setEditing("new");
    setError(null);
    reset(emptyFormValues());
  }

  function openEdit(category: ArticleCategory) {
    setEditing(category);
    setError(null);
    reset(categoryToFormValues(category));
  }

  function close() {
    setEditing(null);
    setError(null);
  }

  async function onSubmit(values: CategoryFormValues) {
    setError(null);
    const payload = toSubmitPayload(values);
    const result =
      editing === "new"
        ? await createArticleCategoryAction(payload)
        : await updateArticleCategoryAction((editing as ArticleCategory).id, payload);

    if (!result.success) {
      setError(result.message);
      toast.error(result.message);
      return;
    }
    toast.success(editing === "new" ? t("toasts.created") : t("toasts.updated"));
    close();
    router.refresh();
  }

  function handleDelete(category: ArticleCategory) {
    const name = resolveLocalizedText(category.name, locale);
    if (!window.confirm(t("confirm.delete", { name }))) return;
    startTransition(async () => {
      const result = await deleteArticleCategoryAction(category.id);
      if (result.success) {
        toast.success(t("toasts.deleted"));
        if (editing !== "new" && editing?.id === category.id) close();
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="space-y-4">
      {editing === null ? (
        <div className="flex justify-end">
          <Button size="sm" onClick={openCreate}>
            <Plus aria-hidden="true" />
            {t("createCategory")}
          </Button>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
          <h2 className="mb-4 text-base font-semibold text-foreground">
            {editing === "new" ? t("createCategory") : t("editCategory")}
          </h2>
          <SectionFormShell
            isDirty={false}
            isSubmitting={isSubmitting}
            error={error}
            onSubmit={handleSubmit(onSubmit)}
            onCancel={close}
          >
            <div className="space-y-4">
              <LocalizedTextField id="category-name" label={t("fields.name")} name="name" register={register} errors={errors} />
              <PlainTextField
                id="category-slug"
                label={t("fields.slug")}
                name="slug"
                register={register}
                errors={errors}
                hint={t("fields.slugHint")}
              />
              <LocalizedTextField
                id="category-description"
                label={t("fields.description")}
                name="description"
                register={register}
                errors={errors}
                multiline
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <PlainTextField
                  id="category-icon"
                  label={t("fields.icon")}
                  name="icon"
                  register={register}
                  errors={errors}
                  hint={t("fields.iconHint")}
                />
                <NumberField
                  id="category-display-order"
                  label={t("fields.displayOrder")}
                  name="displayOrder"
                  register={register}
                  errors={errors}
                  step="1"
                />
              </div>
              <CheckboxField id="category-is-active" label={t("fields.isActive")} name="isActive" control={control} />
            </div>
          </SectionFormShell>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card">
        {categories.length === 0 ? (
          <div className="p-4 sm:p-6">
            <EmptyState
              title={t("emptyTitle")}
              description={t("emptyDescription")}
              action={
                <Button size="sm" onClick={openCreate}>
                  <Plus aria-hidden="true" />
                  {t("createCategory")}
                </Button>
              }
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.name")}</TableHead>
                <TableHead>{t("columns.slug")}</TableHead>
                <TableHead>{t("columns.icon")}</TableHead>
                <TableHead>{t("columns.displayOrder")}</TableHead>
                <TableHead>{t("columns.active")}</TableHead>
                <TableHead>
                  <span className="sr-only">{t("columns.actions")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="font-medium text-foreground">
                    {resolveLocalizedText(category.name, locale)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{category.slug}</TableCell>
                  <TableCell className="text-muted-foreground">{category.icon ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{category.displayOrder}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {category.isActive ? t("active") : t("inactive")}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openEdit(category)}
                        aria-label={t("actions.edit")}
                      >
                        <Pencil aria-hidden="true" className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        disabled={isPending}
                        onClick={() => handleDelete(category)}
                        aria-label={t("actions.delete")}
                      >
                        <Trash2 aria-hidden="true" className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
