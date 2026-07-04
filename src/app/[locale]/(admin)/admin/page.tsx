import { getTranslations } from "next-intl/server";
import { BookOpen, GraduationCap, Receipt, Users } from "lucide-react";
import { PageTitle } from "@/components/admin/PageTitle";
import { StatCard } from "@/components/admin/StatCard";
import { SectionCard } from "@/components/admin/SectionCard";
import { ADMIN_NAV_ITEMS } from "@/components/admin/admin-nav";
import { SessionService } from "@/auth/services/session.service";
import { CourseService } from "@/courses/services/course.service";
import { OrderService } from "@/commerce/services/order.service";
import { ProfileService } from "@/auth/services/profile.service";
import { InstructorApplicationService } from "@/instructor/services/instructor-application.service";
import type { Locale } from "@/i18n/routing";

/**
 * The Admin Dashboard's stat row — previously four literal `"—"`
 * placeholders (Homepage Sections/Navigation Links/Media Assets/CMS
 * Pages counts that were never wired up) sitting on the very first
 * screen an admin sees. Replaced with real counts from services that
 * already exist (`CourseService`/`OrderService`/`ProfileService`/
 * `InstructorApplicationService` — no new backend code), chosen to be
 * *actionable* rather than just informational: "Pending Applications"
 * links straight to the one queue an admin actually needs to clear.
 */
export default async function AdminDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [t, tNav, user] = await Promise.all([
    getTranslations("Admin.dashboard"),
    getTranslations("Admin.nav"),
    SessionService.getCurrentUser(),
  ]);

  const [courses, pendingApplications, paidOrders, users] = await Promise.all([
    CourseService.searchResolved({ pageSize: 1 }, locale as Locale),
    InstructorApplicationService.searchResolved({ status: "pending", pageSize: 1 }, locale as Locale),
    OrderService.searchResolved({ status: "paid", pageSize: 1 }, locale as Locale),
    user?.role === "super_admin" ? ProfileService.searchPaginated({ pageSize: 1 }) : Promise.resolve(null),
  ]);

  const quickLinks = ADMIN_NAV_ITEMS.filter(
    (item) => item.id !== "dashboard" && (!item.superAdminOnly || user?.role === "super_admin"),
  );

  return (
    <>
      <PageTitle title={t("welcomeTitle")} description={t("welcomeDescription")} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("stats.courses")} value={String(courses.total)} icon={BookOpen} />
        <StatCard
          label={t("stats.pendingApplications")}
          value={String(pendingApplications.total)}
          icon={GraduationCap}
          hint={pendingApplications.total > 0 ? t("stats.pendingApplicationsHint") : undefined}
        />
        <StatCard label={t("stats.paidOrders")} value={String(paidOrders.total)} icon={Receipt} />
        {users && <StatCard label={t("stats.users")} value={String(users.total)} icon={Users} />}
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
              comingSoon={item.comingSoon}
              comingSoonLabel={tNav("comingSoon")}
            />
          ))}
        </div>
      </div>
    </>
  );
}
