import { getTranslations } from "next-intl/server";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { CmsNavigationService } from "@/cms/services/navigation.service";
import { CmsSiteSettingsService } from "@/cms/services/site-settings.service";
import { resolveLocalizedText } from "@/cms/utils/resolve-localized";
import { resolveContactSettings } from "@/cms/utils/resolve-contact-settings";
import type { Locale } from "@/i18n/routing";
import type { ResolvedFooterSettings } from "@/cms/types/site-settings";

/**
 * The public site's chrome (Navbar + Footer) for every route in this
 * group, including the homepage (`(public)/page.tsx`) — the single
 * source for the CMS-driven nav/footer data every public page needs, so
 * it's fetched exactly once per request instead of every page (the
 * homepage used to duplicate this same 6-query fetch and a second
 * Navbar/Footer render inline; Performance Sprint 1 moved it under this
 * group specifically to eliminate that).
 *
 * Owns the skip-link (was homepage-only before) — every public page
 * benefits now, not just `/`.
 *
 * No guard here: every route in this group is reachable by guests.
 * The homepage (`page.tsx`) additionally branches its own content by
 * auth state — a signed-in visitor gets a different page body, not a
 * different route — so this layout's chrome (Navbar/Footer) stays
 * identical for both.
 */
export default async function PublicLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [productLinks, companyLinks, resourcesLinks, footerSettingsRaw, contactSettingsRaw, t] =
    await Promise.all([
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
      <a href="#main-content" className="skip-link sr-only">
        {t("skipToContent")}
      </a>
      <Navbar />
      <main id="main-content" className="flex-1">
        {children}
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
