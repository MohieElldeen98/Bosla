"use client";

import type { FieldErrors, FieldValues, Path, UseFormRegister } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { getFieldError } from "@/components/admin/homepage/form-utils";

/** The numeric counterpart to `PlainTextField` — `setValueAs` maps a
 *  blank input to `undefined`/`null` rather than RHF's default
 *  `valueAsNumber` behavior, which turns an empty field into `NaN` (a
 *  confusing "Expected number, received nan" error on a field the admin
 *  just hasn't filled in, or intentionally cleared). Passing `null` as
 *  `emptyValue` lets an already-set optional field (Original Price,
 *  Estimated Duration) be explicitly cleared through the full-form save —
 *  see `course.validator.ts`'s `courseBaseFields` doc comment. */
export function NumberField<T extends FieldValues>({
  id,
  label,
  name,
  register,
  errors,
  hint,
  step,
  emptyValue = undefined,
}: {
  id: string;
  label: string;
  name: string;
  register: UseFormRegister<T>;
  errors?: FieldErrors<T>;
  hint?: string;
  step?: string;
  emptyValue?: null | undefined;
}) {
  const error = errors ? getFieldError(errors, name) : undefined;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        step={step ?? "any"}
        dir="ltr"
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        {...register(name as Path<T>, {
          setValueAs: (value: string) => (value === "" ? emptyValue : Number(value)),
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
