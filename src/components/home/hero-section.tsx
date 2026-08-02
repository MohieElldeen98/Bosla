import { getTranslations } from "next-intl/server";
import { HeroStage } from "@/components/home/hero-stage";
import type { Locale } from "@/i18n/routing";

/**
 * The story's opening beat: one emotional line, nothing else. What Bosla
 * *is* comes later (Problem → Bosla Exists) — this section's only job is
 * to make a visitor feel understood before they know anything about the
 * platform. Server Component so the translated copy never round-trips to
 * the client as JSON; `HeroStage` (Client) owns only the motion —
 * including its own typewriter, which needs the payoff line split into
 * prefix/highlight/suffix rather than pre-rendered rich text, so it can
 * reveal it character by character.
 */
export async function HeroSection({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "Hero" });

  return (
    <HeroStage
      welcome={t("welcome")}
      headlineLine1={t("headlineLine1")}
      headlineLine2Prefix={t("headlineLine2Prefix")}
      headlineLine2Highlight={t("headlineLine2Highlight")}
      headlineLine2Suffix={t("headlineLine2Suffix")}
      scrollHint={t("scrollHint")}
    />
  );
}
