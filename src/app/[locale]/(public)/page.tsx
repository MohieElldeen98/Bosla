import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { HeroSection } from "@/components/home/hero-section";
import { ProblemSection } from "@/components/home/problem-section";
import { BoslaExistsSection } from "@/components/home/bosla-exists-section";
import { SpecializationSection } from "@/components/home/specialization-section";
import { LearningJourneySection } from "@/components/home/learning-journey-section";
import { VisionSection } from "@/components/home/vision-section";
import { FinaleSection } from "@/components/home/finale-section";
import { FinalCtaSection } from "@/components/home/final-cta-section";
import type { Locale } from "@/i18n/routing";

// The story-driven rewrite (Confusion → Direction → Specialization →
// Confidence → Vision → Action) — the pre-rewrite homepage is preserved
// at archive/landing-page-v1/ if any of its sections need revisiting.
// Finale sits right before the Final CTA on purpose: it's the story's
// actual closing scene, not a mid-page moment — it used to live inside
// Specialization, which buried the emotional climax in the middle of
// the page instead of at the end.

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return { title: t("title"), description: t("description") };
}

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const typedLocale = locale as Locale;

  return (
    <>
      <HeroSection locale={typedLocale} />
      <ProblemSection locale={typedLocale} />
      <BoslaExistsSection locale={typedLocale} />
      <SpecializationSection locale={typedLocale} />
      <LearningJourneySection locale={typedLocale} />
      <VisionSection locale={typedLocale} />
      <FinaleSection locale={typedLocale} />
      <FinalCtaSection locale={typedLocale} />
    </>
  );
}
