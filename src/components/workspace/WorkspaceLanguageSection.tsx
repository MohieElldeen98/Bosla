"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { updateOwnProfileAction } from "@/auth/actions/update-own-profile.action";

/** `/me/settings`'s language selector — reuses `LanguageSwitcher`'s
 *  exact `router.replace(pathname, { locale })` mechanism for the
 *  immediate switch, and additionally persists the choice to
 *  `profile.language` (which `LanguageSwitcher` itself doesn't do) so
 *  it's available as a future default, e.g. transactional email
 *  language. */
export function WorkspaceLanguageSection() {
  const t = useTranslations("Me.settings.language");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function handleSelect(nextLocale: Locale) {
    if (nextLocale === locale) return;
    startTransition(async () => {
      await updateOwnProfileAction({ language: nextLocale }).catch(() => null);
      router.replace(pathname, { locale: nextLocale });
    });
  }

  return (
    <Card className="space-y-3 p-5">
      <h3 className="text-sm font-medium text-foreground">{t("title")}</h3>
      <div className="flex gap-2">
        {routing.locales.map((option) => (
          <button
            key={option}
            type="button"
            disabled={isPending}
            onClick={() => handleSelect(option)}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
              option === locale
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground",
            )}
          >
            {t(`locales.${option}`)}
          </button>
        ))}
      </div>
    </Card>
  );
}
