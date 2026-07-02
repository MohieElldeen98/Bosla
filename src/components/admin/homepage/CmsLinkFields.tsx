"use client";

import type { FieldErrors, FieldValues, UseFormRegister } from "react-hook-form";
import { LocalizedTextField } from "@/components/admin/homepage/LocalizedTextField";
import { PlainTextField } from "@/components/admin/homepage/PlainTextField";

/** Edits a `CmsLink` (`{label: LocalizedText, href: string}`) — every
 *  button field (Hero primary/secondary, CTA primary/secondary) shares
 *  this shape and this editor. */
export function CmsLinkFields<T extends FieldValues>({
  legend,
  name,
  register,
  errors,
  labelText,
  hrefLabel,
}: {
  legend: string;
  name: string;
  register: UseFormRegister<T>;
  errors?: FieldErrors<T>;
  labelText: string;
  hrefLabel: string;
}) {
  return (
    <fieldset className="space-y-3 rounded-lg border border-border p-3">
      <legend className="px-1 text-xs font-semibold text-muted-foreground">{legend}</legend>
      <LocalizedTextField
        id={`${name}-label`}
        label={labelText}
        name={`${name}.label`}
        register={register}
        errors={errors}
      />
      <PlainTextField
        id={`${name}-href`}
        label={hrefLabel}
        name={`${name}.href`}
        register={register}
        errors={errors}
        placeholder="/#courses"
      />
    </fieldset>
  );
}
