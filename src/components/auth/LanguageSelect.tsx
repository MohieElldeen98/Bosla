"use client";

import { useTranslations } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { routing } from "@/i18n/routing";

interface LanguageSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  name?: string;
  disabled?: boolean;
  id?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}

/**
 * Options are the app's own supported locales (`routing.locales`) — this is
 * "Preferred content language," which maps straight onto `Profile.language`,
 * not a CMS-editable list, so it's driven by the shared i18n config rather
 * than a mock repository.
 */
export function LanguageSelect({
  value,
  onValueChange,
  placeholder,
  name,
  disabled,
  id,
  ...aria
}: LanguageSelectProps) {
  const t = useTranslations("LanguageSwitcher");
  const items = routing.locales.map((locale) => ({
    value: locale,
    label: t(`locales.${locale}`),
  }));

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
        {routing.locales.map((locale) => (
          <SelectItem key={locale} value={locale}>
            {t(`locales.${locale}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
