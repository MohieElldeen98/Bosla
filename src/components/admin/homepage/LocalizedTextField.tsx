"use client";

import type { FieldErrors, FieldValues, Path, UseFormRegister } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getFieldError } from "@/components/admin/homepage/form-utils";

/** Bilingual `{en, ar}` text field — every CMS `LocalizedText` value is
 *  edited through this one component (en/ar side by side, each in its own
 *  writing direction) rather than each section form re-building the same
 *  pair of inputs. Generic over `T` (each section's own content type,
 *  inferred from the `register` prop) so this stays fully typed without
 *  every section form needing its own copy. */
export function LocalizedTextField<T extends FieldValues>({
  id,
  label,
  name,
  register,
  errors,
  multiline,
}: {
  id: string;
  label: string;
  name: string;
  register: UseFormRegister<T>;
  errors?: FieldErrors<T>;
  multiline?: boolean;
}) {
  const Field = multiline ? Textarea : Input;
  const enError = errors ? getFieldError(errors, `${name}.en`) : undefined;
  const arError = errors ? getFieldError(errors, `${name}.ar`) : undefined;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor={`${id}-en`}>{label} (EN)</Label>
        <Field
          id={`${id}-en`}
          dir="ltr"
          aria-invalid={!!enError}
          aria-describedby={enError ? `${id}-en-error` : undefined}
          {...register(`${name}.en` as Path<T>)}
        />
        {enError && (
          <p id={`${id}-en-error`} role="alert" className="text-xs text-destructive">
            {enError}
          </p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${id}-ar`}>{label} (AR)</Label>
        <Field
          id={`${id}-ar`}
          dir="rtl"
          aria-invalid={!!arError}
          aria-describedby={arError ? `${id}-ar-error` : undefined}
          {...register(`${name}.ar` as Path<T>)}
        />
        {arError && (
          <p id={`${id}-ar-error`} role="alert" className="text-xs text-destructive">
            {arError}
          </p>
        )}
      </div>
    </div>
  );
}
