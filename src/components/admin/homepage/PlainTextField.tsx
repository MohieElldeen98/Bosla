"use client";

import type { FieldErrors, FieldValues, Path, UseFormRegister } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { getFieldError } from "@/components/admin/homepage/form-utils";

/** A single, non-localized text field (href, icon key, id reference,
 *  numeric-as-string value) — the non-bilingual counterpart to
 *  `LocalizedTextField`, sharing the same label/error layout. */
export function PlainTextField<T extends FieldValues>({
  id,
  label,
  name,
  register,
  errors,
  hint,
  placeholder,
  type = "text",
}: {
  id: string;
  label: string;
  name: string;
  register: UseFormRegister<T>;
  errors?: FieldErrors<T>;
  hint?: string;
  placeholder?: string;
  type?: "text" | "datetime-local";
}) {
  const error = errors ? getFieldError(errors, name) : undefined;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        dir="ltr"
        placeholder={placeholder}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        {...register(name as Path<T>)}
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
