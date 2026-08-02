import { getTranslations } from "next-intl/server";
import { FinalCtaStage } from "@/components/home/final-cta-stage";
import type { Locale } from "@/i18n/routing";

/**
 * Task 7, the last one: quiet, minimal, lots of whitespace, one
 * sentence, one CTA. Also the *only* CTA button anywhere on this page
 * — Task 1's Hero had one and it was removed for being premature; every
 * bit of persuasive weight the page built up funnels into this single
 * moment instead of being spent early and repeated.
 */
export async function FinalCtaSection({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "FinalCta" });

  return <FinalCtaStage line={t("line")} cta={t("cta")} />;
}
