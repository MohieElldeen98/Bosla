import { getTranslations } from "next-intl/server";
import { requireRole } from "@/auth/guards/require-role";
import { PageTitle } from "@/components/admin/PageTitle";
import { ContactSettingsForm } from "@/components/admin/settings/ContactSettingsForm";
import { CmsSiteSettingsService } from "@/cms/services/site-settings.service";
import type { Locale } from "@/i18n/routing";

/** `/admin/settings` — Global Site Settings (docs/legal-content-platform.md
 *  §Global Site Settings): the `contact` key, editable here, is what the
 *  Footer, `/contact`, and the three legal documents' `{{token}}`
 *  placeholders all read from — one save propagates everywhere with no
 *  code change. Super-Admin-only within the Admin Panel, same as
 *  `/admin/users` — sitewide legal/contact info is sensitive enough to
 *  restrict beyond plain Admin. */
export default async function AdminSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireRole(locale as Locale, ["super_admin"]);

  const [t, contact] = await Promise.all([
    getTranslations("Admin.nav.settings"),
    CmsSiteSettingsService.get("contact"),
  ]);

  return (
    <div className="space-y-6">
      <PageTitle title={t("label")} description={t("description")} />
      <ContactSettingsForm initialValue={contact} />
    </div>
  );
}
