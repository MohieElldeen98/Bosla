import type { Metadata } from "next";
import { draftMode } from "next/headers";
import { getTranslations } from "next-intl/server";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { PreviewBanner } from "@/components/layout/preview-banner";
import { SectionRenderer } from "@/components/sections/section-renderer";
import { HomepageService } from "@/services/homepage.service";
import { getHomeCmsPage, getHomeCmsPageDraft } from "@/repositories/homepage.repository";
import { CmsNavigationService } from "@/cms/services/navigation.service";
import { CmsSiteSettingsService } from "@/cms/services/site-settings.service";
import { resolveLocalizedText } from "@/cms/utils/resolve-localized";
import { resolveContactSettings } from "@/cms/utils/resolve-contact-settings";
import type { Locale } from "@/i18n/routing";
import type { ResolvedFooterSettings } from "@/cms/types/site-settings";

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
  const { isEnabled: isPreview } = await draftMode();
  const [page, t] = await Promise.all([
    isPreview ? getHomeCmsPageDraft(locale as Locale) : getHomeCmsPage(locale as Locale),
    getTranslations({ locale, namespace: "Metadata" }),
  ]);

  const title = page?.seo?.title ?? t("title");
  const description = page?.seo?.description ?? t("description");

  return { title, description };
}

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { isEnabled: isPreview } = await draftMode();
  const [sections, headerLinks, productLinks, companyLinks, resourcesLinks, footerSettingsRaw, contactSettingsRaw, t] =
    await Promise.all([
      isPreview
        ? HomepageService.getDraftSections(locale as Locale)
        : HomepageService.getSections(locale as Locale),
      CmsNavigationService.getResolvedByLocation("header", locale as Locale),
      CmsNavigationService.getResolvedByLocation("footer_product", locale as Locale),
      CmsNavigationService.getResolvedByLocation("footer_company", locale as Locale),
      CmsNavigationService.getResolvedByLocation("footer_resources", locale as Locale),
      CmsSiteSettingsService.get("footer"),
      CmsSiteSettingsService.get("contact"),
      getTranslations({ locale, namespace: "Common" }),
    ]);

  const footerSettings: ResolvedFooterSettings | null = footerSettingsRaw
    ? {
        tagline: resolveLocalizedText(footerSettingsRaw.tagline, locale as Locale),
        socialLinks: footerSettingsRaw.socialLinks,
        newsletterTitle: resolveLocalizedText(footerSettingsRaw.newsletterTitle, locale as Locale),
        newsletterSubtitle: resolveLocalizedText(
          footerSettingsRaw.newsletterSubtitle,
          locale as Locale,
        ),
      }
    : null;
  const contactSettings = resolveContactSettings(contactSettingsRaw, locale as Locale);

  return (
    <div className="flex min-h-screen flex-col">
      {isPreview && <PreviewBanner locale={locale as Locale} />}
      <a href="#main-content" className="skip-link sr-only">
        {t("skipToContent")}
      </a>
      <Navbar links={headerLinks} />
      <main id="main-content" className="flex-1">
        {sections.map((section) => (
          <SectionRenderer key={section.id} section={section} />
        ))}
      </main>
      <Footer
        productLinks={productLinks}
        companyLinks={companyLinks}
        resourcesLinks={resourcesLinks}
        settings={footerSettings}
        contact={contactSettings}
      />
    </div>
  );
}
