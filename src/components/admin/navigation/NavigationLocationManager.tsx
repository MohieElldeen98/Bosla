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
import { StatusBadge } from "@/components/admin/StatusBadge";
import { LocalizedTextField } from "@/components/admin/homepage/LocalizedTextField";
import { PlainTextField } from "@/components/admin/homepage/PlainTextField";
import { NumberField } from "@/components/admin/courses/NumberField";
import { CheckboxField } from "@/components/admin/courses/CheckboxField";
import {
  createNavigationItemAction,
  deleteNavigationItemAction,
  updateNavigationItemAction,
} from "@/cms/actions/navigation.actions";
import { localizedTextSchema } from "@/cms/validators/content-blocks.validator";
import { resolveLocalizedText } from "@/cms/utils/resolve-localized";
import type { Locale } from "@/i18n/routing";
import type { CmsNavigationItem, NavigationLocation } from "@/cms/types/navigation";

const itemFormSchema = z.object({
  label: localizedTextSchema,
  href: z.string().trim().min(1),
  icon: z.string(),
  position: z.number().int().min(0),
  isEnabled: z.boolean(),
});
type ItemFormValues = z.infer<typeof itemFormSchema>;

function emptyFormValues(): ItemFormValues {
  return { label: { en: "", ar: "" }, href: "", icon: "", position: 0, isEnabled: true };
}

function itemToFormValues(item: CmsNavigationItem): ItemFormValues {
  return {
    label: item.label,
    href: item.href,
    icon: item.icon ?? "",
    position: item.position,
    isEnabled: item.isEnabled,
  };
}

function toSubmitPayload(location: NavigationLocation, values: ItemFormValues) {
  return {
    location,
    label: values.label,
    href: values.href,
    icon: values.icon.trim() ? values.icon.trim() : undefined,
    position: values.position,
    isEnabled: values.isEnabled,
  };
}

/**
 * One location's link list (Header, or one of the three footer columns) —
 * a create/edit panel above a table, same shape as `CategoriesManager`.
 * `location` is fixed per instance, not a field in the form: the parent
 * page renders one of these per `NavigationLocation`, matching how the
 * public `Navbar`/`Footer` already read one location at a time.
 */
export function NavigationLocationManager({
  location,
  items,
}: {
  location: NavigationLocation;
  items: CmsNavigationItem[];
}) {
  const t = useTranslations("Admin.navigation");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [editing, setEditing] = useState<CmsNavigationItem | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ItemFormValues>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: emptyFormValues(),
  });

  function openCreate() {
    setEditing("new");
    setError(null);
    reset(emptyFormValues());
  }

  function openEdit(item: CmsNavigationItem) {
    setEditing(item);
    setError(null);
    reset(itemToFormValues(item));
  }

  function close() {
    setEditing(null);
    setError(null);
  }

  async function onSubmit(values: ItemFormValues) {
    setError(null);
    const payload = toSubmitPayload(location, values);
    const result =
      editing === "new"
        ? await createNavigationItemAction(payload)
        : await updateNavigationItemAction((editing as CmsNavigationItem).id, payload);

    if (!result.success) {
      setError(result.message);
      toast.error(result.message);
      return;
    }
    toast.success(editing === "new" ? t("toasts.created") : t("toasts.updated"));
    close();
    router.refresh();
  }

  function handleDelete(item: CmsNavigationItem) {
    const label = resolveLocalizedText(item.label, locale);
    if (!window.confirm(t("confirm.delete", { label }))) return;
    startTransition(async () => {
      const result = await deleteNavigationItemAction(item.id);
      if (result.success) {
        toast.success(t("toasts.deleted"));
        if (editing !== "new" && editing?.id === item.id) close();
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
            {t("createLink")}
          </Button>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
          <h3 className="mb-4 text-base font-semibold text-foreground">
            {editing === "new" ? t("createLink") : t("editLink")}
          </h3>
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            {error && (
              <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
            <LocalizedTextField id={`nav-${location}-label`} label={t("fields.label")} name="label" register={register} errors={errors} />
            <PlainTextField
              id={`nav-${location}-href`}
              label={t("fields.href")}
              name="href"
              register={register}
              errors={errors}
              hint={t("fields.hrefHint")}
              placeholder="/courses"
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <PlainTextField
                id={`nav-${location}-icon`}
                label={t("fields.icon")}
                name="icon"
                register={register}
                errors={errors}
                hint={t("fields.iconHint")}
              />
              <NumberField
                id={`nav-${location}-position`}
                label={t("fields.position")}
                name="position"
                register={register}
                errors={errors}
                step="1"
              />
            </div>
            <CheckboxField id={`nav-${location}-enabled`} label={t("fields.isEnabled")} name="isEnabled" control={control} />

            <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
              <Button type="button" variant="outline" onClick={close} disabled={isSubmitting}>
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? t("saving") : editing === "new" ? t("createLink") : t("saveChanges")}
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card">
        {items.length === 0 ? (
          <div className="p-4 sm:p-6">
            <EmptyState
              title={t("emptyTitle")}
              description={t("emptyDescription")}
              action={
                <Button size="sm" onClick={openCreate}>
                  <Plus aria-hidden="true" />
                  {t("createLink")}
                </Button>
              }
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.label")}</TableHead>
                <TableHead>{t("columns.href")}</TableHead>
                <TableHead>{t("columns.position")}</TableHead>
                <TableHead>{t("columns.status")}</TableHead>
                <TableHead>
                  <span className="sr-only">{t("columns.actions")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium text-foreground">
                    {resolveLocalizedText(item.label, locale)}
                  </TableCell>
                  <TableCell dir="ltr" className="text-start text-muted-foreground">
                    {item.href}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{item.position}</TableCell>
                  <TableCell>
                    <StatusBadge status={item.isEnabled ? "active" : "archived"}>
                      {item.isEnabled ? t("enabled") : t("disabled")}
                    </StatusBadge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        disabled={isPending}
                        onClick={() => openEdit(item)}
                        aria-label={t("actions.edit")}
                      >
                        <Pencil aria-hidden="true" className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        disabled={isPending}
                        onClick={() => handleDelete(item)}
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
