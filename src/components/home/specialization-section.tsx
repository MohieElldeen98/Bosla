import { getTranslations } from "next-intl/server";
import { SpecializationStage } from "@/components/home/specialization-stage";
import type { Locale } from "@/i18n/routing";

interface Specialty {
  name: string;
  tagline: string;
}

/**
 * The signature moment (Task 4 of the story-driven rewrite): a pinned,
 * scroll-scrubbed sequence — one specialty owns the full screen at a
 * time, emerging from depth and receding again as the visitor
 * scrolls. Ends on the last specialty; the closing scene (silence, a
 * typewriter question, the brand) is `FinaleSection`, positioned right
 * before the Final CTA instead of buried here.
 */
export async function SpecializationSection({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "Specialization" });
  const specialties = t.raw("specialties") as Specialty[];

  return <SpecializationStage introLine1={t("introLine1")} introLine2={t("introLine2")} specialties={specialties} />;
}
