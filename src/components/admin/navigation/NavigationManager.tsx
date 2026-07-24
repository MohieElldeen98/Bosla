"use client";

import { ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import { Tabs, TabsList, TabsTab, TabsPanel } from "@/components/ui/tabs";
import { Link } from "@/i18n/navigation";
import { NavigationLocationManager } from "@/components/admin/navigation/NavigationLocationManager";
import { FooterSettingsForm } from "@/components/admin/navigation/FooterSettingsForm";
import type { CmsNavigationItem } from "@/cms/types/navigation";
import type { FooterSettings } from "@/cms/types/site-settings";

/**
 * `/admin/navigation` — one editor for the Header links, the three Footer
 * link columns, and the Footer's non-link settings (tagline, social
 * links, newsletter copy). Contact info and copyright are deliberately
 * NOT here — they're the `contact` site setting, already fully editable
 * at `/admin/settings`, and duplicating that form here would create a
 * second place to edit the same data; a link out is enough.
 */
export function NavigationManager({
  headerItems,
  footerProductItems,
  footerCompanyItems,
  footerResourcesItems,
  footerSettings,
}: {
  headerItems: CmsNavigationItem[];
  footerProductItems: CmsNavigationItem[];
  footerCompanyItems: CmsNavigationItem[];
  footerResourcesItems: CmsNavigationItem[];
  footerSettings: FooterSettings | null;
}) {
  const t = useTranslations("Admin.navigation");

  return (
    <Tabs defaultValue="header">
      <TabsList>
        <TabsTab value="header">{t("tabs.header")}</TabsTab>
        <TabsTab value="footerLinks">{t("tabs.footerLinks")}</TabsTab>
        <TabsTab value="footerSettings">{t("tabs.footerSettings")}</TabsTab>
      </TabsList>

      <TabsPanel value="header">
        <NavigationLocationManager location="header" items={headerItems} />
      </TabsPanel>

      <TabsPanel value="footerLinks">
        <div className="space-y-8">
          <div>
            <h2 className="mb-3 text-sm font-semibold text-foreground">{t("footerColumns.product")}</h2>
            <NavigationLocationManager location="footer_product" items={footerProductItems} />
          </div>
          <div>
            <h2 className="mb-3 text-sm font-semibold text-foreground">{t("footerColumns.company")}</h2>
            <NavigationLocationManager location="footer_company" items={footerCompanyItems} />
          </div>
          <div>
            <h2 className="mb-3 text-sm font-semibold text-foreground">{t("footerColumns.resources")}</h2>
            <NavigationLocationManager location="footer_resources" items={footerResourcesItems} />
          </div>
        </div>
      </TabsPanel>

      <TabsPanel value="footerSettings">
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-3">
            <p className="text-sm text-muted-foreground">{t("contactHint")}</p>
            <Link
              href="/admin/settings"
              className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              {t("goToContactSettings")}
              <ExternalLink aria-hidden="true" className="size-3.5" />
            </Link>
          </div>
          <FooterSettingsForm initialValue={footerSettings} />
        </div>
      </TabsPanel>
    </Tabs>
  );
}
