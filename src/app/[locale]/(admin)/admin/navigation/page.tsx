import { getTranslations } from "next-intl/server";
import { PageTitle } from "@/components/admin/PageTitle";
import { NavigationManager } from "@/components/admin/navigation/NavigationManager";
import { CmsNavigationService } from "@/cms/services/navigation.service";
import { CmsSiteSettingsService } from "@/cms/services/site-settings.service";

/**
 * `/admin/navigation` — Header links, the three Footer link columns, and
 * Footer settings (tagline/social/newsletter), all in one editor over
 * the existing `cms_navigation_items` + `cms_site_settings` tables. No
 * separate `/admin/footer` page — that entry was removed from the nav
 * registry; everything footer-related lives here instead. Contact info
 * and copyright stay at `/admin/settings` (the `contact` site setting),
 * linked from the Footer Settings tab rather than duplicated here.
 */
export default async function AdminNavigationPage() {
  const [t, headerItems, footerProductItems, footerCompanyItems, footerResourcesItems, footerSettings] =
    await Promise.all([
      getTranslations("Admin.navigation"),
      CmsNavigationService.getByLocation("header"),
      CmsNavigationService.getByLocation("footer_product"),
      CmsNavigationService.getByLocation("footer_company"),
      CmsNavigationService.getByLocation("footer_resources"),
      CmsSiteSettingsService.get("footer"),
    ]);

  return (
    <div className="space-y-6">
      <PageTitle title={t("title")} description={t("description")} />
      <NavigationManager
        headerItems={headerItems}
        footerProductItems={footerProductItems}
        footerCompanyItems={footerCompanyItems}
        footerResourcesItems={footerResourcesItems}
        footerSettings={footerSettings}
      />
    </div>
  );
}
