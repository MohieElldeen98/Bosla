"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { setSiteSettingAction } from "@/cms/actions/site-settings.actions";

/**
 * The `/admin/articles` presentation toggle for the public blog's "Most
 * popular" rail — persisted as the `blog` site setting
 * (`cms_site_settings`), which `/blog` reads per render. Optimistic
 * flip with rollback on failure; `/blog` itself picks the change up on
 * its next ISR revalidation (≤60s).
 */
export function BlogSettingsToggle({ showMostPopular }: { showMostPopular: boolean }) {
  const t = useTranslations("Admin.articles.settings");
  const router = useRouter();
  const [checked, setChecked] = useState(showMostPopular);
  const [isPending, startTransition] = useTransition();

  function handleToggle(next: boolean) {
    setChecked(next);
    startTransition(async () => {
      const result = await setSiteSettingAction("blog", { showMostPopular: next });
      if (result.success) {
        toast.success(next ? t("mostPopularShown") : t("mostPopularHidden"));
        router.refresh();
      } else {
        setChecked(!next);
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card px-4 py-3">
      <div className="flex items-center gap-2.5">
        <Star aria-hidden="true" className="size-4 text-primary" />
        <div>
          <Label htmlFor="blog-most-popular-toggle" className="cursor-pointer">
            {t("showMostPopular")}
          </Label>
          <p className="text-xs text-muted-foreground">{t("showMostPopularHint")}</p>
        </div>
      </div>
      <Switch
        id="blog-most-popular-toggle"
        checked={checked}
        onCheckedChange={handleToggle}
        disabled={isPending}
      />
    </div>
  );
}
