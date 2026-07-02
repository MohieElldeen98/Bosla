import { getTranslations } from "next-intl/server";
import { LayoutTemplate, Compass, Image as ImageIcon, FileStack } from "lucide-react";
import { PageTitle } from "@/components/admin/PageTitle";
import { StatCard } from "@/components/admin/StatCard";
import { SectionCard } from "@/components/admin/SectionCard";
import { ADMIN_NAV_ITEMS } from "@/components/admin/admin-nav";
import { SessionService } from "@/auth/services/session.service";

export default async function AdminDashboardPage() {
  const [t, tNav, user] = await Promise.all([
    getTranslations("Admin.dashboard"),
    getTranslations("Admin.nav"),
    SessionService.getCurrentUser(),
  ]);

  const quickLinks = ADMIN_NAV_ITEMS.filter(
    (item) => item.id !== "dashboard" && (!item.superAdminOnly || user?.role === "super_admin"),
  );

  return (
    <>
      <PageTitle title={t("welcomeTitle")} description={t("welcomeDescription")} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("stats.sections")} value="—" icon={LayoutTemplate} />
        <StatCard label={t("stats.navigation")} value="—" icon={Compass} />
        <StatCard label={t("stats.media")} value="—" icon={ImageIcon} />
        <StatCard label={t("stats.pages")} value="—" icon={FileStack} />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-foreground">{t("quickLinksTitle")}</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map((item) => (
            <SectionCard
              key={item.id}
              href={item.href}
              icon={item.icon}
              title={tNav(`${item.id}.label`)}
              description={tNav(`${item.id}.description`)}
            />
          ))}
        </div>
      </div>
    </>
  );
}
