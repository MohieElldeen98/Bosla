"use client";

import type { FieldErrors, FieldValues, Path, UseFormRegister } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getFieldError } from "@/components/admin/homepage/form-utils";

/**
 * Single-language authoring input over a stored `LocalizedText` value —
 * the course editor's counterpart to the article editor's title/excerpt
 * inputs. It binds ONE input to `${name}.${langKey}` (the course's own
 * language) and lets the submit-time mirror fill the other key, replacing
 * the duplicated `LocalizedTextField` EN/AR pair for authored prose.
 */
export function AuthoredTextField<T extends FieldValues>({
  id,
  label,
  name,
  langKey,
  dir,
  register,
  errors,
  multiline,
  rows,
  hint,
  inputClassName,
}: {
  id: string;
  label: string;
  name: string;
  langKey: "en" | "ar";
  dir: "ltr" | "rtl" | "auto";
  register: UseFormRegister<T>;
  errors?: FieldErrors<T>;
  multiline?: boolean;
  rows?: number;
  hint?: string;
  inputClassName?: string;
}) {
  const Field = multiline ? Textarea : Input;
  const error = errors ? getFieldError(errors, `${name}.${langKey}`) : undefined;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Field
        id={id}
        dir={dir}
        rows={multiline ? rows : undefined}
        className={inputClassName}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        {...register(`${name}.${langKey}` as Path<T>)}
      />
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
