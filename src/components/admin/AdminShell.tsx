import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { ADMIN_NAV_ITEMS } from "@/components/admin/admin-nav";
import { AdminChrome } from "@/components/admin/AdminChrome";
import type { ResolvedAdminNavItem } from "@/components/admin/admin-shell.types";
import type { AuthUser } from "@/auth/types/session";

/**
 * The Admin Panel shell — sidebar, header, breadcrumb, content area.
 * Resolves nav labels and filters super-admin-only items (Users, Site
 * Settings — docs/roles-and-permissions.md §6) once, server-side, so
 * `Sidebar`/`Breadcrumb` don't each re-resolve translations or re-check
 * roles. The actual security boundary for those pages is still their own
 * page-level guard (`requireRole`) — this filtering is presentation only,
 * per `PermissionGuard`'s own doc comment.
 */
export async function AdminShell({ user, children }: { user: AuthUser; children: ReactNode }) {
  const t = await getTranslations("Admin.nav");
  const tGroups = await getTranslations("Admin.nav.groups");

  const navItems: ResolvedAdminNavItem[] = ADMIN_NAV_ITEMS.filter(
    (item) => !item.superAdminOnly || user.role === "super_admin",
  ).map((item) => ({
    id: item.id,
    href: item.href,
    label: t(`${item.id}.label`),
    group: item.group,
    groupLabel: tGroups(item.group),
    comingSoon: item.comingSoon ?? false,
  }));

  return (
    <AdminChrome user={user} navItems={navItems}>
      {children}
    </AdminChrome>
  );
}
