import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";

/**
 * Shown only while `draftMode()` is enabled (Step 6.5 Preview mode) — a
 * plain link to the exit route, not a client component, since it needs no
 * interactivity beyond navigation.
 */
export async function PreviewBanner({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "Common.previewBanner" });

  return (
    <div className="flex items-center justify-center gap-3 bg-amber-500 px-4 py-2 text-center text-sm font-medium text-amber-950">
      <span>{t("message")}</span>
      <a href={`/${locale}/admin/homepage/preview/exit`} className="underline underline-offset-2">
        {t("exitLabel")}
      </a>
    </div>
  );
}
