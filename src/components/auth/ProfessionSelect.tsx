"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ResolvedProfession } from "@/types/profession";

interface ProfessionSelectProps {
  options: ResolvedProfession[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  name?: string;
  disabled?: boolean;
  id?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}

/** Options come from `ProfessionService` (server-resolved) — never hardcoded here. */
export function ProfessionSelect({
  options,
  value,
  onValueChange,
  placeholder,
  name,
  disabled,
  id,
  ...aria
}: ProfessionSelectProps) {
  const items = options.map((option) => ({ value: option.id, label: option.label }));

  return (
    <Select
      items={items}
      value={value ?? null}
      onValueChange={(next) => onValueChange(next ?? "")}
      name={name}
      disabled={disabled}
    >
      <SelectTrigger id={id} className="w-full" {...aria}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.id} value={option.id}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
