"use client";

import type { FieldErrors, FieldValues, Path, UseFormRegister } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { getFieldError } from "@/components/admin/homepage/form-utils";

/** A nullable date field — the date-input counterpart to
 *  `PlainTextField`/`NumberField`. A blank input maps to `null`
 *  ("no expiration"), matching `NumberField`'s own `emptyValue`
 *  reasoning for an optional field that can be explicitly cleared. */
export function DateField<T extends FieldValues>({
  id,
  label,
  name,
  register,
  errors,
  hint,
}: {
  id: string;
  label: string;
  name: string;
  register: UseFormRegister<T>;
  errors?: FieldErrors<T>;
  hint?: string;
}) {
  const error = errors ? getFieldError(errors, name) : undefined;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="date"
        dir="ltr"
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        {...register(name as Path<T>, {
          setValueAs: (value: string) => (value === "" ? null : value),
        })}
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
