import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { HeroSection } from "@/components/home/hero-section";
import { WhyBoslaSection } from "@/components/home/why-bosla-section";
import { CoursesSection } from "@/components/home/courses-section";
import { FaqSection } from "@/components/home/faq-section";
import { ContactCtaSection } from "@/components/home/contact-cta-section";
import type { Locale } from "@/i18n/routing";

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
      <WhyBoslaSection locale={typedLocale} />
      <CoursesSection locale={typedLocale} />
      <FaqSection locale={typedLocale} />
      <ContactCtaSection locale={typedLocale} />
    </>
  );
}
