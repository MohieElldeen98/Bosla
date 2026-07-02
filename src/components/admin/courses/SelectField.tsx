"use client";

import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/**
 * Base-UI's `Select` is a controlled `value`/`onValueChange` component, not
 * a plain `<select>` — it can't be wired with RHF's `register()` the way
 * every homepage-editor field is (see `LocalizedTextField`/`PlainTextField`
 * there). This is the Course Editor's (Step 3.3) `Controller`-based
 * equivalent for its required enum/reference dropdowns (Status, Language,
 * Difficulty, Specialty, Instructor); `clearable` fields (Category) are
 * wired inline in `CourseEditorForm` instead, since they need a sentinel
 * "none" option this generic component doesn't need to know about.
 */
/** Sentinel for a `nullable` field's "no selection" option — Base-UI's
 *  `Select.Item` can't take an empty-string `value`, so a clearable field
 *  (e.g. Category) maps this sentinel to/from `null` at the boundary; a
 *  non-nullable field never sees it. */
const NULL_VALUE = "__null__";

export function SelectField<T extends FieldValues>({
  id,
  label,
  name,
  control,
  options,
  placeholder,
  nullable,
}: {
  id: string;
  label: string;
  name: Path<T>;
  control: Control<T>;
  options: { value: string; label: string }[];
  placeholder?: string;
  /** When true, `field.value === null` is shown/selected as the first
   *  option in `options` (expected to represent "none"), and selecting it
   *  writes `null` back — not the sentinel string. */
  nullable?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <Select
            value={(field.value as string | null) ?? (nullable ? NULL_VALUE : "")}
            onValueChange={(value) => field.onChange(nullable && value === NULL_VALUE ? null : value)}
          >
            <SelectTrigger id={id} className="w-full">
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={nullable && option.value === "" ? NULL_VALUE : option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
    </div>
  );
}
