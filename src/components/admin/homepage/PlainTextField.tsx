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
  action,
}: {
  id: string;
  label: string;
  name: string;
  register: UseFormRegister<T>;
  errors?: FieldErrors<T>;
  hint?: string;
  placeholder?: string;
  type?: "text" | "datetime-local";
  /** Optional control (e.g. an "open link" button) rendered inline next to
   *  the label — opt-in, so every other caller's layout is unchanged. */
  action?: React.ReactNode;
}) {
  const error = errors ? getFieldError(errors, name) : undefined;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        {action}
      </div>
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
