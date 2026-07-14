"use client";

import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/admin/blog/RichTextEditor";

/**
 * Bilingual `{en, ar}` rich-text field — `LocalizedTextField`'s
 * counterpart for HTML bodies, one Tiptap editor per locale (each in its
 * own writing direction), stacked rather than side by side since a
 * full-width writing surface matters more than the side-by-side
 * comparison a one-line field gets. `Controller`-wrapped like
 * `MediaPickerField`, since Tiptap is a controlled component, not a
 * registrable input.
 */
export function LocalizedRichTextField<T extends FieldValues>({
  label,
  name,
  control,
  placeholder,
}: {
  label: string;
  name: string;
  control: Control<T>;
  placeholder: string;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>{label} (EN)</Label>
        <Controller
          name={`${name}.en` as Path<T>}
          control={control}
          render={({ field, fieldState }) => (
            <>
              <RichTextEditor
                value={(field.value as string | undefined) ?? ""}
                onChange={field.onChange}
                dir="ltr"
                placeholder={placeholder}
              />
              {fieldState.error?.message && (
                <p role="alert" className="text-xs text-destructive">
                  {fieldState.error.message}
                </p>
              )}
            </>
          )}
        />
      </div>
      <div className="space-y-1.5">
        <Label>{label} (AR)</Label>
        <Controller
          name={`${name}.ar` as Path<T>}
          control={control}
          render={({ field, fieldState }) => (
            <>
              <RichTextEditor
                value={(field.value as string | undefined) ?? ""}
                onChange={field.onChange}
                dir="rtl"
                placeholder={placeholder}
              />
              {fieldState.error?.message && (
                <p role="alert" className="text-xs text-destructive">
                  {fieldState.error.message}
                </p>
              )}
            </>
          )}
        />
      </div>
    </div>
  );
}
