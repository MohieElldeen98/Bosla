import { getTranslations } from "next-intl/server";
import { ProblemStage } from "@/components/home/problem-stage";
import type { Locale } from "@/i18n/routing";

/**
 * The second beat: recognition before solution. Four fragments of the
 * same scattered feeling — too many PDFs, too many videos, too much of
 * everything, no clear path — each drifting past at its own scroll
 * speed so the section itself *feels* like the overload it describes,
 * before settling on the one line that resolves it and hands off to
 * "Bosla Exists" (Task 3).
 */
export async function ProblemSection({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "Problem" });
  const fragments = t.raw("fragments") as string[];

  return <ProblemStage fragments={fragments} resolution={t("resolution")} />;
}
