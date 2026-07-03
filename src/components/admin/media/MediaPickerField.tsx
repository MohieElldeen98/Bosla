"use client";

import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { MediaPicker } from "@/components/admin/media/MediaPicker";
import type { MediaFileType } from "@/cms/types/media-library";

/**
 * The `Controller`-wrapped form-field shell around `MediaPicker` — the
 * label/hint layout every other field component in this codebase
 * (`LocalizedTextField`/`PlainTextField`/`NumberField`) already uses,
 * so a form swapping `IdReferenceField` for a real asset picker doesn't
 * have to hand-wire `Controller` itself at every call site. Generic
 * over `T` the same way `LocalizedTextField` is, so it stays fully
 * typed against whichever form schema uses it.
 */
export function MediaPickerField<T extends FieldValues>({
  label,
  name,
  control,
  hint,
  accept,
}: {
  label: string;
  name: Path<T>;
  control: Control<T>;
  hint?: string;
  accept?: MediaFileType[];
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <MediaPicker value={(field.value as string | null | undefined) ?? null} onChange={field.onChange} accept={accept} />
        )}
      />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
