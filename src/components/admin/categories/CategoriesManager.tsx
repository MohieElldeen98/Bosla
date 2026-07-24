"use client";

import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocale, useTranslations } from "next-intl";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/auth/LoadingButton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/admin/EmptyState";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { SearchInput } from "@/components/admin/SearchInput";
import { LocalizedTextField } from "@/components/admin/homepage/LocalizedTextField";
import { PlainTextField } from "@/components/admin/homepage/PlainTextField";
import { NumberField } from "@/components/admin/courses/NumberField";
import { CheckboxField } from "@/components/admin/courses/CheckboxField";
import { SelectField } from "@/components/admin/courses/SelectField";
import {
  createCategoryAction,
  deleteCategoryAction,
  updateCategoryAction,
} from "@/courses/actions/category.actions";
import { localizedTextSchema } from "@/cms/validators/content-blocks.validator";
import { slugSchema } from "@/courses/validators/shared";
import { resolveLocalizedText } from "@/cms/utils/resolve-localized";
import type { Locale } from "@/i18n/routing";
import type { Category } from "@/courses/types/category";

interface SpecialtyOption {
  value: string;
  label: string;
}

/** Client-side resolver schema — `description`/`icon` stay blankable
 *  strings here (the form always renders the inputs) and are normalized
 *  to the server schema's optional shape in `toSubmitPayload`, same
 *  convention as `ArticleCategoriesManager`. */
const categoryFormSchema = z.object({
  slug: slugSchema,
  name: localizedTextSchema,
  description: z.object({ en: z.string(), ar: z.string() }),
  icon: z.string(),
  specialtyId: z.string().uuid().nullable(),
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
    specialtyId: null,
    isActive: true,
    displayOrder: 0,
  };
}

function categoryToFormValues(category: Category): CategoryFormValues {
  return {
    slug: category.slug,
    name: category.name,
    description: category.description ?? { en: "", ar: "" },
    icon: category.icon ?? "",
    specialtyId: category.specialtyId,
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

function matchesQuery(category: Category, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return (
    category.name.en.toLowerCase().includes(needle) ||
    category.name.ar.toLowerCase().includes(needle) ||
    category.slug.toLowerCase().includes(needle)
  );
}

/**
 * `/admin/categories` — the course catalog's taxonomy CRUD (drives
 * `/courses`'s category filter, docs/product-blueprint.md §3). One page
 * with an inline create/edit form above the list, same shape as
 * `ArticleCategoriesManager` (the blog's own, separate taxonomy) plus a
 * nullable Specialty picker course categories have and blog categories
 * don't. Deleting sets `courses.category_id` to `NULL` on affected
 * courses (the FK's `set null`), it never deletes courses.
 */
export function CategoriesManager({
  categories,
  specialties,
}: {
  categories: Category[];
  specialties: SpecialtyOption[];
}) {
  const t = useTranslations("Admin.categories");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [editing, setEditing] = useState<Category | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const specialtyOptions = useMemo(
    () => [{ value: "", label: t("fields.specialtyNone") }, ...specialties],
    [specialties, t],
  );
  const specialtyLabelById = useMemo(() => new Map(specialties.map((s) => [s.value, s.label])), [specialties]);

  const filteredCategories = useMemo(
    () => categories.filter((category) => matchesQuery(category, query)),
    [categories, query],
  );

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

  function openEdit(category: Category) {
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
        ? await createCategoryAction(payload)
        : await updateCategoryAction((editing as Category).id, payload);

    if (!result.success) {
      setError(result.message);
      toast.error(result.message);
      return;
    }
    toast.success(editing === "new" ? t("toasts.created") : t("toasts.updated"));
    close();
    router.refresh();
  }

  function handleDelete(category: Category) {
    const name = resolveLocalizedText(category.name, locale);
    if (!window.confirm(t("confirm.delete", { name }))) return;
    startTransition(async () => {
      const result = await deleteCategoryAction(category.id);
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput
            placeholder={t("searchPlaceholder")}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="sm:max-w-xs"
          />
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
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            {error && (
              <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
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
            <SelectField
              id="category-specialty"
              label={t("fields.specialty")}
              name="specialtyId"
              control={control}
              options={specialtyOptions}
              nullable
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

            <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
              <Button type="button" variant="outline" onClick={close} disabled={isSubmitting}>
                {t("cancel")}
              </Button>
              <LoadingButton type="submit" isLoading={isSubmitting} disabled={isSubmitting}>
                {isSubmitting ? t("saving") : editing === "new" ? t("createCategory") : t("saveChanges")}
              </LoadingButton>
            </div>
          </form>
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
        ) : filteredCategories.length === 0 ? (
          <div className="p-4 sm:p-6">
            <EmptyState
              title={t("noResultsTitle")}
              description={t("noResultsDescription")}
              action={
                <Button size="sm" variant="outline" onClick={() => setQuery("")}>
                  {t("clearSearch")}
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
                <TableHead>{t("columns.specialty")}</TableHead>
                <TableHead>{t("columns.displayOrder")}</TableHead>
                <TableHead>{t("columns.active")}</TableHead>
                <TableHead>
                  <span className="sr-only">{t("columns.actions")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCategories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="font-medium text-foreground">
                    {resolveLocalizedText(category.name, locale)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{category.slug}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {category.specialtyId ? (specialtyLabelById.get(category.specialtyId) ?? "—") : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{category.displayOrder}</TableCell>
                  <TableCell>
                    <StatusBadge status={category.isActive ? "active" : "archived"}>
                      {category.isActive ? t("active") : t("inactive")}
                    </StatusBadge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        disabled={isPending}
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
