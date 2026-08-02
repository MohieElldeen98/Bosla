import { getTranslations } from "next-intl/server";
import { BoslaExistsStage } from "@/components/home/bosla-exists-stage";
import type { Locale } from "@/i18n/routing";

/**
 * The pivot: problem to solution. Deliberately the quietest section on
 * the page — after the Problem section's scrubbed, drifting chaos, this
 * one just settles once and holds, the way the resolution line before it
 * did. Two lines, nothing else: the metaphor carries itself without a
 * footnote, and the compass icon stays out of this one specifically so
 * its appearances in Hero and Specialization keep meaning something.
 */
export async function BoslaExistsSection({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "BoslaExists" });

  return <BoslaExistsStage intro={t("intro")} headline={t("headline")} />;
}
