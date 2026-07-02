"use client";

import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

/** The `Controller`-wired counterpart to a plain `register()` checkbox —
 *  Base-UI's `Checkbox` is `checked`/`onCheckedChange` controlled, same
 *  reasoning as `SelectField`. */
export function CheckboxField<T extends FieldValues>({
  id,
  label,
  name,
  control,
  hint,
}: {
  id: string;
  label: string;
  name: Path<T>;
  control: Control<T>;
  hint?: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <Checkbox
            id={id}
            checked={!!field.value}
            onCheckedChange={field.onChange}
            className="mt-0.5"
          />
        )}
      />
      <div className="space-y-0.5">
        <Label htmlFor={id} className="font-normal">
          {label}
        </Label>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}
