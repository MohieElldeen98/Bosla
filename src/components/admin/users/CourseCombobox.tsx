"use client";

import { Combobox, ComboboxContent, ComboboxIcon, ComboboxInput, ComboboxInputGroup, ComboboxItem } from "@/components/ui/combobox";

interface CourseOption {
  value: string;
  label: string;
}

/**
 * The lightweight searchable Course selector the Enrollments tab's Grant
 * form needs (Phase 7) — no Course selector UI existed before this
 * (`CreateEnrollmentForm`'s plain `SelectField` isn't searchable). Reuses
 * `CourseService.searchResolved`'s already-fetched option list (the same
 * up-to-100-courses list `/admin/enrollments/new` already loads) — no new
 * query, no new Course Management surface, just a searchable presentation
 * over data that already exists. Base-UI's `Combobox` does the filtering
 * itself from the `items` prop; this component only translates between
 * "selected course id" (what the caller wants) and the `{value,label}`
 * object shape `Combobox` needs.
 */
export function CourseCombobox({
  options,
  value,
  onValueChange,
  placeholder,
  disabled,
}: {
  options: CourseOption[];
  value: string | null;
  onValueChange: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const selected = options.find((option) => option.value === value) ?? null;

  return (
    <Combobox
      items={options}
      value={selected}
      onValueChange={(next) => onValueChange(next ? next.value : null)}
      itemToStringLabel={(option: CourseOption) => option.label}
      isItemEqualToValue={(a: CourseOption, b: CourseOption) => a.value === b.value}
      disabled={disabled}
    >
      <ComboboxInputGroup>
        <ComboboxInput placeholder={placeholder} />
        <ComboboxIcon />
      </ComboboxInputGroup>
      <ComboboxContent>
        {(option: CourseOption) => (
          <ComboboxItem key={option.value} value={option}>
            {option.label}
          </ComboboxItem>
        )}
      </ComboboxContent>
    </Combobox>
  );
}
