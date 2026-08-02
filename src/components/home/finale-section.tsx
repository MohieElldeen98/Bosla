import { getTranslations } from "next-intl/server";
import { FinaleStage } from "@/components/home/finale-stage";
import type { Locale } from "@/i18n/routing";

/**
 * The story's actual last beat — a quiet, timeline-driven scene
 * (silence, a typewriter question, the brand) that lands right before
 * the Final CTA. This used to live inside the Specialization section,
 * which put the page's emotional climax in the middle of the page
 * instead of at the end — the site kept going with three more
 * sections after "Bosla" faded up, which read as a false ending. It
 * belongs here instead, immediately before the ask.
 */
export async function FinaleSection({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "Finale" });

  return (
    <FinaleStage
      line1={t("line1")}
      line2Prefix={t("line2Prefix")}
      line2Highlight={t("line2Highlight")}
      line2Suffix={t("line2Suffix")}
      line3={t("line3")}
      brand={t("brand")}
    />
  );
}
