import { getTranslations } from "next-intl/server";
import { VisionStage } from "@/components/home/vision-stage";
import type { Locale } from "@/i18n/routing";

/**
 * Task 6: short, powerful, minimal — two lines, nothing else. No
 * compass mark here (used enough already), no supporting paragraph.
 * The two-line rhythm (muted setup, huge payoff) deliberately mirrors
 * the Hero's own — the page closing on the same visual grammar it
 * opened with.
 */
export async function VisionSection({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "Vision" });

  return <VisionStage line1={t("line1")} line2={t("line2")} />;
}
