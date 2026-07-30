"use client";

import { useId, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const descriptionId = useId();
  const currentLabel = t(`locales.${locale}`);
  // Exactly two locales (`routing.locales`), so "switch" means "toggle to
  // the other one" — a dropdown you pick from is one extra click for a
  // binary choice.
  const nextLocale = routing.locales.find((loc) => loc !== locale) ?? locale;
  // The button shows the language it switches TO, not the current one —
  // "العربية" while browsing in English signals "tap to read this in
  // Arabic", which is clearer than a button just naming the state you're
  // already in.
  const nextLabel = t(`locales.${nextLocale}`);

  function handleToggle() {
    onSelectLocale?.();
    startTransition(() => {
      router.replace(pathname, { locale: nextLocale });
    });
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        aria-label={t("label")}
        aria-describedby={descriptionId}
        disabled={isPending}
        className={className}
        onClick={handleToggle}
      >
        <Globe aria-hidden="true" className="size-4" />
        <span>{nextLabel}</span>
      </Button>
      <span id={descriptionId} className="sr-only">
        {t("srCurrentLanguage", { language: currentLabel })}
      </span>
    </>
  );
}
