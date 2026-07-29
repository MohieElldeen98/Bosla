import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SectionRenderer } from "@/components/sections/section-renderer";
import { HomepageService } from "@/services/homepage.service";
import { getHomeCmsPage } from "@/repositories/homepage.repository";
import type { Locale } from "@/i18n/routing";

/**
 * Without this, Next statically renders the homepage once at build time
 * (no `fetch()`/dynamic API is used — the CMS is read via plain Drizzle/
 * postgres calls, which Next's static analysis can't see as "dynamic") and
 * never re-reads the CMS again. ISR re-checks the database at most once per
 * minute, so an Admin's edit (enable/disable, reorder, content change)
 * surfaces without a full redeploy — see docs/cms-overview.md §13.
 */
export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const [page, t] = await Promise.all([
    getHomeCmsPage(locale as Locale),
    getTranslations({ locale, namespace: "Metadata" }),
  ]);

  const title = page?.seo?.title ?? t("title");
  const description = page?.seo?.description ?? t("description");

  return { title, description };
}

/**
 * `/` — lives under `(public)` so it shares the group's Navbar/Footer
 * chrome (`(public)/layout.tsx`) instead of assembling its own; before
 * Performance Sprint 1 this page sat outside the group and duplicated
 * that entire 6-query CMS fetch plus a second Navbar/Footer render on
 * every load.
 */
export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const sections = await HomepageService.getSections(locale as Locale);

  return (
    <>
      {sections.map((section) => (
        <SectionRenderer key={section.id} section={section} />
      ))}
    </>
  );
}
