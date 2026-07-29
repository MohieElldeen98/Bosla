"use client";

import { useId, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Globe, Check } from "lucide-react";
import { Popover, Button } from "@heroui/react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

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
  const [isOpen, setIsOpen] = useState(false);
  const descriptionId = useId();
  const currentLabel = t(`locales.${locale}`);

  function handleSelect(nextLocale: Locale) {
    setIsOpen(false);
    onSelectLocale?.();
    if (nextLocale === locale) return;
    startTransition(() => {
      router.replace(pathname, { locale: nextLocale });
    });
  }

  return (
    <Popover isOpen={isOpen} onOpenChange={setIsOpen}>
      <Button
        variant="ghost"
        size="sm"
        aria-label={t("label")}
        aria-describedby={descriptionId}
        isDisabled={isPending}
        className={className}
      >
        <Globe aria-hidden="true" className="size-4" />
        <span>{currentLabel}</span>
      </Button>
      <span id={descriptionId} className="sr-only">
        {t("srCurrentLanguage", { language: currentLabel })}
      </span>
      <Popover.Content>
        <Popover.Dialog className="min-w-40 p-1">
          {routing.locales.map((loc) => (
            <button
              key={loc}
              type="button"
              onClick={() => handleSelect(loc)}
              aria-current={loc === locale ? "true" : undefined}
              className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm text-foreground hover:bg-muted"
            >
              {t(`locales.${loc}`)}
              {loc === locale && <Check aria-hidden="true" className="size-4 text-accent" />}
            </button>
          ))}
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}
