import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { BookOpen, Award, UserCircle, Users, Wallet, Receipt } from "lucide-react";
import { ProfileService } from "@/auth/services/profile.service";
import { resolveDisplayName } from "@/auth/utils/display-name";
import { LoggedInHero } from "@/components/home/logged-in/logged-in-hero";
import { QuickLinksRow, type QuickLink } from "@/components/home/logged-in/quick-links-row";
import { StudentNorthStar } from "@/components/home/logged-in/student-north-star";
import { InstructorNorthStar } from "@/components/home/logged-in/instructor-north-star";
import { AdminNorthStar } from "@/components/home/logged-in/admin-north-star";
import type { AuthUser } from "@/auth/types/session";
import type { Locale } from "@/i18n/routing";

async function resolveRoleContent(
  user: AuthUser,
  locale: Locale,
): Promise<{ northStar: ReactNode; quickLinks: QuickLink[] }> {
  const t = await getTranslations({ locale, namespace: "LoggedInHome.quickLinks" });

  switch (user.role) {
    case "instructor":
      return {
        northStar: <InstructorNorthStar user={user} locale={locale} />,
        quickLinks: [
          { href: "/instructor/courses", label: t("instructorCourses"), description: t("instructorCoursesDescription"), icon: BookOpen },
          { href: "/instructor/students", label: t("instructorStudents"), description: t("instructorStudentsDescription"), icon: Users },
          { href: "/instructor/earnings", label: t("instructorEarnings"), description: t("instructorEarningsDescription"), icon: Wallet },
        ],
      };
    case "admin":
    case "super_admin":
      return {
        northStar: <AdminNorthStar locale={locale} />,
        quickLinks: [
          { href: "/admin/courses", label: t("adminCourses"), description: t("adminCoursesDescription"), icon: BookOpen },
          { href: "/admin/users", label: t("adminUsers"), description: t("adminUsersDescription"), icon: Users },
          { href: "/admin/orders", label: t("adminOrders"), description: t("adminOrdersDescription"), icon: Receipt },
        ],
      };
    case "student":
    default:
      return {
        northStar: <StudentNorthStar locale={locale} />,
        quickLinks: [
          { href: "/me/courses", label: t("studentCourses"), description: t("studentCoursesDescription"), icon: BookOpen },
          { href: "/me/certificates", label: t("studentCertificates"), description: t("studentCertificatesDescription"), icon: Award },
          { href: "/me/profile", label: t("studentProfile"), description: t("studentProfileDescription"), icon: UserCircle },
        ],
      };
  }
}

/**
 * `/` for a signed-in visitor: a personalized welcome hub, not a
 * duplicate of `/me`/`/instructor`/`/admin` — see
 * docs/superpowers/specs/2026-08-05-logged-in-homepage-design.md.
 */
export async function LoggedInHome({ user, locale }: { user: AuthUser; locale: Locale }) {
  const [t, profile, { northStar, quickLinks }] = await Promise.all([
    getTranslations({ locale, namespace: "LoggedInHome.hero" }),
    ProfileService.getByUserId(user.id),
    resolveRoleContent(user, locale),
  ]);

  const displayName = resolveDisplayName(profile, user);

  return (
    <>
      <LoggedInHero greeting={t("greeting", { name: displayName })}>{northStar}</LoggedInHero>
      <QuickLinksRow links={quickLinks} />
    </>
  );
}
