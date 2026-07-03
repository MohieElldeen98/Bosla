import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { CmsNavigationService } from "@/cms/services/navigation.service";
import { CmsSiteSettingsService } from "@/cms/services/site-settings.service";
import { resolveLocalizedText } from "@/cms/utils/resolve-localized";
import type { Locale } from "@/i18n/routing";
import type { ResolvedFooterSettings } from "@/cms/types/site-settings";

/**
 * The public site's chrome (Navbar + Footer) for every route in this
 * group — first real content is the Course Catalog/Details (Step 3.4,
 * `/courses`, `/courses/[slug]`). Reuses the *exact* CMS-driven nav/
 * footer data sources `src/app/[locale]/page.tsx` (the homepage) already
 * reads directly, rather than duplicating that composition in every new
 * page under here — the homepage itself stays un-moved (see below), it
 * just happens to assemble the same chrome inline since it predates this
 * layout having a real consumer.
 *
 * No guard: intentionally open to guests. Today's homepage stays at
 * `src/app/[locale]/page.tsx`, unmoved — moving it here is a routing
 * change with no architectural benefit on its own.
 */
export default async function PublicLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [headerLinks, productLinks, companyLinks, resourcesLinks, footerSettingsRaw] = await Promise.all([
    CmsNavigationService.getResolvedByLocation("header", locale as Locale),
    CmsNavigationService.getResolvedByLocation("footer_product", locale as Locale),
    CmsNavigationService.getResolvedByLocation("footer_company", locale as Locale),
    CmsNavigationService.getResolvedByLocation("footer_resources", locale as Locale),
    CmsSiteSettingsService.get("footer"),
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

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar links={headerLinks} />
      <main className="flex-1">{children}</main>
      <Footer
        productLinks={productLinks}
        companyLinks={companyLinks}
        resourcesLinks={resourcesLinks}
        settings={footerSettings}
      />
    </div>
  );
}
