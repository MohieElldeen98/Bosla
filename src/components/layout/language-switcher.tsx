"use client";

import { useId, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Globe } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function LanguageSwitcher({
  className,
  onSelectLocale,
}: {
  className?: string;
  onSelectLocale?: () => void;
}) {
  const t = useTranslations("LanguageSwitcher");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const descriptionId = useId();
  const currentLabel = t(`locales.${locale}`);

  function handleSelect(nextLocale: Locale) {
    onSelectLocale?.();
    if (nextLocale === locale) return;
    startTransition(() => {
      router.replace(pathname, { locale: nextLocale });
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            aria-label={t("label")}
            aria-describedby={descriptionId}
            disabled={isPending}
            className={className}
          />
        }
      >
        <Globe aria-hidden="true" className="size-4" />
        <span>{currentLabel}</span>
      </DropdownMenuTrigger>
      <span id={descriptionId} className="sr-only">
        {t("srCurrentLanguage", { language: currentLabel })}
      </span>
      <DropdownMenuContent align="end">
        {routing.locales.map((loc) => (
          <DropdownMenuItem
            key={loc}
            onClick={() => handleSelect(loc)}
            aria-current={loc === locale ? "true" : undefined}
            className={loc === locale ? "font-medium text-primary" : undefined}
          >
            {t(`locales.${loc}`)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
