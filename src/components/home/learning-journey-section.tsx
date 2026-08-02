import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { LearningJourneyStage } from "@/components/home/learning-journey-stage";
import type { Locale } from "@/i18n/routing";

const richValues = {
  highlight: (chunks: ReactNode) => <span className="text-primary">{chunks}</span>,
};

/**
 * Task 5: what Bosla actually provides — search, a learning path,
 * courses, evidence, guidelines — told as one continuous story instead
 * of five feature cards. `t.raw("beats")` first just to get the
 * count/shape; each beat still needs `t.rich` individually so its
 * <highlight> word renders, which `.raw()` alone can't parse.
 */
export async function LearningJourneySection({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "LearningJourney" });
  const rawBeats = t.raw("beats") as string[];
  const beats = rawBeats.map((_, i) => t.rich(`beats.${i}`, richValues));

  return <LearningJourneyStage beats={beats} />;
}
