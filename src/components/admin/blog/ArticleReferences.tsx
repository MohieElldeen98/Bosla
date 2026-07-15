"use client";

import { useFieldArray, useFormContext } from "react-hook-form";
import { useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ArticleFormValues } from "@/blog/validators/article.validator";

/**
 * The References editor rows — numbered source title + URL pairs backing
 * the article's `references` array and the body's `[n]` citation markers.
 * Reads the form through `useFormContext` (`ArticleEditorForm` provides
 * the `FormProvider`), so it takes no props.
 */
export function ArticleReferences() {
  const t = useTranslations("Admin.articleEditor.referencesEditor");
  const form = useFormContext<ArticleFormValues>();
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "references",
  });

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{t("description")}</p>
      {fields.length === 0 && (
        <div className="rounded-xl border border-dashed border-border px-4 py-5 text-center text-sm text-muted-foreground">
          {t("empty")}
        </div>
      )}
      {fields.map((field, index) => (
        <div
          key={field.id}
          className="grid gap-3 rounded-xl border border-border bg-muted/20 p-3 sm:grid-cols-[2fr_3fr_auto] sm:items-end"
        >
          <div className="space-y-1.5">
            <Label htmlFor={`references.${index}.title`}>{t("sourceTitle", { number: index + 1 })}</Label>
            <Input
              id={`references.${index}.title`}
              dir="auto"
              placeholder={t("sourceTitlePlaceholder")}
              {...form.register(`references.${index}.title`)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`references.${index}.url`}>{t("link")}</Label>
            <Input
              id={`references.${index}.url`}
              type="url"
              dir="ltr"
              placeholder="https://…"
              {...form.register(`references.${index}.url`)}
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive"
            onClick={() => remove(index)}
            aria-label={t("removeSource", { number: index + 1 })}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => append({ title: "", url: "" })}>
        <Plus className="me-2 size-4" /> {t("addReference")}
      </Button>
    </div>
  );
}
